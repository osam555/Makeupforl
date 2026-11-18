import type { AdminView, AdminViews, QnaHit } from '@/lib/adminViews'
import { sum } from '@/lib/analytics'
import { getDailyStats } from '@/lib/analytics.server'
import { campaignRows } from '@/lib/campaign'
import { getLeadTallies } from '@/lib/campaign.server'
import { HUBS } from '@/lib/hubs'
import {
  LINKS_COUNTED_AT,
  collectSeoFacts,
  getSeoConfig,
  getSeoHistory,
  getSeoKeywords,
  getSeoTodos,
} from '@/lib/seoKeywords.server'
import { estimateDuration, getPublishedWed100Items, getWed100Items } from '@/lib/wed100'
import { isOpen } from '@/lib/wed100Access'
import { getWed100Access } from '@/lib/wed100Access.server'
import { fetchRepoCommits, getWorklog, unloggedCommits } from '@/lib/worklog'

/**
 * 어드민 읽기 화면의 값을 모은다 — 반드시 verifyAdmin 을 통과한 뒤에만 부를 것.
 *
 * 예전에는 각 page.tsx 가 이 일을 하고 결과를 게이트에 props 로 넘겼다. 그 길로는
 * 로그인 전의 HTML 에도 값이 실린다. 그래서 읽는 코드를 페이지에서 떼어 여기 모으고,
 * 부르는 곳을 /api/admin/view 하나로 줄였다 — 문이 하나여야 확인을 빠뜨릴 곳도 하나다.
 */
export const ADMIN_LOADERS: { [K in AdminView]: () => Promise<AdminViews[K]> } = {
  async overview() {
    /*
      목록을 먼저 읽는다. 인자 없이 collectSeoFacts() 를 부르면 코드 시드를 보게 되어,
      어드민에서 검색어를 더해도 이 화면에만 안 나타난다 — 화면마다 다른 목록이 뜨는
      것이 가장 나쁜 상태다. 무엇이 맞는지 아무도 모르게 된다.
    */
    const keywords = await getSeoKeywords()
    const [days, facts, items, access, history] = await Promise.all([
      getDailyStats(30),
      collectSeoFacts(keywords),
      getPublishedWed100Items(),
      getWed100Access(),
      getSeoHistory(60),
    ])

    const content = {
      total: items.length,
      open: items.filter((x) => isOpen(access, x.slug)).length,
      audioMinutes: Math.round(
        items.reduce((a, x) => a + (x.duration ?? estimateDuration(x)), 0) / 60,
      ),
      hubs: HUBS.length,
      members: access.members.length,
      paywall: access.paywall,
      // 문항 + 허브 + 고정 페이지(홈·브랜드·서비스·상담·갤러리·예약·후기·영상 8 + 갤러리 분야 7)
      sitemap: items.length + HUBS.length + 15,
    }

    /* 문항별 사용 현황 — 조회수는 화면에서 방문 기록과 맞춰 붙인다 */
    const qna = items.map((x) => ({
      slug: x.slug,
      question: x.question,
      part: x.part,
      open: isOpen(access, x.slug),
      chars: x.answer.join('').length,
      hasAudio: !!x.audio,
    }))

    return { days, facts, keywords, content, qna, history }
  },

  /*
    열두 달치를 통째로 읽어 화면에서 묶는다 — 하루 한 문서라 365개면 충분히 가볍고,
    단위를 바꿀 때마다 서버를 다시 부르지 않아도 된다.
  */
  async visits() {
    // 캠페인 표는 화면의 일·주·월 단추와 상관없이 1년 전체 — 신청은 건수만 읽는다(campaign.server.ts)
    const [days, leads] = await Promise.all([getDailyStats(366), getLeadTallies()])
    return { days, campaigns: campaignRows(sum(days).sources, leads) }
  },

  async seo() {
    // 사실 계산과 순위 추림이 둘 다 "어떤 말을 노리나" 에 달려 있어 목록을 먼저 읽는다
    const keywords = await getSeoKeywords()
    // 추세는 길어야 4주라 60일치면 넉넉하다
    const [facts, config, history, todos] = await Promise.all([
      collectSeoFacts(keywords),
      getSeoConfig(keywords),
      getSeoHistory(60),
      getSeoTodos(),
    ])
    return { facts, config, keywords, history, todos, linksCountedAt: LINKS_COUNTED_AT }
  },

  /*
    문항별 조회수와 마지막으로 읽힌 날. 기록을 남기기 시작한 2026-09-09 부터 전부 —
    방문 기록은 Admin SDK 로만 읽을 수 있어 서버가 필요하다.
  */
  async wed100() {
    const [days, access] = await Promise.all([getDailyStats(366), getWed100Access()])
    const hits: Record<string, QnaHit> = {}
    for (const d of days) {
      for (const [k, n] of Object.entries(d.pages)) {
        if (!k.startsWith('_honjoo100_') || !n) continue
        const slug = k.slice('_honjoo100_'.length)
        // 목록 페이지 자체(_honjoo100_ 뒤가 빈 것)는 뺀다
        if (!slug) continue
        const h = (hits[slug] ??= { views: 0, last: null })
        h.views += n
        if (!h.last || d.date > h.last) h.last = d.date
      }
    }
    // 잠금이 꺼져 있으면 전부 열린 것이라 "무료" 를 따로 세울 이유가 없다
    return { hits, free: access.paywall ? access.freeQna : [] }
  },

  // 편집기의 읽기 전용 폴백 — 서버는 Admin SDK → 시드 순으로 읽는다(getWed100Items)
  async wed100Items() {
    return { items: await getWed100Items() }
  },

  /*
    매니저가 문항을 고르면 '지금' 칸이 저절로 채워져야 해서 답변 전문이 필요하다.
    유료 상품의 본문이므로 로그인 전 HTML 에 실리면 잠금이 무의미해진다.
    자막(cues)·음성 주소처럼 결재에 쓰이지 않는 것은 떼고 보낸다.
  */
  async proposals() {
    const items = await getPublishedWed100Items()
    return {
      questions: items.map((x) => ({
        slug: x.slug,
        question: x.question,
        answer: (x.answer ?? []).join('\n\n'),
      })),
    }
  },

  // GitHub 를 못 읽으면 그 판만 안 보이고 일지는 그대로 나온다
  async worklog() {
    const entries = getWorklog()
    return { entries, unlogged: unloggedCommits(entries, await fetchRepoCommits()) }
  },
}
