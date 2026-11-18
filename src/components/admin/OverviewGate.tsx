'use client'

import AdminGate from '@/components/admin/AdminGate'
import AdminView, { getIdToken } from '@/components/admin/AdminView'
import Overview from '@/components/admin/Overview'

/**
 * 첫 화면 값은 로그인을 확인한 뒤에 받는다.
 *
 * 전에는 서버 페이지가 모아 props 로 넘겼는데, 그러면 로그인 전 HTML 에도 방문 기록과
 * 검색어 목록이 실린다. 게이트는 가리기만 할 뿐 막지 못한다.
 */
export default function OverviewGate() {
  return (
    <AdminGate title="관리자 대시보드">
      {() => (
        <AdminView view="overview">
          {(data) => <Overview {...data} auth={async () => ({ idToken: await getIdToken() })} />}
        </AdminView>
      )}
    </AdminGate>
  )
}
