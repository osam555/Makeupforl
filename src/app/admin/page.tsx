import AdminShell from '@/components/admin/AdminShell'
import OverviewGate from '@/components/admin/OverviewGate'

export const dynamic = 'force-dynamic'

/**
 * 어드민 첫 화면.
 *
 * 전에는 /admin 이 예약 목록이었다. 예약은 일이 생겼을 때 들어가는 화면이지,
 * 매일 열어 보는 화면이 아니다. 첫 화면에는 흐름을 보는 것들을 놓는다 —
 * 사람이 얼마나 오는가, 올 준비는 됐는가, 팔 물건은 어떤 상태인가.
 * 예약 목록은 /admin/bookings 로 옮겼다.
 *
 * 여기서는 아무것도 읽지 않는다. 서버 페이지가 읽어 게이트에 넘기면 로그인 전 HTML 에도
 * 값이 실린다 — 값은 로그인 뒤 /api/admin/view 가 준다 (src/lib/adminViews.server.ts).
 */
export default function AdminHome() {
  return (
    <AdminShell active="/admin" title="메이크업포엘 관리">
      <OverviewGate />
    </AdminShell>
  )
}
