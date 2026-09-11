'use client'

import AdminGate from '@/components/admin/AdminGate'
import SeoMonitor from '@/components/admin/SeoMonitor'
import type { SeoConfig, SeoFacts, SeoKeyword, SeoSnapshot } from '@/lib/seoKeywords'

/**
 * 인증 껍데기.
 *
 * 서버 페이지가 사실을 모아 넘기고, 여기서 로그인을 확인한 뒤 화면에 건넨다.
 * AdminGate 가 넘겨주는 인증 정보를 저장 API 에 그대로 쓴다.
 */
export default function SeoGate({
  facts,
  config,
  keywords,
  history,
  linksCountedAt,
}: {
  facts: Record<string, SeoFacts>
  config: SeoConfig
  keywords: SeoKeyword[]
  history: SeoSnapshot[]
  linksCountedAt: string
}) {
  return (
    <AdminGate title="키워드">
      {(ctx) => (
        <SeoMonitor
          facts={facts}
          initial={config}
          keywords={keywords}
          history={history}
          linksCountedAt={linksCountedAt}
          auth={async () =>
            ctx.mode === 'google' && ctx.email
              ? { idToken: await getIdToken() }
              : { password: ctx.password }
          }
        />
      )}
    </AdminGate>
  )
}

async function getIdToken(): Promise<string> {
  const { getFirebaseApp } = await import('@/lib/firebase/client')
  const app = getFirebaseApp()
  if (!app) return ''
  const { getAuth } = await import('firebase/auth')
  return (await getAuth(app).currentUser?.getIdToken()) ?? ''
}
