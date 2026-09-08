import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import Wed100Account from '@/components/wed100/Wed100Account'
import Wed100Browser from '@/components/wed100/Wed100Browser'
import NowPlayingRotator from '@/components/wed100/NowPlayingRotator'
import { HOME_HERO_QNA_SLUGS } from '@/lib/brandPoints'
import { getPublishedWed100Items, teaser, wed100Meta, wed100Parts } from '@/lib/wed100'
import { getSiteImages } from '@/lib/siteImages'
import { isOpen } from '@/lib/wed100Access'
import { getWed100Access } from '@/lib/wed100Access.server'
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  // 자기 주소를 정본으로 못 박는다. 쿼리스트링이 붙은 유입도 한 주소로 모인다.
  alternates: { canonical: '/honjoo100' },
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
  const access = await getWed100Access()
  // 히어로 카드에 돌려 보여줄 대표 문항. 지정한 것 우선, 모자라면 앞에서부터 채운다
  const heroPicks = [
    ...HOME_HERO_QNA_SLUGS.map((sl) => items.find((x) => x.slug === sl)),
    ...items.filter((x) => x.part >= 1 && x.part <= 6),
  ]
    .filter((x): x is (typeof items)[number] => Boolean(x))
    .filter((x, n, a) => a.findIndex((y) => y.slug === x.slug) === n)
    .slice(0, 5)

  const counts = new Map<number, number>()
  items.forEach((x) => counts.set(x.part, (counts.get(x.part) ?? 0) + 1))
  const totalSec = items.reduce(
    (a, x) => a + (x.duration ?? x.cues.reduce((b, c) => b + c.ko.length, 0) / 5.2 + 6),
    0,
  )

  /*
    목록을 검색엔진에 통째로 알린다.

    102개 문항이 이 페이지 한 장에 매달려 있다. 링크만 두면 크롤러는 순서도
    총량도 모른다. ItemList 로 넘기면 "무엇을 다루는 묶음인지"가 전달되고,
    문항 페이지로 내려가는 크롤이 빨라진다.
  */
  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/honjoo100#collection`,
    name: '혼주메이크업 100문 100답',
    inLanguage: 'ko',
    about: ['혼주메이크업', '혼주화장', '혼주헤어', '한복 메이크업'],
    publisher: { '@id': `${SITE_URL}/#business` },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.map((x, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: x.question,
        url: `${SITE_URL}/honjoo100/${x.slug}`,
      })),
    },
  }
  const crumbs = breadcrumbJsonLd([{ name: '혼주메이크업 100문100답', path: '/honjoo100' }])

  return (
    <div className="bg-[var(--w-bg)]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(crumbs, listJsonLd) }}
      />
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

          {/* 좁은 화면 — 오른쪽 비주얼(원장 사진 + 카드)이 lg 이상에서만 보여서
              아이패드·모바일에서는 문항 회전이 아예 안 보였다. 본문 흐름에 넣어준다 */}
          <div className="mt-8 lg:hidden">
            <NowPlayingRotator
              items={heroPicks.map((x) => ({ slug: x.slug, question: x.question, part: x.part }))}
              totalMinutes={Math.round(totalSec / 60)}
              className="w-full max-w-[360px]"
            />
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
            {/*
              첫 화면에 뜨는 사진이라 이 페이지의 LCP 다. 원본 PNG 가 200KB 인데
              실제로는 327px 폭으로 그려진다. next/image 로 태워 WebP 로 줄이고,
              priority 로 먼저 받게 한다.
            */}
            <Image
              src={img['ceo'] || '/mfl/images/sub/ceo.png'}
              alt="메이크업포엘 대표원장 김성희"
              width={327}
              height={400}
              sizes="327px"
              priority
              className="absolute bottom-0 right-0 h-[400px] w-[327px] object-contain object-bottom"
            />
            {/* 홈 히어로에 있던 문항 회전을 여기로 옮겼다 — 혼주 질문은 이 페이지의 것이다 */}
            <NowPlayingRotator
              items={heroPicks.map((x) => ({ slug: x.slug, question: x.question, part: x.part }))}
              totalMinutes={Math.round(totalSec / 60)}
            />
          </div>
        </div>
      </section>

      {/*
        전체 열람 로그인.

        값을 낸 분은 구매 랜딩에서 이 목록으로 넘어온다. 히어로 바로 아래,
        파트를 고르기 전에 두어야 로그인하고 나서 둘러보게 된다.
      */}
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <Wed100Account />
      </div>

      {/* 파트 */}
      <section className="bg-[var(--w-card)] mt-10">
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
                  <p className="text-[13px] font-extrabold tracking-[0.22em]" style={{ color: `var(--w-p${p.part})` }}>
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
            locked: !isOpen(access, x.slug),
            /*
              잠긴 문항에만 붙인다. 열린 문항은 눌러 들어가면 다 보인다.

              카드는 두 줄까지만 보여 준다. 문항 페이지와 같은 길이(95자)를
              넣었더니 넘치는 만큼이 잘려 나가 문장이 도막났다. 한 문장이면
              대개 두 줄에 맞으므로 40자에서 끊는다.
            */
            teaser: isOpen(access, x.slug) ? undefined : teaser(x.answer, 40),
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
