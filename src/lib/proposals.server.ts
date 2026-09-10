import { randomUUID } from 'crypto'

import {
  canAutoApply,
  validateDraft,
  type Proposal,
  type ProposalDraft,
  type ProposalNote,
  type ProposalStatus,
} from '@/lib/proposals'

/**
 * 결재함 (서버 전용).
 *
 * 시드 폴백이 없는 유일한 데이터다. 100문100답이나 검색어 목표와 달리 결재는
 * 손님 화면에 아무것도 그리지 않는다 — Firestore 가 없으면 화면이 비는 게 아니라
 * 결재 기능 자체가 없는 것이고, 그때는 빈 목록 대신 "왜 안 되는지" 를 말해 줘야 한다.
 * 조용히 빈 목록을 주면 매니저가 제안을 올렸는데 사라진 것처럼 보인다.
 */
export const PROPOSALS = 'proposals'

async function db() {
  const { getAdminDb } = await import('@/lib/firebase/admin')
  return getAdminDb()
}

/**
 * 문서 id.
 *
 * "시각__임의값" 으로 지으면 문서 이름 정렬이 곧 시간순이라 색인이 필요 없다.
 * wed100Versions 에서 where+orderBy 가 복합 색인을 요구해 막혔던 것과 같은 이유로,
 * 처음부터 색인이 필요 없게 짠다.
 */
const newId = () => `${new Date().toISOString()}__${randomUUID().slice(0, 8)}`

/** 최근 것부터. 결재함은 오래된 것을 뒤져 볼 일이 드물다 */
export async function listProposals(limit = 100): Promise<Proposal[]> {
  const adb = await db()
  if (!adb) return []
  const snap = await adb.collection(PROPOSALS).orderBy('__name__', 'desc').limit(limit).get()
  return snap.docs.map((d) => ({ ...(d.data() as Proposal), id: d.id }))
}

export async function createProposal(draft: ProposalDraft, by: string): Promise<Proposal> {
  const bad = validateDraft(draft)
  if (bad) throw new Error(bad)

  const adb = await db()
  if (!adb) throw new Error('Firestore 가 설정되지 않아 제안을 저장할 수 없습니다.')

  const id = newId()
  const row: Proposal = {
    id,
    createdAt: new Date().toISOString(),
    createdBy: by,
    title: draft.title.trim(),
    reason: draft.reason.trim(),
    kind: draft.kind,
    ...(draft.slug ? { slug: draft.slug } : {}),
    ...(draft.field ? { field: draft.field } : {}),
    ...(draft.configPatch ? { configPatch: draft.configPatch } : {}),
    changes: draft.changes,
    status: 'pending',
  }
  // id 는 문서 이름으로 이미 있으니 본문에서는 뺀다 — 두 곳에 두면 언젠가 어긋난다
  const { id: _drop, ...body } = row
  void _drop
  await adb.collection(PROPOSALS).doc(id).set(body)
  return row
}

/**
 * 의견 한 마디 — 결정하지 않고 말만 남긴다.
 *
 * 원장님이 "좋은데 이 낱말만" 하실 때 반려를 누르게 하면 안 된다. 반려는 제안을
 * 닫아 버려서 매니저가 처음부터 다시 올려야 하고, 그러면 오간 말이 제안 밖으로
 * 흩어진다. 상태를 건드리지 않고 밑에 쌓기만 한다.
 *
 * 매니저도 쓴다 — 원장님 물음에 답하는 자리가 있어야 한 장 안에서 이야기가 끝난다.
 * arrayUnion 을 쓰는 것은 둘이 동시에 적을 때 한쪽이 지워지지 않게 하기 위해서다
 * (읽고 붙여 다시 쓰면 사이에 들어온 말이 사라진다).
 */
export async function addNote(id: string, text: string, by: string): Promise<ProposalNote> {
  const body = text?.trim()
  if (!body) throw new Error('남길 말을 적어 주세요.')

  const adb = await db()
  if (!adb) throw new Error('Firestore 가 설정되지 않아 의견을 남길 수 없습니다.')

  const ref = adb.collection(PROPOSALS).doc(id)
  if (!(await ref.get()).exists) throw new Error('그런 제안이 없습니다.')

  const note: ProposalNote = { at: new Date().toISOString(), by, text: body }
  const { FieldValue } = await import('firebase-admin/firestore')
  await ref.set({ notes: FieldValue.arrayUnion(note) }, { merge: true })
  return note
}

/**
 * 결재.
 *
 * 승인이면 반영까지 여기서 한다. 반영이 실패해도 승인 자체는 남긴다 —
 * 원장님은 이미 승인을 눌렀는데 그 기록이 사라지면 다시 눌러야 하고,
 * 왜 안 바뀌었는지는 아무도 모르게 된다. 실패는 applyError 에 적어 화면에 띄운다.
 */
export async function decideProposal(
  id: string,
  decision: Exclude<ProposalStatus, 'pending'>,
  by: string,
  comment?: string,
): Promise<Proposal> {
  const adb = await db()
  if (!adb) throw new Error('Firestore 가 설정되지 않아 결재할 수 없습니다.')

  const ref = adb.collection(PROPOSALS).doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('그런 제안이 없습니다. 이미 지워졌을 수 있습니다.')

  const p = { ...(snap.data() as Proposal), id }
  if (p.status !== 'pending') {
    throw new Error(`이미 ${p.status === 'approved' ? '승인' : '반려'}된 제안입니다.`)
  }

  let applied = false
  let applyError: string | undefined

  if (decision === 'approved' && canAutoApply(p.kind)) {
    try {
      await applyProposal(adb, p, by)
      applied = true
    } catch (e) {
      applyError = e instanceof Error ? e.message : String(e)
    }
  }

  const at = new Date().toISOString()
  const patch: Record<string, unknown> = {
    status: decision,
    decidedAt: at,
    decidedBy: by,
    applied,
    ...(applyError ? { applyError } : {}),
  }

  /*
    결재하며 남긴 말도 의견 줄에 함께 쌓는다. 따로 두면 "원장님 말씀" 이 두 군데가
    되고, 화면에서 어느 쪽을 보여 줄지 매번 고민하게 된다.
  */
  const note = comment?.trim()
    ? ({ at, by, text: comment.trim(), decision } satisfies ProposalNote)
    : null
  if (note) {
    const { FieldValue } = await import('firebase-admin/firestore')
    patch.notes = FieldValue.arrayUnion(note)
  }

  await ref.set(patch, { merge: true })
  return {
    ...p,
    status: decision,
    decidedAt: at,
    decidedBy: by,
    applied,
    ...(applyError ? { applyError } : {}),
    notes: [...(p.notes ?? []), ...(note ? [note] : [])],
  }
}

/**
 * 승인된 것을 실제로 반영한다.
 *
 * 문항은 고치기 전에 wed100Versions 로 한 벌 떠 둔다. 결재를 거쳤어도 되돌릴
 * 일은 생기고, 그때 "누가 언제 승인해서 바뀐 것" 과 "그 직전 내용" 이 둘 다 있어야
 * 되돌릴 수 있다.
 */
async function applyProposal(
  adb: FirebaseFirestore.Firestore,
  p: Proposal,
  by: string,
): Promise<void> {
  if (p.kind === 'wed100') {
    if (!p.slug || !p.field) throw new Error('어느 문항의 어느 칸인지가 제안에 없습니다.')
    const value = p.changes[0]?.after
    if (value == null) throw new Error('바꿀 내용이 제안에 없습니다.')

    const { snapshotBefore } = await import('@/lib/wed100Versions')
    const existed = await snapshotBefore(adb, p.slug, by, [p.field])
    if (!existed) throw new Error(`Firestore 에 ${p.slug} 문항이 없습니다.`)

    /*
      답변은 문단 배열이다. 화면에서는 한 덩어리 글로 다루므로 빈 줄로 가른다 —
      저장 API(wed100/save)가 쓰는 규칙과 같아야 자막 동기화(syncCuesWithAnswer)가
      어긋나지 않는다.
    */
    const next =
      p.field === 'answer'
        ? value.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
        : value

    await adb
      .collection('wed100_questions')
      .doc(p.slug)
      .set(
        { [p.field]: next, updatedAt: new Date().toISOString(), updatedBy: by },
        { merge: true },
      )
    return
  }

  if (p.kind === 'config') {
    if (!p.configPatch || !Object.keys(p.configPatch).length) {
      throw new Error('바꿀 설정이 제안에 없습니다.')
    }
    await adb
      .collection('site_config')
      .doc('wed100')
      .set({ ...p.configPatch, updatedAt: new Date().toISOString(), updatedBy: by }, { merge: true })
    return
  }

  throw new Error(`'${p.kind}' 은 자동으로 반영할 수 없습니다.`)
}
