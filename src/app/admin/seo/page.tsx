import AdminShell from '@/components/admin/AdminShell'
import SeoGate from '@/components/admin/SeoGate'

export const dynamic = 'force-dynamic'

/**
 * 검색어 목표와 달성도.
 *
 * 사실 수집은 서버에서 하되, 페이지가 아니라 /api/admin/view 에서 로그인을 확인한 뒤에
 * 한다 — 페이지에서 읽어 넘기면 로그인 전 HTML 에 실린다.
 */
export default function AdminSeoPage() {
  return (
    <AdminShell active="/admin/seo" title="키워드">
      <SeoGate />
    </AdminShell>
  )
}
