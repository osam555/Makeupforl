import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'

import Wed100Player from '@/components/wed100/Wed100Player'
import type { PlayerNav } from '@/components/wed100/Wed100Player'
import {
  estimateDuration,
  formatDuration,
  getPublishedWed100Items,
  getWed100Item,
  getWed100Neighbors,
} from '@/lib/wed100'
import type { Wed100Item } from '@/types/wed100'

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

const norm = (s: string) => s.replace(/\s+/g, '')

/**
 * 자막 큐를 답변 문단에 다시 매핑해 문단이 시작하는 지점을 찾는다.
 * 자막은 문장 단위로 쪼개져 있어서 이대로 이어 붙이면 문단 구분이 사라진다.
 */
function paragraphStarts(answer: string[], cues: { ko: string }[]): number[] {
  const starts: number[] = []
  let para = 0
  let rest = norm(answer[0] ?? '')

  for (let i = 0; i < cues.length; i++) {
    const c = norm(cues[i].ko)
    if (!c) continue
    if (!rest.includes(c) && para + 1 < answer.length) {
      // 현재 문단에서 더 못 찾으면 다음 문단으로 넘어간 것으로 본다
      for (let j = para + 1; j < answer.length; j++) {
        if (norm(answer[j]).includes(c)) {
          para = j
          rest = norm(answer[j])
          starts.push(i)
          break
        }
      }
    }
    rest = rest.replace(c, '')
  }
  return starts
}

/** 키워드가 겹치는 문항을 추천한다. 바로 앞뒤 문항은 이미 플레이어에 있으니 뺀다. */
function relatedItems(
  item: Wed100Item,
  all: Wed100Item[],
  exclude: Set<string>,
  limit = 4,
): Wed100Item[] {
  const mine = new Set(item.keywords ?? [])
  const scored = all
    .filter((x) => x.slug !== item.slug && !exclude.has(x.slug))
    .map((x) => {
      const overlap = (x.keywords ?? []).filter((k) => mine.has(k)).length
      // 키워드가 같을수록, 그다음은 같은 파트일수록 위로
      return { x, score: overlap * 10 + (x.part === item.part ? 1 : 0) }
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.x.part - b.x.part || a.x.n - b.x.n)
    .map((r) => r.x)

  if (scored.length >= limit) return scored.slice(0, limit)
  // 겹치는 키워드가 부족하면 같은 파트에서 채운다
  const filler = all.filter(
    (x) => x.part === item.part && x.slug !== item.slug && !exclude.has(x.slug) && !scored.includes(x),
  )
  return [...scored, ...filler].slice(0, limit)
}

function toNav(x: Wed100Item | null | undefined): PlayerNav | null {
  if (!x) return null
  return {
    slug: x.slug,
    question: x.question,
    thumb: x.thumbImage ?? `/wed100/img/${x.slug}-thumb.svg`,
    href: `/honjoo100/${x.slug}`,
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

  const exclude = new Set([prev?.slug, next?.slug].filter(Boolean) as string[])
  const related = relatedItems(item, all, exclude)

  // 파트 안에서의 위치
  const samePart = all.filter((x) => x.part === item.part)
  const partIndex = samePart.findIndex((x) => x.slug === item.slug) + 1

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
        <nav className="pr-12 text-xs text-[var(--w-ink2)] lg:pr-14">
          <Link href="/honjoo100" className="hover:text-[var(--w-rose)]">
            혼주메이크업 100문100답
          </Link>
          <span className="mx-1.5 text-[var(--w-mut)]">›</span>
          <span style={{ color: `var(--w-p${item.part})` }}>
            {item.part === 0 ? '프롤로그' : item.part === 7 ? '에필로그' : `PART ${item.part}`}
          </span>
          <span className="mx-1.5 text-[var(--w-mut)]">›</span>
          <span className="text-[var(--w-ink2)]">{item.question}</span>
          <span className="ml-2 font-semibold text-[var(--w-ink2)]">
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
          paraStarts={paragraphStarts(item.answer, item.cues)}
          keywords={item.keywords}
          heroImage={item.heroImage ?? `/wed100/img/${item.slug}-hero.svg`}
          audio={item.audio}
          questionAudio={item.questionAudio}
          duration={estimateDuration(item)}
          prev={toNav(prev)}
          next={toNav(next)}
          partIndex={partIndex}
          partTotal={samePart.length}
        />
      </div>

      {/* 관련 질문 */}
      {related.length > 0 && (
        <section className="bg-[var(--w-card)]">
          <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
            <h2 className="text-lg font-extrabold text-[var(--w-ink)]">함께 보면 좋은 질문</h2>
            <p className="mt-1 text-xs text-[var(--w-ink2)]">
              지금 질문과 키워드가 겹치는 문항입니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {related.map((x) => (
                <Link
                  key={x.slug}
                  href={`/honjoo100/${x.slug}`}
                  className="overflow-hidden rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)] transition hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="relative aspect-square bg-[var(--w-thumb-bg)]">
                    <Image
                      src={x.thumbImage ?? `/wed100/img/${x.slug}-thumb.svg`}
                      alt={x.question}
                      fill
                      sizes="(max-width:1024px) 45vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p
                      className="text-[10px] font-extrabold tracking-[0.13em]"
                      style={{ color: `var(--w-p${x.part})` }}
                    >
                      {x.part === 0
                        ? 'PROLOGUE'
                        : x.part === 7
                          ? 'EPILOGUE'
                          : `PART ${x.part} · ${String(x.n).padStart(2, '0')}`}
                    </p>
                    <h3 className="mt-1.5 line-clamp-3 text-sm font-bold leading-snug text-[var(--w-ink)]">
                      {x.question}
                    </h3>
                    <p className="mt-2 text-[11px] text-[var(--w-ink2)]">
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
