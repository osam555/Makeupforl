import Wed100Admin, { type QnaHit } from '@/app/admin/wed100/Wed100Admin'
import { getDailyStats } from '@/lib/analytics.server'

export const dynamic = 'force-dynamic'

/**
 * 100문100답 관리 — 편집기는 브라우저에서 돌고(Wed100Admin.tsx), 여기서는 방문 기록만
 * 읽어 넘긴다. 방문 기록은 Admin SDK 로만 읽을 수 있어 서버가 필요하다.
 *
 * 문항별 조회수와 마지막으로 읽힌 날. 기록을 남기기 시작한 2026-09-09 부터 전부 —
 * 하루 한 문서라 1년치를 읽어도 가볍다.
 */
export default async function AdminWed100Page() {
  const days = await getDailyStats(366)
  const hits: Record<string, QnaHit> = {}
  for (const d of days) {
    for (const [k, n] of Object.entries(d.pages)) {
      if (!k.startsWith('_honjoo100_') || !n) continue
      const slug = k.slice('_honjoo100_'.length)
      // 문항 아래 다른 경로(_honjoo100_p1-01_something)는 없지만, 목록 페이지 자체는 뺀다
      if (!slug) continue
      const h = (hits[slug] ??= { views: 0, last: null })
      h.views += n
      if (!h.last || d.date > h.last) h.last = d.date
    }
  }
  return <Wed100Admin hits={hits} />
}
