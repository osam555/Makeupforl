import AdminShell from '@/components/admin/AdminShell'
import LeadsGate from '@/components/admin/LeadsView'

export const dynamic = 'force-dynamic'

/**
 * 상담 신청 — 목록은 화면이 실시간으로 구독하고(LeadsView), 캠페인 표의 「도착」은 로그인 뒤
 * /api/admin/view 의 방문 화면 값에서 받는다. 이 페이지가 서버에서 읽어 props 로 넘기면
 * 로그인 전 HTML 에 실린다(adminViews.ts 주석 참고).
 */
export default function AdminLeadsPage() {
  return (
    <AdminShell active="/admin/leads" title="상담 신청">
      <LeadsGate />
    </AdminShell>
  )
}
