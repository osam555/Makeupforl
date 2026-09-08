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

/** 이력 문서 id — 최신순 정렬이 문자열 정렬로 되도록 시각을 뒤에 붙인다 */
const idFor = (slug: string, at: string) => `${slug}__${at}`

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
  const snap = await db
    .collection(VERSIONS)
    .where('slug', '==', slug)
    .orderBy('savedAt', 'desc')
    .offset(KEEP)
    .get()
  if (snap.empty) return
  const batch = db.batch()
  snap.docs.forEach((d) => batch.delete(d.ref))
  await batch.commit()
}

/** 한 문항의 이력을 최신순으로 */
export async function listVersions(
  db: Firestore,
  slug: string,
  limit = KEEP,
): Promise<Wed100Version[]> {
  const snap = await db
    .collection(VERSIONS)
    .where('slug', '==', slug)
    .orderBy('savedAt', 'desc')
    .limit(limit)
    .get()
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Wed100Version, 'id'>) }))
}
