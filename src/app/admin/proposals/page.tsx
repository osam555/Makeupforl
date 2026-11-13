import AdminShell from '@/components/admin/AdminShell'
import ProposalsGate from '@/components/admin/ProposalsGate'

export const dynamic = 'force-dynamic'

/**
 * 결재 — 매니저가 올리고 원장이 정한다.
 *
 * 문항 목록(답변 전문)은 로그인 뒤에 /api/admin/view 로 받는다. 전에는 이 페이지가
 * 서버에서 실어 보내서, 로그인 없이 HTML 만 받아도 유료 답변이 전부 읽혔다.
 */
export default function AdminProposalsPage() {
  return (
    <AdminShell active="/admin/proposals" title="결재">
      <ProposalsGate />
    </AdminShell>
  )
}
