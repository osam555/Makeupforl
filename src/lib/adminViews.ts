/**
 * 어드민 읽기 화면이 서버에서 받아 가는 값의 모양.
 *
 * 전에는 서버 페이지가 이 값을 먼저 읽어 클라이언트 게이트(AdminGate)에 props 로
 * 넘겼다. 게이트는 브라우저에서 화면만 가리므로, 로그인 없이 curl 한 HTML(RSC 페이로드)
 * 에 1년치 방문 기록·문항 답변 전문이 그대로 실려 나갔다 (2026-11-07 /admin/visits 에서 발견).
 *
 * 이제 페이지는 껍데기만 그리고, 로그인한 뒤 브라우저가 idToken 을 실어
 * /api/admin/view 를 부른다. 서버는 verifyAdmin 을 통과해야만 값을 읽는다.
 *
 * 타입만 여기 둔다 — 읽는 코드는 firebase-admin 을 끌어오므로 adminViews.server.ts 에 있다.
 */
import type { Content, QnaRow } from '@/components/admin/Overview'
import type { QuestionRef } from '@/components/admin/Proposals'
import type { DailyStat } from '@/lib/analytics'
import type { SeoConfig, SeoFacts, SeoKeyword, SeoSnapshot, SeoTodo } from '@/lib/seoKeywords'
import type { RepoCommit, WorklogEntry } from '@/lib/worklog'
import type { Wed100Item } from '@/types/wed100'

export type QnaHit = { views: number; last: string | null }

export interface AdminViews {
  overview: {
    days: DailyStat[]
    facts: Record<string, SeoFacts>
    keywords: SeoKeyword[]
    content: Content
    qna: QnaRow[]
    history: SeoSnapshot[]
  }
  visits: { days: DailyStat[] }
  seo: {
    facts: Record<string, SeoFacts>
    config: SeoConfig
    keywords: SeoKeyword[]
    history: SeoSnapshot[]
    /** null 이면 Firestore 를 못 읽은 것 — 빈 목록과 다르다 */
    todos: SeoTodo[] | null
    linksCountedAt: string
  }
  wed100: { hits: Record<string, QnaHit>; free: string[] }
  /*
    편집기가 브라우저에서 Firestore 를 못 읽었을 때 받는 문항 전체 (2026-11-07).
    전에는 편집기가 시드 JSON 을 import 해 두었다가 썼는데, 그러면 102문항 답 전문이
    누구나 받을 수 있는 공개 JS 파일에 실렸다. 이제 로그인 확인 뒤에만 서버가 준다.
  */
  wed100Items: { items: Wed100Item[] }
  proposals: { questions: QuestionRef[] }
  worklog: { entries: WorklogEntry[]; unlogged: RepoCommit[] }
}

export type AdminView = keyof AdminViews

export const ADMIN_VIEWS: readonly AdminView[] = [
  'overview',
  'visits',
  'seo',
  'wed100',
  'wed100Items',
  'proposals',
  'worklog',
]
