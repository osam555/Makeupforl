'use client'

import AdminGate from '@/components/admin/AdminGate'
import Overview from '@/components/admin/Overview'
import type { DailyStat } from '@/lib/analytics'
import type { Content, QnaRow } from '@/components/admin/Overview'
import type { SeoFacts, SeoKeyword, SeoSnapshot } from '@/lib/seoKeywords'

/** 서버가 모은 값을 로그인 확인 뒤에 화면으로 넘긴다 */
export default function OverviewGate(props: {
  days: DailyStat[]
  facts: Record<string, SeoFacts>
  keywords: SeoKeyword[]
  content: Content
  qna: QnaRow[]
  history: SeoSnapshot[]
}) {
  return (
    <AdminGate title="관리자 대시보드">
      {(ctx) => (
        <Overview
          {...props}
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
