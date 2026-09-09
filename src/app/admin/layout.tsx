import AdminTheme from '@/components/admin/AdminTheme'

/** /admin 아래 전부에 색·글자 크기를 건다 — 게이트 바깥의 제목과 탭까지 포함해서 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminTheme>{children}</AdminTheme>
}
