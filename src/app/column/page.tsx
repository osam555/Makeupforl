import type { Metadata } from 'next'
import Link from 'next/link'

import { columnDateLabel, columnsMeta, getPublishedColumns } from '@/lib/columns'
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo'
import { OG_IMAGE, SITE_URL } from '@/lib/site'

export const revalidate = 3600

export const metadata: Metadata = {
  // 자기 주소를 정본으로 못 박는다 — 쿼리 붙은 유입도 한 주소로 모인다
  alternates: { canonical: '/column' },
  title: 'CEO 칼럼 | 메이크업포엘',
  description:
    '25년간 1만 명의 혼주를 만난 대표원장 김성희가 직접 쓰는 글. 상견례부터 예식 당일까지, 혼주 메이크업·한복·헤어를 준비하며 알아 두면 좋은 이야기.',
  keywords: '혼주메이크업 칼럼, 혼주 화장, 혼주 한복, 상견례 메이크업, 대표원장 칼럼, 강남 혼주메이크업',
  openGraph: {
    title: 'CEO 칼럼 | 메이크업포엘',
    description: '대표원장 김성희가 직접 쓰는 혼주 준비 이야기.',
    url: '/column',
    type: 'website',
    images: [OG_IMAGE],
  },
}

export default async function ColumnListPage() {
  const items = await getPublishedColumns()

  /*
    목록을 검색엔진에 통째로 알린다.
    CollectionPage + ItemList 로 넘기면 "무엇을 다루는 묶음인지"가 전해지고
    칼럼 상세로 내려가는 크롤이 빨라진다. (100문100답 목록과 같은 방식)
  */
  const latest = items
    .map((x) => x.updatedAt ?? x.publishedAt)
    .filter(Boolean)
    .sort()
    .at(-1)

  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/column#collection`,
    name: 'CEO 칼럼',
    inLanguage: 'ko',
    about: ['혼주메이크업', '혼주화장', '혼주한복', '혼주헤어'],
    publisher: { '@id': `${SITE_URL}/#business` },
    ...(latest ? { dateModified: latest } : {}),
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((x, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: x.title,
        url: `${SITE_URL}/column/${x.slug}`,
      })),
    },
  }
  const crumbs = breadcrumbJsonLd([{ name: 'CEO 칼럼', path: '/column' }])

  return (
    <div className="w100 bg-[var(--w-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbs, listJsonLd) }}
      />

      {/* 머리 */}
      <section className="bg-gradient-to-b from-[var(--w-bg1)] to-[var(--w-bg2)]">
        <div className="mx-auto max-w-4xl px-6 py-14 lg:px-8 lg:py-20">
          <p className="text-xs font-extrabold tracking-[0.34em] text-[var(--w-rose)]">CEO COLUMN</p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--w-ink)] sm:text-5xl">
            CEO 칼럼
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[var(--w-ink2)]">
            {columnsMeta.subtitle}. 상견례부터 예식 당일까지, 혼주를 준비하며 알아 두면 좋은
            이야기를 하나씩 적어 둡니다.
          </p>
        </div>
      </section>

      {/* 목록 */}
      <div className="mx-auto max-w-4xl px-6 py-12 lg:px-8">
        {items.length === 0 ? (
          <p className="text-[15px] text-[var(--w-ink2)]">아직 올린 글이 없습니다.</p>
        ) : (
          <ul className="space-y-5">
            {items.map((x) => (
              <li key={x.slug}>
                <Link
                  href={`/column/${x.slug}`}
                  className="group block rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)] p-6 transition hover:-translate-y-0.5 hover:border-[var(--w-rose)] hover:shadow-lg lg:p-7"
                >
                  {x.publishedAt && (
                    <p className="text-xs font-semibold text-[var(--w-mut)]">
                      {columnDateLabel(x.publishedAt)}
                    </p>
                  )}
                  <h2 className="mt-1.5 text-xl font-extrabold leading-snug text-[var(--w-ink)] group-hover:text-[var(--w-rose)] lg:text-2xl">
                    {x.title}
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[var(--w-ink2)]">
                    {x.description}
                  </p>
                  <p className="mt-3 text-sm font-bold text-[var(--w-rose)]">
                    이어 읽기 <span aria-hidden>→</span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 다음 걸음 — 무료 칼럼을 읽었다면 유료 상품으로 */}
        <div className="mt-14 rounded-xl border border-[var(--w-line)] bg-[var(--w-card2)] p-7 text-center">
          <p className="text-lg font-extrabold text-[var(--w-ink)]">더 자세한 답이 궁금하다면</p>
          <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-[var(--w-ink2)]">
            예약부터 예식 당일까지, 원장이 가장 많이 받은 질문에 하나씩 답한{' '}
            <Link href="/honjoo100" className="font-semibold text-[var(--w-rose)] hover:underline">
              혼주메이크업 100문 100답
            </Link>
            에서 이어 보실 수 있습니다.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/honjoo100"
              className="rounded-full bg-[var(--w-cta-bg)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              100문 100답 보기
            </Link>
            <Link
              href="/consultation"
              className="rounded-full border border-[var(--w-line)] bg-[var(--w-card)] px-6 py-3 text-sm font-bold text-[var(--w-ink)] transition hover:border-[var(--w-rose)]"
            >
              1:1 사전 컨설팅
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
