import AdminShell from '@/components/admin/AdminShell'
import WorklogView from '@/components/admin/WorklogView'
import { fetchRepoCommits, getWorklog, unloggedCommits } from '@/lib/worklog'

export const dynamic = 'force-dynamic'

/**
 * 업무일지 — 한 일을 날짜별로, 커밋과 함께.
 *
 * 일지는 저장소 시드에서, "아직 일지에 없는 변경" 은 GitHub 에서 읽는다. GitHub 를
 * 못 읽으면 그 판만 안 보이고 일지는 그대로 나온다.
 */
export default async function AdminWorklogPage() {
  const entries = getWorklog()
  const unlogged = unloggedCommits(entries, await fetchRepoCommits())
  return (
    <AdminShell active="/admin/worklog" title="업무일지">
      <WorklogView entries={entries} unlogged={unlogged} />
    </AdminShell>
  )
}
