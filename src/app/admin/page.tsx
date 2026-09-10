import AdminShell from '@/components/admin/AdminShell'
import OverviewGate from '@/components/admin/OverviewGate'
import { getDailyStats } from '@/lib/analytics.server'
import { HUBS } from '@/lib/hubs'
import { collectSeoFacts, getSeoHistory, getSeoKeywords } from '@/lib/seoKeywords.server'
import { estimateDuration, getPublishedWed100Items } from '@/lib/wed100'
import { isOpen } from '@/lib/wed100Access'
import { getWed100Access } from '@/lib/wed100Access.server'

export const dynamic = 'force-dynamic'

/**
 * 어드민 첫 화면.
 *
 * 전에는 /admin 이 예약 목록이었다. 예약은 일이 생겼을 때 들어가는 화면이지,
 * 매일 열어 보는 화면이 아니다. 첫 화면에는 흐름을 보는 것들을 놓는다 —
 * 사람이 얼마나 오는가, 올 준비는 됐는가, 팔 물건은 어떤 상태인가.
 * 예약 목록은 /admin/bookings 로 옮겼다.
 */
export default async function AdminHome() {
  /*
    목록을 먼저 읽는다. 인자 없이 collectSeoFacts() 를 부르면 코드 시드를 보게 되어,
    어드민에서 검색어를 더해도 이 화면에만 안 나타난다 — 화면마다 다른 목록이 뜨는
    것이 가장 나쁜 상태다. 무엇이 맞는지 아무도 모르게 된다.
  */
  const keywords = await getSeoKeywords()
  const [days, facts, items, access, history] = await Promise.all([
    getDailyStats(30),
    collectSeoFacts(keywords),
    getPublishedWed100Items(),
    getWed100Access(),
    getSeoHistory(60),
  ])

  const content = {
    total: items.length,
    open: items.filter((x) => isOpen(access, x.slug)).length,
    audioMinutes: Math.round(
      items.reduce((a, x) => a + (x.duration ?? estimateDuration(x)), 0) / 60,
    ),
    hubs: HUBS.length,
    members: access.members.length,
    paywall: access.paywall,
    // 문항 + 허브 + 고정 페이지(홈·브랜드·서비스·상담·갤러리·예약·후기·영상 8 + 갤러리 분야 7)
    sitemap: items.length + HUBS.length + 15,
  }

  /* 문항별 사용 현황 — 조회수는 화면에서 방문 기록과 맞춰 붙인다 */
  const qna = items.map((x) => ({
    slug: x.slug,
    question: x.question,
    part: x.part,
    open: isOpen(access, x.slug),
    chars: x.answer.join('').length,
    hasAudio: !!x.audio,
  }))

  return (
    <AdminShell active="/admin" title="메이크업포엘 관리">
      <OverviewGate
        days={days}
        facts={facts}
        keywords={keywords}
        content={content}
        qna={qna}
        history={history}
      />
    </AdminShell>
  )
}
