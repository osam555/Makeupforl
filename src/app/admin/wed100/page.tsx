import Wed100Admin from '@/app/admin/wed100/Wed100Admin'

export const dynamic = 'force-dynamic'

/**
 * 100문100답 관리 — 편집기는 브라우저에서 돈다(Wed100Admin.tsx).
 *
 * 문항별 조회수·무료 문항은 로그인 뒤 /api/admin/view 로 받는다. 전에는 여기서
 * 방문 기록을 읽어 props 로 넘겨, 로그인 없이도 HTML 에 조회수가 실렸다.
 */
export default function AdminWed100Page() {
  return <Wed100Admin />
}
