import AdminShell from '@/components/admin/AdminShell'
import VisitsGate from '@/components/admin/VisitsGate'

export const dynamic = 'force-dynamic'

/**
 * 방문 통계 — 일·주·월 단위로 출처별.
 *
 * 첫 화면의 방문 판은 7일 요약이라 "언제부터 늘었나, 어디서" 를 따라가기에 짧다.
 * 열두 달치를 로그인 뒤에 받아 화면에서 묶는다. 전에는 이 페이지가 서버에서 읽어
 * props 로 넘겼고, 로그인 없이 curl 한 HTML 에 1년치 기록이 그대로 실렸다.
 */
export default function AdminVisitsPage() {
  return (
    <AdminShell active="/admin/visits" title="방문">
      <VisitsGate />
    </AdminShell>
  )
}
