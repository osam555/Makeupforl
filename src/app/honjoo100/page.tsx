import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import Wed100Account from '@/components/wed100/Wed100Account'
import Wed100Browser from '@/components/wed100/Wed100Browser'
import FreePicks from '@/components/wed100/FreePicks'
import PartPicker from '@/components/wed100/PartPicker'
import { HUBS } from '@/lib/hubs'
import {
  editionLabel,
  editionOf,
  getPublishedWed100Items,
  teaser,
  wed100Meta,
  wed100Parts,
} from '@/lib/wed100'
import { getSiteImages } from '@/lib/siteImages'
import { isOpen } from '@/lib/wed100Access'
import { getWed100Access } from '@/lib/wed100Access.server'
import { breadcrumbJsonLd, jsonLdScript } from '@/lib/seo'
import { OG_IMAGE, SITE_URL } from '@/lib/site'

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
    images: [OG_IMAGE],
  },
}

export default async function Wed100Page() {
  const items = await getPublishedWed100Items()
  const img = await getSiteImages()
  const access = await getWed100Access()
  /*
    첫 화면 카드에는 무료로 열린 문항을 전부 적는다.

    전에는 대표 문항 다섯을 4초마다 돌려 보였다(NowPlayingRotator). 읽으려는 순간
    넘어가고, 그게 공짜인지 아닌지도 알 수 없었다. 무료 문항이 곧 이 상품의 맛보기라,
    돌리지 않고 무엇이 공짜인지 그대로 보인다. 프롤로그가 맨 앞 — "왜 만들었나" 부터
    듣는 게 순서다. 에필로그는 맨 뒤.
  */
  const dur = (x: (typeof items)[number]) =>
    x.duration ?? x.cues.reduce((b, c) => b + c.ko.length, 0) / 5.2 + 6
  // 잠금이 꺼져 있으면(전부 열림) "무료 공개" 라는 말 자체가 없다 — 카드를 안 그린다
  const freePicks = (access.paywall ? items : [])
    .filter((x) => isOpen(access, x.slug))
    .sort((a, b) => a.part - b.part || a.n - b.n)
    .map((x) => ({ slug: x.slug, question: x.question, part: x.part, duration: dur(x) }))

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
  const edition = editionOf(items)

  const listJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_URL}/honjoo100#collection`,
    name: '혼주메이크업 100문 100답',
    inLanguage: 'ko',
    about: ['혼주메이크업', '혼주화장', '혼주헤어', '한복 메이크업'],
    publisher: { '@id': `${SITE_URL}/#business` },
    ...(edition ? { dateModified: edition } : {}),
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
            {/*
              언제 기준인지 밝힌다. 파는 물건이라 "언제 쓴 내용인가" 가 값어치를
              가른다. 날짜는 손으로 적지 않고 문항들의 실제 수정 시각에서 뽑는다 —
              고쳐 놓고 날짜만 안 바꾸는 일이 생기지 않게.
            */}
            {edition && (
              <span className="ml-3 font-bold tracking-normal text-[var(--w-mut)]">
                {editionLabel(edition)} 기준
              </span>
            )}
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
          </div>
        </div>
      </section>

      {/* 무료 문항 — 히어로 바로 아래, 로그인 안내보다 먼저. 공짜부터 보여 주고 값을 말한다 */}
      <div className="mx-auto max-w-7xl px-6 pt-6 lg:px-8">
        <FreePicks items={freePicks} />
      </div>

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
          <PartPicker
            parts={wed100Parts
              .filter((p) => p.part >= 1 && p.part <= 6)
              .map((p) => ({ part: p.part, title: p.title, intro: p.intro[0] ?? '', count: counts.get(p.part) ?? 0 }))}
            items={items.map((x) => ({
              slug: x.slug,
              part: x.part,
              n: x.n,
              question: x.question,
              duration: dur(x),
              locked: !isOpen(access, x.slug),
              teaser: isOpen(access, x.slug) ? undefined : teaser(x.answer, 60),
            }))}
          />

          {/*
            주제별 글로 가는 길.

            허브는 값을 내지 않아도 다 읽히는 글이라, 처음 온 사람에게 먼저
            보여 줄 것이 여기다. 그런데 만들어 놓고 어디서도 링크를 걸지
            않아 주소를 아는 사람만 갈 수 있었다.
          */}
          {HUBS.length > 0 && (
            <div className="mt-10 border-t border-[var(--w-line2)] pt-8">
              <h3 className="text-base font-extrabold text-[var(--w-ink)]">
                주제별로 묶어 읽기{' '}
                <span className="ml-1 text-sm font-bold text-[var(--w-p4)]">무료</span>
              </h3>
              <p className="mt-1.5 text-sm text-[var(--w-ink2)]">
                문항을 하나씩 보기 전에, 한 주제를 통째로 짚은 글부터 읽어 보세요.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {HUBS.map((h) => (
                  <Link
                    key={h.slug}
                    href={`/${h.slug}`}
                    className="group rounded-xl border border-[var(--w-line)] bg-[var(--w-bg)] px-5 py-4 transition-colors hover:border-[var(--w-rose)]"
                  >
                    <p className="text-[15px] font-extrabold text-[var(--w-ink)] group-hover:text-[var(--w-rose)]">
                      {h.slug} →
                    </p>
                    <p className="mt-1 text-[13px] text-[var(--w-ink2)]">{h.lead}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}
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
