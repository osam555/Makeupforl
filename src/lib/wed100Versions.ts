import { FieldPath } from 'firebase-admin/firestore'
import type { Firestore } from 'firebase-admin/firestore'

/**
 * 문항 수정 이력.
 *
 * 지금까지 저장은 덮어쓰기였다. updatedAt·updatedBy 만 갱신되고 이전 내용은
 * 남지 않아서, 관리자에서 본문을 잘못 고치면 되돌릴 방법이 없었다.
 * 오늘 제목 열다섯 개를 바꿀 때도 파일 백업을 손으로 떠야 했다.
 *
 * 그래서 고치기 직전의 문서를 통째로 한 벌 떠 둔다. 무엇이 바뀌었는지를
 * 계산해 두지 않고 원본을 그대로 남기는 이유는, 되돌릴 때 계산이 끼면
 * 그 계산이 틀렸을 때 복구 자체가 망가지기 때문이다.
 */
export const VERSIONS = 'wed100_versions'

/** 문항 하나가 갖는 이력의 최대 개수. 넘치면 오래된 것부터 지운다 */
export const KEEP = 20

/**
 * 이력 문서 id.
 *
 * "문항__시각" 으로 지어 두면 문서 이름만으로 한 문항의 이력이 시간순으로 붙는다.
 * 그래서 slug 로 거르고 savedAt 으로 정렬하는 대신, 문서 이름 구간으로 읽는다 —
 * 처음에는 where + orderBy 로 짰다가 Firestore 가 복합 색인을 요구해서 막혔다.
 * 색인을 만들게 하는 것보다 색인이 필요 없게 짜는 편이 낫다.
 */
const idFor = (slug: string, at: string) => `${slug}__${at}`

/** 한 문항의 이력을 문서 이름 구간으로 읽는다 (오래된 것부터) */
async function idsFor(db: Firestore, slug: string) {
  return db
    .collection(VERSIONS)
    .orderBy(FieldPath.documentId())
    .startAt(`${slug}__`)
    .endAt(`${slug}__\uf8ff`)
    .get()
}

export interface Wed100Version {
  id: string
  slug: string
  /** 이 판이 만들어진 시각 = 다음 수정이 일어난 시각 */
  savedAt: string
  /** 이 판을 밀어낸 사람 */
  editor: string
  /** 무엇을 고쳤는지 — 목록에서 훑어보기 위한 표시일 뿐, 복구는 snapshot 으로 한다 */
  fields: string[]
  question: string
  snapshot: Record<string, unknown>
}

/**
 * 고치기 직전 상태를 한 벌 떠 둔다.
 *
 * 문서가 없으면(새로 만드는 경우) 뜰 것이 없으므로 아무 일도 하지 않는다.
 * 이력 저장이 실패해도 본 작업은 막지 않는다 — 기록을 못 남기는 것보다
 * 저장 자체가 안 되는 쪽이 나쁘다. 대신 호출부가 알 수 있게 결과를 돌려준다.
 */
export async function snapshotBefore(
  db: Firestore,
  slug: string,
  editor: string,
  fields: string[],
): Promise<boolean> {
  try {
    const ref = db.collection('wed100_questions').doc(slug)
    const snap = await ref.get()
    if (!snap.exists) return false

    const before = snap.data() as Record<string, unknown>
    const at = new Date().toISOString()
    await db
      .collection(VERSIONS)
      .doc(idFor(slug, at))
      .set({
        slug,
        savedAt: at,
        editor,
        fields,
        question: String(before.question ?? ''),
        snapshot: before,
      })
    await prune(db, slug)
    return true
  } catch {
    return false
  }
}

/** 오래된 이력을 정리한다. 문항마다 KEEP 개까지만 남긴다 */
async function prune(db: Firestore, slug: string) {
  const snap = await idsFor(db, slug)
  // 이름순 = 오래된 것부터. 앞에서부터 넘치는 만큼 지운다
  const extra = snap.docs.slice(0, Math.max(0, snap.docs.length - KEEP))
  if (extra.length === 0) return
  const batch = db.batch()
  extra.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/** 한 문항의 이력을 최신순으로 */
export async function listVersions(
  db: Firestore,
  slug: string,
  limit = KEEP,
): Promise<Wed100Version[]> {
  const snap = await idsFor(db, slug)
  return snap.docs
    .map((d) => ({ id: d.id, ...(d.data() as Omit<Wed100Version, 'id'>) }))
    .reverse()
    .slice(0, limit)
}
