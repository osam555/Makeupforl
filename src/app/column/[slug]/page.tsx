import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { columnDateLabel, getColumn, getPublishedColumns } from '@/lib/columns'
import { findHub } from '@/lib/hubs'
import { BUSINESS, breadcrumbJsonLd, jsonLdScript } from '@/lib/seo'
import { OG_IMAGE, SITE_URL } from '@/lib/site'
import { getPublishedWed100Items } from '@/lib/wed100'

type Params = { params: Promise<{ slug: string }> }

export const revalidate = 3600

export async function generateStaticParams() {
  const items = await getPublishedColumns()
  return items.map((x) => ({ slug: x.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params
  const item = await getColumn(slug)
  if (!item) return { title: 'CEO 칼럼 | 메이크업포엘' }
  return {
    title: `${item.title} | CEO 칼럼`,
    description: item.description,
    keywords: item.keywords.join(', '),
    alternates: { canonical: `/column/${slug}` },
    openGraph: {
      title: item.title,
      description: item.description,
      url: `/column/${slug}`,
      type: 'article',
      images: [item.heroImage ? { url: item.heroImage } : OG_IMAGE],
    },
  }
}

export default async function ColumnDetailPage({ params }: Params) {
  const { slug } = await params
  const item = await getColumn(slug)
  if (!item || item.published === false) notFound()

  // 본문에서 이어 줄 허브·문항을 실제로 있는 것만 남긴다 (없는 slug 는 조용히 버린다)
  const hubs = (item.relatedHubs ?? [])
    .map((s) => findHub(s))
    .filter((h): h is NonNullable<typeof h> => Boolean(h))

  const qnaAll = item.relatedQna?.length ? await getPublishedWed100Items() : []
  const qnaBySlug = new Map(qnaAll.map((x) => [x.slug, x]))
  const qna = (item.relatedQna ?? [])
    .map((s) => qnaBySlug.get(s))
    .filter((x): x is NonNullable<typeof x> => Boolean(x))

  const modified = item.updatedAt ?? item.publishedAt

  /*
    이 글의 값어치는 "25년 동안 1만 명을 만난 사람이 직접 썼다"는 데 있다.
    100문100답 문항이 Article 로 저자를 밝히듯, 칼럼은 BlogPosting 으로 밝힌다 —
    시의성 글이라 블로그 엔티티가 검색엔진에 더 맞는다. publisher 는 사업자
    스키마(@id)를 참조해 저자·발행자 신뢰 그래프를 잇는다.
  */
  const blogPosting = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${SITE_URL}/column/${item.slug}#article`,
    headline: item.title,
    description: item.description,
    inLanguage: 'ko',
    mainEntityOfPage: `${SITE_URL}/column/${item.slug}`,
    author: { '@type': 'Person', name: item.author || BUSINESS.founder, jobTitle: '대표원장' },
    publisher: { '@id': `${SITE_URL}/#business` },
    ...(item.heroImage ? { image: `${SITE_URL}${item.heroImage}` } : {}),
    ...(item.publishedAt ? { datePublished: item.publishedAt } : {}),
    ...(modified ? { dateModified: modified } : {}),
    isAccessibleForFree: true,
    articleBody: item.body.join('\n\n'),
  }

  const crumbs = breadcrumbJsonLd([
    { name: 'CEO 칼럼', path: '/column' },
    { name: item.title, path: `/column/${item.slug}` },
  ])

  return (
    <div className="w100 bg-[var(--w-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbs, blogPosting) }}
      />

      {/* 머리 */}
      <section className="bg-gradient-to-b from-[var(--w-bg1)] to-[var(--w-bg2)]">
        <div className="mx-auto max-w-3xl px-6 py-14 lg:px-8 lg:py-20">
          <nav className="text-xs text-[var(--w-ink2)]">
            <Link href="/column" className="hover:text-[var(--w-rose)]">
              CEO 칼럼
            </Link>
            <span className="mx-1.5 text-[var(--w-mut)]">›</span>
            <span>{item.title}</span>
          </nav>

          <h1 className="mt-4 text-3xl font-black leading-tight text-[var(--w-ink)] sm:text-4xl">
            {item.title}
          </h1>
          {item.lead && <p className="mt-4 text-xl font-bold text-[var(--w-rose)]">{item.lead}</p>}
          <p className="mt-5 text-sm text-[var(--w-mut)]">
            {item.author || BUSINESS.founder} 대표원장
            {item.publishedAt && ` · ${columnDateLabel(item.publishedAt)}`}
          </p>
        </div>
      </section>

      {/* 본문 */}
      <article className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
        <div className="space-y-5 text-[17px] leading-[1.9] text-[var(--w-body)]">
          {item.body.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        {/* 이어 읽기 — 허브(무료 글)와 문항(유료 답)으로 보낸다 */}
        {(hubs.length > 0 || qna.length > 0) && (
          <div className="mt-12 rounded-xl border border-[var(--w-line)] bg-[var(--w-card)] p-6 lg:p-7">
            <p className="text-xs font-bold tracking-wider text-[var(--w-mut)]">이어서 읽어 보세요</p>

            {hubs.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {hubs.map((h) => (
                  <Link
                    key={h.slug}
                    href={`/${h.slug}`}
                    className="rounded-full border border-[var(--w-line)] bg-[var(--w-bg)] px-4 py-2 text-sm font-bold text-[var(--w-ink)] transition hover:border-[var(--w-rose)] hover:text-[var(--w-rose)]"
                  >
                    {h.slug} <span aria-hidden>→</span>
                  </Link>
                ))}
              </div>
            )}

            {qna.length > 0 && (
              <ul className="mt-4 space-y-2.5">
                {qna.map((x) => (
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
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* 다음 걸음 — 상담으로 */}
        <div className="mt-10 rounded-xl border border-[var(--w-line)] bg-[var(--w-card2)] p-7 text-center">
          <p className="text-lg font-extrabold text-[var(--w-ink)]">
            얼굴은 저마다 다릅니다
          </p>
          <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-[var(--w-ink2)]">
            글로 다 담기 어려운 것은 얼굴을 직접 봐야 정해집니다. 1:1 사전 컨설팅에서 원장이 직접
            진단해 드립니다.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/consultation"
              className="rounded-full bg-[var(--w-cta-bg)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
            >
              1:1 사전 컨설팅
            </Link>
            <Link
              href="/reservation"
              className="rounded-full border border-[var(--w-line)] bg-[var(--w-card)] px-6 py-3 text-sm font-bold text-[var(--w-ink)] transition hover:border-[var(--w-rose)]"
            >
              예약 안내
            </Link>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-[var(--w-mut)]">
          <Link href="/column" className="font-semibold text-[var(--w-rose)] hover:underline">
            ← CEO 칼럼 목록으로
          </Link>
        </p>
      </article>
    </div>
  )
}
