import AdminAuthProvider from '@/components/admin/AdminAuth'
import AdminTheme from '@/components/admin/AdminTheme'

/**
 * /admin 아래 전부에 색·글자 크기·로그인 상태를 건다.
 *
 * 셋 다 게이트 바깥의 제목과 탭까지 닿아야 한다 — 안쪽에만 걸었을 때는 위쪽만
 * 밝은 채로 남거나, 윗줄이 누가 로그인했는지 몰라 계정 표시를 따로 한 줄 더
 * 차지해야 했다.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminTheme>
      <AdminAuthProvider>{children}</AdminAuthProvider>
    </AdminTheme>
  )
}
