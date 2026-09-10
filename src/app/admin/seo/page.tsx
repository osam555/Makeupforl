import AdminShell from '@/components/admin/AdminShell'
import SeoGate from '@/components/admin/SeoGate'
import { collectSeoFacts, getSeoConfig, getSeoKeywords } from '@/lib/seoKeywords.server'

export const dynamic = 'force-dynamic'

/**
 * 검색어 목표와 달성도.
 *
 * 사실 수집은 서버에서 한다 — 사이트를 읽어 세는 일이라 브라우저가 할 일이 아니고,
 * 관리자 화면에서 firebase-admin 을 끌어오면 브라우저 번들이 터진다.
 */
export default async function AdminSeoPage() {
  /*
    목록을 먼저 읽고 그것으로 사실과 순위를 모은다.

    사실 계산과 순위 추림이 둘 다 "어떤 말을 노리나" 에 달려 있어서, 목록을 나중에
    읽으면 어드민에서 방금 더한 검색어가 이 화면에서만 빠져 보인다.
  */
  const keywords = await getSeoKeywords()
  const [facts, config] = await Promise.all([collectSeoFacts(keywords), getSeoConfig(keywords)])

  return (
    <AdminShell active="/admin/seo" title="검색어 목표와 달성도">
      <SeoGate facts={facts} config={config} keywords={keywords} />
    </AdminShell>
  )
}
