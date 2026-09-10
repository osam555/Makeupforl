import { randomUUID } from 'crypto'

import { type Role } from '@/lib/roles'
import {
  canAutoApply,
  typeOf,
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

/**
 * 최근 것부터. 결재함은 오래된 것을 뒤져 볼 일이 드물다.
 *
 * 여기서 두 번 틀렸다. 남겨 둔다 — 다음 사람이 같은 순서로 틀릴 것이기 때문이다.
 *
 *  1) `orderBy('__name__', 'desc')` → FAILED_PRECONDITION. Firestore 가 저절로
 *     갖고 있는 것은 문서 이름 **오름차순** 뿐이고 내림차순은 색인을 따로 요구한다.
 *  2) `orderBy('__name__').limitToLast(n)` → **같은 오류.** limitToLast 는 정렬을
 *     뒤집어 실행한 뒤 결과를 되돌리는 방식이라, 속으로는 결국 내림차순 질의다.
 *     이름만 바꾼 셈이었다.
 *
 * 콘솔 링크로 색인을 만들면 둘 다 지나가지만 그러지 않는다. 그 색인은 저장소에
 * 남지 않아서 프로젝트를 새로 세우면 아무도 모르는 채 같은 자리에서 다시 터진다.
 * wed100Versions 가 남긴 결론 그대로다 — 색인이 필요 없게 짜는 편이 낫다.
 *
 * 그래서 정렬을 Firestore 에 맡기지 않는다. 문서 이름이 ISO 시각으로 시작하므로
 * 글자 순서가 곧 시간 순서고, 뒤집는 것은 자바스크립트가 한다. 결재함은 두 사람이
 * 쓰는 목록이라 통째로 읽어도 부담이 없다 — 수천 건이 쌓일 물건이 아니다.
 * (그렇게 될 날이 오면 문서 이름 앞자리를 잘라 달(月)로 나눠 읽으면 된다)
 */
export async function listProposals(limit = 100): Promise<Proposal[]> {
  const adb = await db()
  if (!adb) return []
  const snap = await adb.collection(PROPOSALS).get()
  return snap.docs
    .map((d) => ({ ...(d.data() as Proposal), id: d.id }))
    .sort((a, b) => b.id.localeCompare(a.id))
    .slice(0, limit)
}

/**
 * 요청·제안을 올린다.
 *
 * 요청이 향하는 쪽은 화면이 정하지 않는다. 올린 사람의 반대편으로 서버가 정한다 —
 * 화면이 정하게 두면 원장이 원장에게 보내는 요청 같은 것이 만들어질 수 있고,
 * 그건 아무의 할 일 목록에도 안 뜬 채 영영 남는다.
 */
export async function createProposal(
  draft: ProposalDraft,
  by: string,
  role: Role,
): Promise<Proposal> {
  const bad = validateDraft(draft)
  if (bad) throw new Error(bad)

  const adb = await db()
  if (!adb) throw new Error('Firestore 가 설정되지 않아 저장할 수 없습니다.')

  const type = draft.type ?? 'proposal'
  const id = newId()
  const row: Proposal = {
    id,
    type,
    createdAt: new Date().toISOString(),
    createdBy: by,
    title: draft.title.trim(),
    reason: draft.reason.trim(),
    ...(type === 'request' ? { toRole: (role === 'owner' ? 'manager' : 'owner') as Role } : {}),
    ...(draft.fromRequest ? { fromRequest: draft.fromRequest } : {}),
    ...(draft.kind ? { kind: draft.kind } : {}),
    ...(draft.slug ? { slug: draft.slug } : {}),
    ...(draft.field ? { field: draft.field } : {}),
    ...(draft.configPatch ? { configPatch: draft.configPatch } : {}),
    changes: draft.changes ?? [],
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
  let appliedValue: string | undefined
  let applyError: string | undefined

  if (decision === 'approved' && canAutoApply(p.kind)) {
    try {
      appliedValue = await applyProposal(adb, p, by)
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
    ...(appliedValue != null ? { appliedValue } : {}),
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

  /*
    이 제안이 요청에서 나왔다면 그 요청도 함께 닫는다.

    따로 두면 요청은 "처리 대기" 인 채로 남는다. 올린 사람 눈에는 아무 일도 안
    일어난 것처럼 보이고, 실제로는 이미 승인돼 사이트가 바뀐 뒤다.
    반려일 때는 닫지 않는다 — 그 요청은 아직 살아 있고 다른 안이 나와야 한다.
  */
  if (decision === 'approved' && p.fromRequest) {
    try {
      await adb
        .collection(PROPOSALS)
        .doc(p.fromRequest)
        .set(
          { status: 'approved', decidedAt: at, decidedBy: by },
          { merge: true },
        )
    } catch (e) {
      console.error('[결재] 딸린 요청을 닫지 못했습니다 —', e)
    }
  }

  return {
    ...p,
    status: decision,
    decidedAt: at,
    decidedBy: by,
    applied,
    ...(appliedValue != null ? { appliedValue } : {}),
    ...(applyError ? { applyError } : {}),
    notes: [...(p.notes ?? []), ...(note ? [note] : [])],
  }
}

/**
 * 요청을 닫는다 — 처리했거나, 안 하기로 했거나.
 *
 * 결재(decideProposal)와 나눠 둔 이유는 권한이 다르기 때문이다. 결재는 원장만
 * 하지만 요청은 **받은 사람이** 닫는다. 원장이 매니저에게 보낸 요청은 매니저가
 * 닫고, 그 반대도 같다. 요청을 원장만 닫게 하면 매니저가 다 해 놓고도 원장을
 * 기다려야 하고, 그 사이 목록에는 안 끝난 일로 남는다.
 */
export async function closeRequest(
  id: string,
  done: boolean,
  by: string,
  role: Role,
): Promise<void> {
  const adb = await db()
  if (!adb) throw new Error('Firestore 가 설정되지 않았습니다.')
  const ref = adb.collection(PROPOSALS).doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('그런 요청이 없습니다.')

  const p = snap.data() as Proposal
  if (typeOf({ ...p, id }) !== 'request') throw new Error('요청만 닫을 수 있습니다.')
  if (p.toRole && p.toRole !== role) {
    throw new Error('나에게 온 요청만 닫을 수 있습니다.')
  }

  await ref.set(
    {
      status: done ? 'approved' : 'rejected',
      decidedAt: new Date().toISOString(),
      decidedBy: by,
    },
    { merge: true },
  )
}

/**
 * 결재 결과를 확인했다고 표시한다.
 *
 * 승인이 났는데 올린 사람이 모르면 결재는 절반만 끝난 것이다. 화면을 열었다는
 * 것만으로 확인 처리하지 않는다 — 지나가다 연 것과 읽고 납득한 것은 다르고,
 * 특히 반려는 이유를 읽었는지가 중요하다.
 */
export async function ackProposal(id: string, by: string): Promise<void> {
  const adb = await db()
  if (!adb) throw new Error('Firestore 가 설정되지 않았습니다.')
  const ref = adb.collection(PROPOSALS).doc(id)
  if (!(await ref.get()).exists) throw new Error('그런 제안이 없습니다.')
  await ref.set({ ackedAt: new Date().toISOString(), ackedBy: by }, { merge: true })
}

/**
 * 'code' 제안을 배포했다고 표시한다.
 *
 * 허브 본문처럼 저장소에 있는 것은 승인만으로 사이트가 바뀌지 않는다. 그 상태를
 * 그대로 두면 "승인됨" 인 채로 몇 주가 지나도 아무도 올렸는지 안 올렸는지 모른다.
 * 올린 사람이 여기에 표시하면 그때부터 반영된 것이다.
 */
export async function markDeployed(id: string, by: string): Promise<void> {
  const adb = await db()
  if (!adb) throw new Error('Firestore 가 설정되지 않았습니다.')
  const ref = adb.collection(PROPOSALS).doc(id)
  const snap = await ref.get()
  if (!snap.exists) throw new Error('그런 제안이 없습니다.')
  const p = snap.data() as Proposal
  if (p.status !== 'approved') throw new Error('승인된 제안만 반영 표시를 할 수 있습니다.')
  await ref.set(
    { applied: true, deployedAt: new Date().toISOString(), deployedBy: by },
    { merge: true },
  )
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
): Promise<string> {
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

    const ref = adb.collection('wed100_questions').doc(p.slug)
    await ref.set(
      { [p.field]: next, updatedAt: new Date().toISOString(), updatedBy: by },
      { merge: true },
    )

    /*
      쓴 값을 그대로 돌려주지 않고 다시 읽는다.

      merge 규칙이나 필드 이름이 틀려 엉뚱한 칸에 들어가도 쓰기는 성공으로 끝난다.
      그러면 화면에는 "반영됨" 이 뜨는데 사이트는 그대로다. 되읽은 값을 보여 주면
      그 거짓말이 불가능하다.
    */
    const back = (await ref.get()).data()?.[p.field]
    return Array.isArray(back) ? back.join('\n\n') : String(back ?? '')
  }

  if (p.kind === 'config') {
    if (!p.configPatch || !Object.keys(p.configPatch).length) {
      throw new Error('바꿀 설정이 제안에 없습니다.')
    }
    const ref = adb.collection('site_config').doc('wed100')
    await ref.set(
      { ...p.configPatch, updatedAt: new Date().toISOString(), updatedBy: by },
      { merge: true },
    )
    const back = (await ref.get()).data() ?? {}
    const keys = Object.keys(p.configPatch)
    return keys.map((k) => `${k}: ${JSON.stringify(back[k])}`).join('\n')
  }

  throw new Error(`'${p.kind}' 은 자동으로 반영할 수 없습니다.`)
}
