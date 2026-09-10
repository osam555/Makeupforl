import AdminShell from '@/components/admin/AdminShell'
import SeoGate from '@/components/admin/SeoGate'
import { collectSeoFacts, getSeoConfig } from '@/lib/seoTargets.server'

export const dynamic = 'force-dynamic'

/**
 * 검색어 목표와 달성도.
 *
 * 사실 수집은 서버에서 한다 — 사이트를 읽어 세는 일이라 브라우저가 할 일이 아니고,
 * 관리자 화면에서 firebase-admin 을 끌어오면 브라우저 번들이 터진다.
 */
export default async function AdminSeoPage() {
  const [facts, config] = await Promise.all([collectSeoFacts(), getSeoConfig()])

  return (
    <AdminShell active="/admin/seo" title="검색어 목표와 달성도">
      <SeoGate facts={facts} config={config} />
    </AdminShell>
  )
}
