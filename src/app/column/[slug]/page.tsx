import type { Metadata } from 'next'
import Image from 'next/image'
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

      {/*
        대표 사진 (2026-09-22).

        글만 있는 칼럼은 열세 편이 전부 같은 회색 덩어리로 보였다. 50~60대 손님은
        본문을 읽기 전에 "여기가 어떤 샵인가"를 사진으로 먼저 판단한다. 새로 찍지 않고
        100문100답이 쓰는 사진 창고에서 내용에 맞는 것을 골라 쓴다 — 같은 얼굴이
        두 곳에 보여야 한 샵으로 읽힌다. 머리와 본문 사이에 두어 제목을 밀어내지 않는다.
      */}
      {item.heroImage && (
        <div className="mx-auto max-w-3xl px-6 pt-10 lg:px-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-[var(--w-thumb-bg)]">
            <Image
              src={item.heroImage}
              alt={`${item.title} — 메이크업포엘 혼주 메이크업`}
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
              priority
            />
          </div>
        </div>
      )}

      {/* 본문 */}
      <article className="mx-auto max-w-3xl px-6 py-12 lg:px-8">
        {/*
          본문 문단 — '## ' 로 시작하는 줄은 소제목(H2)으로 그린다 (2026-09-19).

          전에는 전부 <p> 라, 긴 글이 평평한 문단 더미가 됐다. 검색엔진은 소제목으로
          나뉜 글을 앞세우고(구글은 소제목을 '주요 구간' 으로도 뽑는다), 사람도 훑어
          읽을 자리가 있어야 끝까지 내려간다. 칼럼을 1,500자대로 늘리려면 먼저 이게
          있어야 했다.

          마크다운을 통째로 받지 않은 이유. 본문은 문단 배열(Column.body)이고 문항의
          answer[] 와 같은 모양을 지켜야 렌더러를 나눠 쓸 수 있다. 어드민에서 문단 앞에
          '## ' 만 붙이면 되므로 원장님이 새로 배울 것도 없다.
        */}
        <div className="space-y-5 text-[17px] leading-[1.9] text-[var(--w-body)]">
          {item.body.map((p, i) =>
            p.startsWith('## ') ? (
              <h2
                key={i}
                className="!mt-10 text-[21px] font-extrabold leading-snug text-[var(--w-ink)] sm:text-[23px]"
              >
                {p.slice(3).trim()}
              </h2>
            ) : (
              <p key={i}>{p}</p>
            ),
          )}
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
