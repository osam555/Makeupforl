/**
 * 상담 신청을 캠페인 표에 쓸 만큼만 읽는다 (서버 전용).
 *
 * source·status 두 칸만 고른다(select). 방문 화면은 서버에서 그려 HTML 에 실리는데,
 * 이름·전화번호까지 읽어 오면 그 화면에 개인정보가 지나가게 된다 — 표에는 건수만 필요하다.
 * 못 읽으면 빈 목록: 도착 숫자는 그대로 보이고 신청 칸만 0 이 된다.
 */
export async function getLeadTallies(): Promise<{ source: string; status: string }[]> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const db = await getAdminDb()
    if (!db) return []
    const snap = await db.collection('consult_leads').select('source', 'status').get()
    return snap.docs.map((d) => ({ source: String(d.get('source') ?? ''), status: String(d.get('status') ?? '') }))
  } catch {
    return []
  }
}
