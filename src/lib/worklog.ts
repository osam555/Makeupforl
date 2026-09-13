import seed from '@/data/worklog.json'

export type WorklogCommit = { sha: string; subject: string }
export type WorklogEntry = {
  id: string
  /** YYYY-MM-DD — 일을 한 날(커밋 날짜) */
  date: string
  title: string
  /** 한 일 — 한 줄씩. 원장님이 읽는 글이라 코드 이름 대신 화면에서 보이는 말로 쓴다 */
  items: string[]
  commits: WorklogCommit[]
}

export const REPO_URL = 'https://github.com/osam555/Makeupforl'

/**
 * 업무일지 — 에이전트와 매니저가 무엇을 했는지 원장님이 볼 수 있게 남기는 곳.
 *
 * 저장소(src/data/worklog.json)에 둔다. Firestore 가 아닌 이유 — 일지의 단위가 커밋이라
 * 커밋과 같은 곳에 같은 흐름으로 남는 편이 맞다. 일지를 쓰는 것도 코드를 고친 쪽이고,
 * 원장님은 읽기만 하신다. 결재(요청·제안)는 결재함이 맡는다 — 여기는 "무엇을 했나" 만.
 *
 * 쓰는 법은 scripts/worklog.py. 커밋 뒤에 `pending` 으로 아직 일지에 없는 커밋을 보고
 * `add` 로 한 묶음 적는다. 일지를 적는 커밋 자체("업무일지 …")는 일지에 넣지 않는다.
 */
const SEED = seed as { entries: WorklogEntry[] }

export function getWorklog(): WorklogEntry[] {
  return [...SEED.entries].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
}

/** 일지에 적힌 커밋 전부 — 아직 안 적힌 커밋을 가려낼 때 쓴다 */
export function loggedShas(entries: WorklogEntry[]): Set<string> {
  return new Set(entries.flatMap((e) => e.commits.map((c) => c.sha.slice(0, 7))))
}

/**
 * 아직 일지에 없는 커밋. 일지를 시작한 날 이전 것은 보지 않는다 — 그 전 것까지
 * 다 적을 생각은 없고, 적지 않은 옛 커밋이 "빠진 일" 처럼 보이면 안 된다.
 */
export function unloggedCommits(entries: WorklogEntry[], repo: RepoCommit[]): RepoCommit[] {
  const logged = loggedShas(entries)
  const start = entries.reduce((m, e) => (e.date < m ? e.date : m), '9999-99-99')
  return repo.filter((c) => !logged.has(c.sha) && c.date >= start && !isLogCommit(c.subject))
}

/** 일지를 적는 커밋은 일지에 안 넣는다 — 자기 자신을 가리키는 항목이 된다 */
export function isLogCommit(subject: string): boolean {
  return /^업무일지/.test(subject)
}

export function commitUrl(sha: string): string {
  return `${REPO_URL}/commit/${sha}`
}

export type RepoCommit = WorklogCommit & { date: string }

/**
 * 저장소의 최근 커밋. 어드민에서 "아직 일지에 없는 커밋" 을 보여 주기 위한 것이다.
 *
 * 서버에는 git 이 없다(Vercel). 저장소가 공개라 GitHub API 를 토큰 없이 읽는다 —
 * 시간당 60회 제한이 있어 10분 캐시한다. 못 읽으면 빈 배열 — 일지 자체는 시드라
 * 이 목록이 없어도 화면은 다 그려진다.
 */
export async function fetchRepoCommits(limit = 40): Promise<RepoCommit[]> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/osam555/Makeupforl/commits?per_page=${limit}`,
      {
        headers: { Accept: 'application/vnd.github+json' },
        next: { revalidate: 600 },
      },
    )
    if (!res.ok) return []
    const rows = (await res.json()) as {
      sha: string
      commit: { message: string; author: { date: string } }
    }[]
    return rows.map((r) => ({
      sha: r.sha.slice(0, 7),
      subject: r.commit.message.split('\n')[0],
      date: r.commit.author.date.slice(0, 10),
    }))
  } catch {
    return []
  }
}
