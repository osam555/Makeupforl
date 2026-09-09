import AdminTabs from '@/components/admin/AdminTabs'
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
    <div className="min-h-screen bg-[#F4F1EE] py-8">
      <div className="mx-auto max-w-5xl px-5">
        <h1 className="mb-4 text-xl font-extrabold text-[#2E2724]">검색어 목표와 달성도</h1>
        <AdminTabs active="/admin/seo" />
        <SeoGate facts={facts} config={config} />
      </div>
    </div>
  )
}
