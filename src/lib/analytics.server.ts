import { EMPTY_DAY, recentDays, type DailyStat } from '@/lib/analytics'

/**
 * 날짜별 방문 기록 읽기 (서버 전용).
 *
 * 없는 날은 0 으로 채운다 — 기록이 없는 날과 방문이 0인 날을 화면에서 구분할 수
 * 없으면 그래프가 끊겨 보이고, 끊긴 그래프는 장애처럼 읽힌다.
 */
export async function getDailyStats(days = 30): Promise<DailyStat[]> {
  const wanted = recentDays(days)
  const empty = wanted.map((date) => ({ date, ...EMPTY_DAY }))

  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const db = await getAdminDb()
    if (!db) return empty

    const snap = await db
      .collection('analytics_daily')
      .where('date', '>=', wanted[0])
      .where('date', '<=', wanted[wanted.length - 1])
      .get()

    const byDate = new Map(
      snap.docs.map((d) => {
        const v = d.data() as Partial<DailyStat>
        return [d.id, { ...EMPTY_DAY, ...v, date: d.id } as DailyStat]
      }),
    )
    return wanted.map((date) => byDate.get(date) ?? { date, ...EMPTY_DAY })
  } catch {
    return empty
  }
}
