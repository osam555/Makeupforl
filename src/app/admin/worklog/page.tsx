import AdminShell from '@/components/admin/AdminShell'
import WorklogView from '@/components/admin/WorklogView'

export const dynamic = 'force-dynamic'

/**
 * 업무일지 — 한 일을 날짜별로, 커밋과 함께.
 *
 * 일지는 저장소 시드에서, "아직 일지에 없는 변경" 은 GitHub 에서 읽는다. 다른 어드민
 * 화면과 같이 로그인 뒤 /api/admin/view 로 받는다 — 읽기 화면마다 길이 다르면
 * 어느 하나가 HTML 에 값을 싣는 옛 모양으로 되돌아가도 눈에 띄지 않는다.
 */
export default function AdminWorklogPage() {
  return (
    <AdminShell active="/admin/worklog" title="업무일지">
      <WorklogView />
    </AdminShell>
  )
}
