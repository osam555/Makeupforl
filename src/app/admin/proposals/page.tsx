import AdminShell from '@/components/admin/AdminShell'
import ProposalsGate from '@/components/admin/ProposalsGate'
import type { QuestionRef } from '@/components/admin/Proposals'
import { getPublishedWed100Items } from '@/lib/wed100'

export const dynamic = 'force-dynamic'

/**
 * 결재 — 매니저가 올리고 원장이 정한다.
 *
 * 문항 목록을 서버에서 실어 보낸다. 매니저가 문항을 고르면 '지금' 칸이 저절로
 * 채워져야 하는데, 그러려면 지금 값이 화면에 있어야 한다. 손으로 옮겨 적게 하면
 * 옮기다 틀리고, 틀린 '지금' 위에서 원장님이 결재하게 된다.
 *
 * 자막(cues)·음성 주소처럼 결재에 쓰이지 않는 것은 떼고 보낸다 — 문항 103개의
 * 자막까지 실으면 화면 한 장에 수백 KB 가 따라온다.
 */
export default async function AdminProposalsPage() {
  const items = await getPublishedWed100Items()
  const questions: QuestionRef[] = items.map((x) => ({
    slug: x.slug,
    question: x.question,
    answer: (x.answer ?? []).join('\n\n'),
  }))

  return (
    <AdminShell active="/admin/proposals" title="결재">
      <ProposalsGate questions={questions} />
    </AdminShell>
  )
}
