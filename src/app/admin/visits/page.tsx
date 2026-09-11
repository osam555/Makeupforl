import AdminShell from '@/components/admin/AdminShell'
import VisitsGate from '@/components/admin/VisitsGate'
import { getDailyStats } from '@/lib/analytics.server'

export const dynamic = 'force-dynamic'

/**
 * 방문 통계 — 일·주·월 단위로 출처별.
 *
 * 첫 화면의 방문 판은 7일 요약이라 "언제부터 늘었나, 어디서" 를 따라가기에 짧다.
 * 열두 달치를 통째로 읽어 화면에서 묶는다 — 하루 한 문서라 365개면 충분히 가볍고,
 * 단위를 바꿀 때마다 서버를 다시 부르지 않아도 된다.
 */
export default async function AdminVisitsPage() {
  const days = await getDailyStats(366)
  return (
    <AdminShell active="/admin/visits" title="방문">
      <VisitsGate days={days} />
    </AdminShell>
  )
}
