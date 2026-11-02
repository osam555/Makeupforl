import { todayKST } from '@/lib/wed100Access'
import { USAGE_COLLECTION } from '@/lib/wed100Usage'

/**
 * 회원이 잠긴 문항 본문을 받을 때 열람 기록을 남긴다 (서버 전용 — firebase-admin).
 * 기록이 실패해도 본문은 내려가야 한다: 값을 낸 분이 통계 때문에 못 보면 안 된다.
 */
export async function recordUsage(email: string, slug: string): Promise<void> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (!adb) return
    const { FieldValue } = await import('firebase-admin/firestore')
    await adb.collection(USAGE_COLLECTION).doc(email.toLowerCase()).set(
      {
        email: email.toLowerCase(),
        lastAt: new Date().toISOString(),
        opens: FieldValue.increment(1),
        viewed: FieldValue.arrayUnion(slug),
        days: FieldValue.arrayUnion(todayKST()),
      },
      { merge: true },
    )
  } catch {
    /* 기록 실패는 삼킨다 */
  }
}

/** 열람 시간(초)을 더한다. 실패해도 조용히 넘긴다 */
export async function addReadSeconds(email: string, seconds: number): Promise<void> {
  if (seconds <= 0) return
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (!adb) return
    const { FieldValue } = await import('firebase-admin/firestore')
    await adb
      .collection(USAGE_COLLECTION)
      .doc(email.toLowerCase())
      .set({ email: email.toLowerCase(), seconds: FieldValue.increment(seconds) }, { merge: true })
  } catch {
    /* 기록 실패는 삼킨다 */
  }
}
