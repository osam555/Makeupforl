import { getPublishedColumns } from '@/lib/columns'
import { SITE_NAME, SITE_URL } from '@/lib/site'
import type { Column } from '@/types/column'

/**
 * CEO 칼럼 RSS 피드.
 *
 * 왜 사이트맵이 있는데 또 RSS 인가 — 네이버 때문이다. 네이버 서치어드바이저는
 * 사이트맵을 robots.txt 에서 알아서 잘 물어오지 않고, 새 글을 빨리 색인시키는
 * 표준 통로가 RSS 제출이다(웹마스터 도구 → 요청 → RSS). 구글은 사이트맵으로
 * 충분하지만 네이버 유입이 큰 이 사이트에선 RSS 가 실효 레버라 따로 낸다.
 *
 * 칼럼만 싣는 이유: 자주 늘어나고 전부 무료로 열린 콘텐츠라 본문까지 색인돼도
 * 손해가 없다. 100문100답은 유료라 본문을 안 내보내므로(제목만 색인) 피드에
 * 넣으면 잠긴 본문이 새 나가거나 빈 껍데기만 돌게 된다 — 그래서 뺀다.
 *
 * getPublishedColumns 가 Admin SDK 를 동적 import 하므로 nodejs 런타임이 필요하고,
 * 공개 페이지와 같은 한 시간 재검증을 탄다.
 */
export const runtime = 'nodejs'
export const revalidate = 3600

/** XML 텍스트 이스케이프 — 속성·요소 값 어디에나 안전하게 넣는다 */
function xml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** CDATA 로 감싼다 — 본문 HTML 을 그대로 싣되 "]]>" 만 갈라 깨지지 않게 한다 */
function cdata(s: string): string {
  return `<![CDATA[${s.replace(/]]>/g, ']]]]><![CDATA[>')}]]>`
}

/**
 * HTML 본문 속 글자 이스케이프.
 *
 * content:encoded 는 HTML 로 읽히므로 텍스트에서 &·<·> 만 막으면 된다.
 * 따옴표까지 &apos;/&quot; 로 바꾸면 HTML4 리더가 그 글자 그대로 보여 준다 —
 * 태그를 깨는 세 글자만 손대고 따옴표는 원래대로 둔다.
 */
function htmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** RSS 는 RFC-822 날짜를 쓴다. Date 의 toUTCString 이 그 규격이다 */
function rfc822(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toUTCString()
}

/** 한 편을 <item> 으로. description 은 요약, content:encoded 는 본문 전체 */
function itemXml(c: Column): string {
  const link = `${SITE_URL}/column/${c.slug}`
  const html = [c.lead, ...c.body].filter(Boolean).map((p) => `<p>${htmlText(p)}</p>`).join('')
  const parts = [
    `<title>${xml(c.title)}</title>`,
    `<link>${xml(link)}</link>`,
    // isPermaLink 을 명시해 링크가 곧 고유 ID 임을 알린다
    `<guid isPermaLink="true">${xml(link)}</guid>`,
    c.publishedAt ? `<pubDate>${rfc822(c.publishedAt)}</pubDate>` : '',
    `<description>${cdata(c.description)}</description>`,
    `<content:encoded>${cdata(html)}</content:encoded>`,
    ...(c.keywords ?? []).map((k) => `<category>${xml(k)}</category>`),
  ]
  return `    <item>\n${parts.filter(Boolean).map((p) => `      ${p}`).join('\n')}\n    </item>`
}

export async function GET(): Promise<Response> {
  const items = await getPublishedColumns()

  // lastBuildDate 는 실제 최신 글의 시각. 요청 때마다 '지금'을 넣으면 크롤러가 안 믿는다
  const latest = items
    .map((x) => x.updatedAt ?? x.publishedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)

  const feedUrl = `${SITE_URL}/feed.xml`
  const channel = [
    `<title>${xml(`${SITE_NAME} — CEO 칼럼`)}</title>`,
    `<link>${xml(`${SITE_URL}/column`)}</link>`,
    `<description>${xml('25년간 1만 명의 혼주를 만난 대표원장이 직접 쓰는 혼주 메이크업·한복·헤어 이야기.')}</description>`,
    `<language>ko</language>`,
    latest ? `<lastBuildDate>${rfc822(latest)}</lastBuildDate>` : '',
    `<atom:link href="${xml(feedUrl)}" rel="self" type="application/rss+xml" />`,
  ]

  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:atom="http://www.w3.org/2005/Atom">\n` +
    `  <channel>\n` +
    channel.filter(Boolean).map((c) => `    ${c}`).join('\n') +
    `\n` +
    items.map(itemXml).join('\n') +
    `\n  </channel>\n</rss>\n`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      // 공개 페이지와 같은 한 시간 캐시. 크롤러가 잦게 때려도 부담이 안 되게 한다
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
