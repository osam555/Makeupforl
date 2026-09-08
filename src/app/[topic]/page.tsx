import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { HUBS, findHub } from '@/lib/hubs'
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo'
import { SITE_URL } from '@/lib/site'
import { getPublishedWed100Items } from '@/lib/wed100'
import { isOpen } from '@/lib/wed100Access'
import { getWed100Access } from '@/lib/wed100Access.server'

type Params = { params: Promise<{ topic: string }> }

export const revalidate = 3600

/*
  주소를 한 칸으로 둔다 — /혼주한복.

  검색어를 그대로 주소로 쓰면 검색엔진에도, 링크를 보는 사람에게도 이 페이지가
  무엇에 대한 것인지 바로 전해진다. 목록에 없는 말은 dynamicParams:false 로
  전부 404 가 되므로, 이 한 칸짜리 경로가 다른 주소를 삼킬 일은 없다.
  (Next 는 /brand 같은 고정 경로를 동적 경로보다 먼저 맞춘다)
*/
export const dynamicParams = false

export function generateStaticParams() {
  return HUBS.map((h) => ({ topic: h.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { topic } = await params
  const hub = findHub(decodeURIComponent(topic))
  if (!hub) return {}
  return {
    title: hub.title,
    description: hub.description,
    keywords: hub.keywords.join(', '),
    alternates: { canonical: `/${hub.slug}` },
    openGraph: {
      title: hub.title,
      description: hub.description,
      url: `/${hub.slug}`,
      type: 'article',
    },
  }
}

export default async function HubPage({ params }: Params) {
  const { topic } = await params
  const hub = findHub(decodeURIComponent(topic))
  if (!hub) notFound()

  const items = await getPublishedWed100Items()
  const access = await getWed100Access()
  const bySlug = new Map(items.map((x) => [x.slug, x]))

  // 절마다 실제로 존재하는 문항만 남긴다. 원고에서 문항이 빠져도 화면이 깨지지 않게.
  const sections = hub.sections.map((s) => ({
    ...s,
    items: s.slugs.map((sl) => bySlug.get(sl)).filter((x): x is NonNullable<typeof x> => Boolean(x)),
  }))

  /*
    검색 결과에 답이 함께 뜨도록 FAQ 로 알린다.
    잠긴 문항은 본문을 넘기지 않는다 — 화면에 없는 것을 크롤러에만 주면 안 된다.
  */
  const faqItems = sections
    .flatMap((s) => s.items)
    .filter((x) => isOpen(access, x.slug))
    .slice(0, 10)

  const jsonLd = [
    breadcrumbJsonLd([
      { name: '혼주메이크업 100문100답', path: '/honjoo100' },
      { name: hub.slug, path: `/${hub.slug}` },
    ]),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      inLanguage: 'ko',
      publisher: { '@id': `${SITE_URL}/#business` },
      mainEntity: faqItems.map((x) => ({
        '@type': 'Question',
        name: x.question,
        acceptedAnswer: { '@type': 'Answer', text: x.answer.join('\n\n') },
      })),
    },
  ]

  return (
    <div className="w100 bg-[var(--w-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(...jsonLd) }}
      />

      {/* 머리 */}
      <section className="bg-gradient-to-b from-[var(--w-bg1)] to-[var(--w-bg2)]">
        <div className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-20">
          <nav className="text-xs text-[var(--w-ink2)]">
            <Link href="/honjoo100" className="hover:text-[var(--w-rose)]">
              혼주메이크업 100문100답
            </Link>
            <span className="mx-1.5 text-[var(--w-mut)]">›</span>
            <span>{hub.slug}</span>
          </nav>

          <h1 className="mt-4 text-4xl font-black leading-tight text-[var(--w-ink)] sm:text-5xl">
            {hub.slug}
          </h1>
          <p className="mt-4 text-xl font-bold text-[var(--w-rose)]">{hub.lead}</p>

          <div className="mt-6 space-y-4 text-[17px] leading-[1.85] text-[var(--w-body)]">
            {hub.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* 본문 */}
      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
        <div className="space-y-14">
          {sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-2xl font-extrabold leading-snug text-[var(--w-ink)]">{s.h}</h2>

              <div className="mt-4 space-y-4 text-[16.5px] leading-[1.85] text-[var(--w-body)]">
                {s.body.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
              </div>

              {s.items.length > 0 && (
                <div className="mt-6 rounded-lg border border-[var(--w-line)] bg-[var(--w-card)] p-5">
                  <p className="text-xs font-bold tracking-wider text-[var(--w-mut)]">
                    이 내용을 더 자세히 답한 문항
                  </p>
                  <ul className="mt-3 space-y-2.5">
                    {s.items.map((x) => (
                      <li key={x.slug}>
                        <Link
                          href={`/honjoo100/${x.slug}`}
                          className="group flex gap-2.5 text-[15px] leading-snug text-[var(--w-ink)] hover:text-[var(--w-rose)]"
                        >
                          <span
                            className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: `var(--w-p${x.part})` }}
                          />
                          <span className="font-semibold group-hover:underline">{x.question}</span>
                          {/*
                            잠긴 문항인지 미리 알려 준다. 눌러 보고 막히는 것보다 낫다.
                            잠금이 꺼져 있으면 전부 무료라 표시할 이유가 없다 — 그때는 달지 않는다.
                          */}
                          {access.paywall && isOpen(access, x.slug) ? (
                            <span className="mt-0.5 shrink-0 rounded-sm border border-[var(--w-p4)] px-1.5 py-px text-[10px] font-bold text-[var(--w-p4)]">
                              무료
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>

        {/* 다음 걸음 */}
        <div className="mt-16 rounded-xl border border-[var(--w-line)] bg-[var(--w-card2)] p-7 text-center">
          <p className="text-lg font-extrabold text-[var(--w-ink)]">
            한복을 정하기 전에 한 번 물어보세요
          </p>
          <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-[var(--w-ink2)]">
            저고리 색을 정하고 나면 되돌리기 어렵습니다. 1:1 사전 컨설팅에서 안색에 맞는 색부터
            함께 봅니다.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/consultation"
              className="rounded-full bg-[var(--w-cta-bg)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              사전 컨설팅 안내
            </Link>
            <Link
              href="/reservation"
              className="rounded-full border border-[var(--w-line)] bg-[var(--w-card)] px-6 py-3 text-sm font-bold text-[var(--w-ink)] transition hover:border-[var(--w-rose)]"
            >
              예약 문의
            </Link>
            <Link
              href={hub.gallery.href}
              className="rounded-full border border-[var(--w-line)] bg-[var(--w-card)] px-6 py-3 text-sm font-bold text-[var(--w-ink)] transition hover:border-[var(--w-rose)]"
            >
              {hub.gallery.label}
            </Link>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-[var(--w-mut)]">
          이 글은{' '}
          <Link href="/honjoo100" className="font-semibold text-[var(--w-rose)] hover:underline">
            혼주메이크업 100문 100답
          </Link>
          에서 대표원장 김성희가 답한 내용을 주제별로 모은 것입니다.
        </p>
      </div>
    </div>
  )
}
