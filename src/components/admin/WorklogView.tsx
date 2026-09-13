'use client'

import AdminGate from '@/components/admin/AdminGate'
import { Empty, Note, Panel, SectionTitle } from '@/components/admin/AdminUI'
import { commitUrl, type RepoCommit, type WorklogEntry } from '@/lib/worklog'

function fmt(d: string) {
  const [y, m, day] = d.split('-')
  return `${y}.${m}.${day}`
}

/** 커밋 하나 — 짧은 해시와 제목. 누르면 GitHub 의 그 커밋(무엇이 바뀌었는지 줄 단위) */
function CommitChip({ sha, subject }: { sha: string; subject: string }) {
  return (
    <a
      href={commitUrl(sha)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex max-w-full items-baseline gap-1.5 rounded-md border border-[var(--a-e0d6cc)] bg-[var(--a-f4f1ee)] px-2 py-1 text-[0.75rem] leading-snug text-[var(--a-6b5d57)] hover:border-[var(--a-a63d5a)] hover:text-[var(--a-a63d5a)]"
      title={subject}
    >
      <code className="shrink-0 font-mono text-[0.6875rem] text-[var(--a-9a8b84)]">{sha}</code>
      <span className="truncate">{subject}</span>
    </a>
  )
}

/**
 * 업무일지.
 *
 * 원장님이 "요즘 사이트에 무슨 일을 했나" 를 한 화면에서 보는 곳이다. 결재함은 앞으로
 * 할 일을 정하는 곳이고, 여기는 이미 한 일이 남는 곳이다. 항목마다 그 일이 담긴
 * 커밋을 붙여 두어, 말과 실제로 바뀐 것이 서로 가리키게 한다.
 */
export default function WorklogView({
  entries,
  unlogged,
}: {
  entries: WorklogEntry[]
  unlogged: RepoCommit[]
}) {
  return (
    <AdminGate title="업무일지">
      {() => (
        <div className="space-y-5">
          <Note>
            에이전트와 매니저가 사이트에 한 일을 날짜별로 적습니다. 항목 아래 회색 칸은 그 일이
            담긴 코드 변경(커밋)입니다 — 누르면 무엇이 어떻게 바뀌었는지 줄 단위로 볼 수 있습니다.
            결재가 필요한 일은 여기가 아니라 [결재] 탭에 올라옵니다.
          </Note>

          {unlogged.length > 0 && (
            <Panel
              title="아직 일지에 없는 변경"
              hint={`${unlogged.length}건 — 다음 일지에 들어갈 것`}
            >
              <ul className="flex flex-col gap-1.5">
                {unlogged.map((c) => (
                  <li key={c.sha} className="flex flex-wrap items-baseline gap-2">
                    <span className="shrink-0 text-[0.6875rem] text-[var(--a-9a8b84)]">{fmt(c.date)}</span>
                    <CommitChip sha={c.sha} subject={c.subject} />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <div>
            <SectionTitle>한 일</SectionTitle>
            {entries.length === 0 ? (
              <Empty>아직 적힌 일지가 없습니다.</Empty>
            ) : (
              <ol className="space-y-3">
                {entries.map((e) => (
                  <li key={e.id}>
                    <Panel title={e.title} hint={fmt(e.date)}>
                      {e.items.length > 0 && (
                        <ul className="mb-3 list-disc space-y-1 pl-5 text-[0.8125rem] leading-relaxed text-[var(--a-2e2724)]">
                          {e.items.map((it, i) => (
                            <li key={i}>{it}</li>
                          ))}
                        </ul>
                      )}
                      {e.commits.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          {e.commits.map((c) => (
                            <CommitChip key={c.sha} sha={c.sha} subject={c.subject} />
                          ))}
                        </div>
                      )}
                    </Panel>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      )}
    </AdminGate>
  )
}
