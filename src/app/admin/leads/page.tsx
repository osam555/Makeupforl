import AdminShell from '@/components/admin/AdminShell'
import LeadsGate from '@/components/admin/LeadsView'
import { sum } from '@/lib/analytics'
import { getDailyStats } from '@/lib/analytics.server'
import { campaignOfSource } from '@/lib/campaign'

export const dynamic = 'force-dynamic'

/**
 * 상담 신청 — 목록은 화면이 실시간으로 구독하고(LeadsView), 여기서는 캠페인 표의 「도착」만
 * 서버에서 읽어 넘긴다. 방문 기록은 보안 규칙에서 화면 읽기를 열어 두지 않았고, 이 숫자 하나
 * 때문에 규칙을 넓히기보다 방문 화면처럼 서버에서 읽는 쪽이 좁다. 꼬리표 출처만 골라 넘긴다.
 */
export default async function AdminLeadsPage() {
  const { sources } = sum(await getDailyStats(366))
  const arrivals = Object.fromEntries(Object.entries(sources).filter(([k]) => campaignOfSource(k)))
  return (
    <AdminShell active="/admin/leads" title="상담 신청">
      <LeadsGate arrivals={arrivals} />
    </AdminShell>
  )
}
