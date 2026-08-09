import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import Wed100Player from '@/components/wed100/Wed100Player'
import {
  estimateDuration,
  formatDuration,
  getPublishedWed100Items,
  getWed100Item,
  getWed100Neighbors,
} from '@/lib/wed100'

export const revalidate = 3600

export async function generateStaticParams() {
  const items = await getPublishedWed100Items()
  return items.map((x) => ({ slug: x.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const item = await getWed100Item(slug)
  if (!item) return { title: '혼주메이크업 100문 100답 | 메이크업포엘' }
  const desc = item.cues.slice(0, 2).map((c) => c.ko).join(' ').slice(0, 150)
  return {
    title: `${item.question} | 혼주메이크업 100문 100답`,
    description: desc,
    keywords: ['혼주메이크업', ...item.keywords].join(', '),
    openGraph: {
      title: item.question,
      description: desc,
      images: [item.heroImage ?? `/wed100/img/${item.slug}-hero.svg`],
      type: 'article',
    },
  }
}

export default async function Wed100DetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const item = await getWed100Item(slug)
  if (!item || item.published === false) notFound()

  const { prev, next, index, total } = await getWed100Neighbors(slug)
  const all = await getPublishedWed100Items()
  const related = all.filter((x) => x.part === item.part && x.slug !== item.slug).slice(0, 4)

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer.join('\n\n') },
      },
    ],
  }

  return (
    <div className="bg-[var(--w-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-6 pt-6 lg:px-8">
        <nav className="text-xs text-[var(--w-mut2)]">
          <Link href="/wed100" className="hover:text-[var(--w-rose)]">
            혼주메이크업 100문100답
          </Link>
          <span className="mx-1.5">›</span>
          <span style={{ color: `var(--w-p${item.part})` }}>PART {item.part}</span>
          <span className="mx-1.5">›</span>
          <span className="text-[var(--w-ink2)]">{item.question}</span>
          <span className="ml-2 text-[var(--w-mut2)]">
            ({index + 1}/{total})
          </span>
        </nav>
      </div>

      <div className="mx-auto max-w-7xl px-6 py-6 lg:px-8">
        <Wed100Player
          slug={item.slug}
          part={item.part}
          partTitle={item.partTitle}
          n={item.n}
          question={item.question}
          questionEn={item.question_en ?? ''}
          cues={item.cues}
          heroImage={item.heroImage ?? `/wed100/img/${item.slug}-hero.svg`}
          audio={item.audio}
          questionAudio={item.questionAudio}
          duration={estimateDuration(item)}
          prevHref={prev ? `/wed100/${prev.slug}` : null}
          nextHref={next ? `/wed100/${next.slug}` : null}
        />
      </div>

      {/* 본문 (SEO + 읽기용) */}
      <section className="bg-[var(--w-card)]">
        <div className="mx-auto max-w-3xl px-6 py-14 lg:px-8">
          <h2 className="text-xl font-extrabold text-[var(--w-ink)]">원장님 답변 전문</h2>
          <div className="mt-6 space-y-5">
            {item.answer.map((para, i) => (
              <p
                key={i}
                className="whitespace-pre-line text-[15px] leading-[1.95] text-[var(--w-body)]"
              >
                {para}
              </p>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            {item.keywords.map((k) => (
              <span key={k} className="rounded-md bg-[var(--w-rose-l)] px-2.5 py-1 text-xs text-[var(--w-rose-t)]">
                #{k}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* 이전/다음 */}
      <div className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="grid gap-3 sm:grid-cols-2">
          {prev ? (
            <Link
              href={`/wed100/${prev.slug}`}
              className="rounded-xl border border-[var(--w-line)] bg-[var(--w-card)] p-4 transition hover:shadow-md"
            >
              <p className="text-[11px] font-bold text-[var(--w-mut2)]">← 이전</p>
              <p className="mt-1.5 text-sm font-bold text-[var(--w-ink)]">{prev.question}</p>
            </Link>
          ) : (
            <span />
          )}
          {next && (
            <Link
              href={`/wed100/${next.slug}`}
              className="rounded-xl border border-[var(--w-line)] bg-[var(--w-card)] p-4 text-right transition hover:shadow-md"
            >
              <p className="text-[11px] font-bold text-[var(--w-mut2)]">다음 →</p>
              <p className="mt-1.5 text-sm font-bold text-[var(--w-ink)]">{next.question}</p>
            </Link>
          )}
        </div>
      </div>

      {/* 관련 질문 */}
      {related.length > 0 && (
        <section className="bg-[var(--w-card)]">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <h2 className="text-lg font-extrabold text-[var(--w-ink)]">이어서 들으면 좋은 질문</h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((x) => (
                <Link
                  key={x.slug}
                  href={`/wed100/${x.slug}`}
                  className="overflow-hidden rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)] transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-square bg-[var(--w-thumb-bg)]">
                    <Image
                      src={x.thumbImage ?? `/wed100/img/${x.slug}-thumb.svg`}
                      alt={x.question}
                      fill
                      sizes="25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p
                      className="text-[10px] font-extrabold tracking-[0.13em]"
                      style={{ color: `var(--w-p${x.part})` }}
                    >
                      PART {x.part} · {String(x.n).padStart(2, '0')}
                    </p>
                    <h3 className="mt-1.5 line-clamp-3 text-sm font-bold leading-snug text-[var(--w-ink)]">
                      {x.question}
                    </h3>
                    <p className="mt-2 text-[11px] text-[var(--w-mut2)]">
                      🎧 {formatDuration(estimateDuration(x))}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
