'use client'

import AdminGate from '@/components/admin/AdminGate'
import AdminView, { getIdToken } from '@/components/admin/AdminView'
import SeoMonitor from '@/components/admin/SeoMonitor'

/**
 * 인증 껍데기.
 *
 * 사실 수집은 여전히 서버가 한다 — 사이트를 읽어 세는 일이라 브라우저가 할 일이 아니다.
 * 다만 서버 페이지가 props 로 넘기면 로그인 전 HTML 에 실리므로, 로그인을 확인한 뒤
 * /api/admin/view 로 받는다. 같은 idToken 을 저장 API 에도 쓴다.
 */
export default function SeoGate() {
  return (
    <AdminGate title="키워드">
      {() => (
        <AdminView view="seo">
          {(d) => (
            <SeoMonitor
              facts={d.facts}
              initial={d.config}
              keywords={d.keywords}
              history={d.history}
              todos={d.todos}
              linksCountedAt={d.linksCountedAt}
              auth={async () => ({ idToken: await getIdToken() })}
            />
          )}
        </AdminView>
      )}
    </AdminGate>
  )
}
