import type { Metadata } from 'next'
import Link from 'next/link'

import Wed100Browser from '@/components/wed100/Wed100Browser'
import { getPublishedWed100Items, wed100Meta, wed100Parts } from '@/lib/wed100'
import { getSiteImages } from '@/lib/siteImages'

export const metadata: Metadata = {
  title: '혼주메이크업 100문 100답 | 메이크업포엘',
  description:
    '결혼식 날, 후회하면 늦습니다. 25년간 1만 명의 혼주님을 만난 대표원장 김성희가 가장 많이 받은 질문에 답합니다. 예약·사전컨설팅·메이크업·헤어·한복·예식 당일까지.',
  keywords:
    '혼주메이크업, 혼주화장, 혼주헤어, 어머니 메이크업, 혼주 올림머리, 한복 메이크업, 강남 혼주메이크업, 혼주 메이크업 가격',
  openGraph: {
    title: '혼주메이크업 100문 100답 | 메이크업포엘',
    description: '결혼식 날, 후회하면 늦습니다. 혼주님이 가장 많이 묻는 질문에 원장이 직접 답합니다.',
    type: 'article',
  },
}

export default async function Wed100Page() {
  const items = await getPublishedWed100Items()
  const img = await getSiteImages()
  const counts = new Map<number, number>()
  items.forEach((x) => counts.set(x.part, (counts.get(x.part) ?? 0) + 1))
  const totalSec = items.reduce(
    (a, x) => a + (x.duration ?? x.cues.reduce((b, c) => b + c.ko.length, 0) / 5.2 + 6),
    0,
  )

  return (
    <div className="bg-[var(--w-bg)]">
      {/* 히어로 */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[var(--w-bg1)] to-[var(--w-bg2)]">
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-[520px] w-[520px] rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(circle, #F0DAE1 0%, transparent 70%)' }}
        />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 gap-8 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-end lg:gap-8 lg:px-8 lg:pb-0 lg:pt-12">
          <div>
          <p className="text-xs font-extrabold tracking-[0.34em] text-[var(--w-rose)]">
            HONJU MAKEUP · Q&amp;A {items.filter((x) => x.part >= 1 && x.part <= 6).length}
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight text-[var(--w-ink)] sm:text-5xl">
            혼주메이크업
            <br />
            100문 100답
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-[var(--w-ink2)]">
            {wed100Meta.subtitle}.
            <br />
            25년간 1만 명의 혼주님을 만난 원장이 가장 많이 받은 질문에 하나씩 답했습니다.
          </p>
          <p className="mt-5 text-sm text-[var(--w-mut)]">
            {wed100Meta.author} · 예약 준비부터 예식 당일까지{' '}
            {wed100Parts.filter((p) => p.part >= 1 && p.part <= 6).length}개 파트
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {items[0] && (
              <Link
                href={`/honjoo100/${items[0].slug}`}
                className="rounded-xl bg-[var(--w-rose)] px-6 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-[var(--w-rose-d)]"
              >
                ▶ 처음부터 듣기
              </Link>
            )}
            <Link
              href="/consultation"
              className="rounded-xl border border-[var(--w-line)] bg-[var(--w-card)] px-6 py-3.5 text-sm font-bold text-[var(--w-ink)] transition hover:border-[var(--w-line)]"
            >
              1:1 사전컨설팅 예약
            </Link>
            <Link
              href="tel:02-323-3321"
              className="rounded-xl border border-[var(--w-line)] bg-[var(--w-card)] px-6 py-3.5 text-sm font-bold text-[var(--w-ink)] transition hover:border-[var(--w-line)]"
            >
              02-323-3321
            </Link>
          </div>

          <dl className="mt-8 flex flex-wrap gap-x-10 gap-y-4">
            {[
              [String(items.filter((x) => x.part >= 1 && x.part <= 6).length), '질문'],
              [String(wed100Parts.filter((p) => p.part >= 1 && p.part <= 6).length), '파트'],
              [`약 ${Math.round(totalSec / 60)}분`, '오디오'],
              ['한 / EN', '자막'],
            ].map(([v, l]) => (
              <div key={l}>
                <dt className="text-2xl font-black text-[var(--w-rose)]">{v}</dt>
                <dd className="text-xs text-[var(--w-ink2)]">{l}</dd>
              </div>
            ))}
          </dl>
          </div>

          {/* 우측 비주얼 — 원장 사진 + 지금 듣기 카드 */}
          <div className="relative hidden lg:block lg:h-[400px]">
            <div
              className="pointer-events-none absolute bottom-0 right-0 h-[440px] w-[440px] rounded-full opacity-70 blur-3xl"
              style={{ background: 'radial-gradient(circle, var(--w-rose-l) 0%, transparent 70%)' }}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img['ceo'] || '/mfl/images/sub/ceo.png'}
              alt="메이크업포엘 대표원장 김성희"
              width={327}
              height={400}
              className="absolute bottom-0 right-0 h-[400px] w-[327px] object-contain object-bottom"
            />
            {items[0] && (
              <Link
                href={`/honjoo100/${items[0].slug}`}
                className="group absolute bottom-2 -left-8 w-[290px] rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)]/95 p-4 shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl"
              >
                <p className="text-[10px] font-extrabold tracking-[0.22em] text-[var(--w-rose)]">
                  NOW PLAYING ·{' '}
                  {items[0].part === 0
                    ? 'PROLOGUE'
                    : items[0].part === 7
                      ? 'EPILOGUE'
                      : `PART ${items[0].part}`}
                </p>
                <p className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-[var(--w-ink)]">
                  {items[0].question}
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--w-rose)] text-[11px] text-white transition group-hover:bg-[var(--w-rose-d)]">
                    ▶
                  </span>
                  <span className="flex h-8 flex-1 items-end gap-[3px]" aria-hidden>
                    {[6, 13, 9, 20, 14, 26, 18, 30, 22, 15, 24, 11, 19, 8, 14, 21, 10, 16, 7, 12].map(
                      (h, i) => (
                        <i
                          key={i}
                          className="block w-[3px] rounded-full bg-[var(--w-rose)] opacity-45"
                          style={{ height: `${h}px` }}
                        />
                      ),
                    )}
                  </span>
                </div>
                <p className="mt-2 text-[11px] text-[var(--w-mut)]">
                  전체 약 {Math.round(totalSec / 60)}분 · 한/EN 자막
                </p>
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* 파트 */}
      <section className="bg-[var(--w-card)]">
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8">
          <h2 className="text-2xl font-extrabold text-[var(--w-ink)]">어디부터 궁금하세요?</h2>
          <p className="mt-2 text-sm text-[var(--w-ink2)]">
            준비 순서 그대로 {wed100Parts.filter((p) => p.part >= 1 && p.part <= 6).length}개 파트로 나눴습니다.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wed100Parts.filter((p) => p.part >= 1 && p.part <= 6).map((p) => {
              return (
                <a
                  key={p.part}
                  href={`#part-${p.part}`}
                  className="rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)] p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ borderTopColor: `var(--w-p${p.part})`, borderTopWidth: 3 }}
                >
                  <p className="text-[11px] font-extrabold tracking-[0.22em]" style={{ color: `var(--w-p${p.part})` }}>
                    PART {p.part}
                  </p>
                  <h3 className="mt-2 text-base font-bold text-[var(--w-ink)]">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[var(--w-ink2)]">
                    {p.intro[0] ?? ''}
                  </p>
                  <p className="mt-3 text-xs font-bold" style={{ color: `var(--w-p${p.part})` }}>
                    {counts.get(p.part) ?? 0}개 질문 →
                  </p>
                </a>
              )
            })}
          </div>
        </div>
      </section>

      {/* 검색 + 목록 */}
      {/* 화면이 넓어지면 카드 한 줄에 5개까지 들어가도록 이 구역만 더 넓게 쓴다 */}
      <section className="mx-auto max-w-7xl px-6 py-14 lg:px-8 2xl:max-w-[1560px]">
        <h2 className="text-2xl font-extrabold text-[var(--w-ink)]">질문 찾아보기</h2>
        <Wed100Browser
          items={items.map((x) => ({
            slug: x.slug,
            part: x.part,
            n: x.n,
            question: x.question,
            question_en: x.question_en ?? '',
            keywords: x.keywords,
            thumbImage: x.thumbImage!,
            duration: x.duration ?? Math.round(x.cues.reduce((a, c) => a + c.ko.length, 0) / 5.2 + 6),
            hasAudio: !!x.audio,
          }))}
          parts={wed100Parts
            .filter((p) => (p.part >= 1 && p.part <= 6) || (counts.get(p.part) ?? 0) > 0)
            .map((p) => ({ part: p.part, title: p.title }))}
        />
      </section>

      {/* 하단 CTA */}
      <section className="bg-[var(--w-cta-bg)]">
        <div className="mx-auto max-w-7xl px-6 py-14 text-center lg:px-8">
          <h2 className="text-2xl font-extrabold text-white">
            읽고 들으셨다면, 이제 얼굴을 직접 봐야 합니다
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-[#C9BDB6]">
            혼주 메이크업은 얼굴 골격·피부 상태·한복 색에 따라 답이 달라집니다.
            <br />
            1:1 사전 컨설팅에서 원장이 직접 진단해 드립니다.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/consultation"
              className="rounded-xl bg-[var(--w-rose)] px-6 py-3.5 text-sm font-bold text-white hover:bg-[var(--w-rose-d)]"
            >
              1:1 사전컨설팅 예약
            </Link>
            <Link
              href="/reservation"
              className="rounded-xl border border-[#544944] px-6 py-3.5 text-sm font-bold text-white hover:bg-[#3A322F]"
            >
              예약 안내 보기
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
