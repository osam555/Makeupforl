import AdminShell from '@/components/admin/AdminShell'
import VisitsGate from '@/components/admin/VisitsGate'
import { sum } from '@/lib/analytics'
import { getDailyStats } from '@/lib/analytics.server'
import { campaignRows } from '@/lib/campaign'
import { getLeadTallies } from '@/lib/campaign.server'

export const dynamic = 'force-dynamic'

/**
 * 방문 통계 — 일·주·월 단위로 출처별.
 *
 * 첫 화면의 방문 판은 7일 요약이라 "언제부터 늘었나, 어디서" 를 따라가기에 짧다.
 * 열두 달치를 통째로 읽어 화면에서 묶는다 — 하루 한 문서라 365개면 충분히 가볍고,
 * 단위를 바꿀 때마다 서버를 다시 부르지 않아도 된다.
 */
export default async function AdminVisitsPage() {
  const [days, leads] = await Promise.all([getDailyStats(366), getLeadTallies()])
  // 캠페인 표는 화면의 일·주·월 단추와 상관없이 1년 전체 — CampaignTable 주석 참고
  const campaigns = campaignRows(sum(days).sources, leads)
  return (
    <AdminShell active="/admin/visits" title="방문">
      <VisitsGate days={days} campaigns={campaigns} />
    </AdminShell>
  )
}
