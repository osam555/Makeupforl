import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

import { bgImage } from '@/lib/bgImage'
import { getSiteImages } from '@/lib/siteImages'
import { getGalleryImages } from '@/lib/galleryImages'
import reviewTexts from '@/data/reviewTexts.json'
import MainGallery from '@/components/home/MainGallery'
import ReviewSlide from '@/components/home/ReviewSlide'
import SectionHead from '@/components/home/SectionHead'
import { OG_IMAGE } from '@/lib/site'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'
import { BRAND_POINTS, BRAND_STATS } from '@/lib/brandPoints'
import HeroQnaSlide from '@/components/home/HeroQnaSlide'
import QnaCard from '@/components/home/QnaCard'
import { getHomeConfig } from '@/lib/homeConfig'
import wed100 from '@/data/wed100.json'

export const revalidate = 3600

/*
  홈 전용 제목·설명.

  지금까지는 루트 레이아웃 값("강남 메이크업샵")을 그대로 썼는데, 이 집의 강점인
  혼주메이크업이 제목에 한 글자도 없었다. 검색 결과에서 클릭을 받는 문장은
  "무엇을 파는 집인지"가 앞에 와야 한다.
*/
export const metadata: Metadata = {
  /*
    홈이 맡는 말을 좁힌다.

    '혼주메이크업'(월 5,060)을 제목에 가진 페이지가 다섯이 됐다. 구글은 그중
    하나만 고르는데, 정작 팔아야 할 /혼주메이크업(가격표가 있는 유일한 장)이
    가장 얇아서 목록 페이지에 밀린다.

    그래서 홈은 브랜드와 지역을 맡는다 — 이 집 이름을 알고 찾아오는 사람과
    "강남에서" 찾는 사람이다. 낱말 자체는 /혼주메이크업 에 넘긴다.
  */
  title: '메이크업포엘 | 강남 논현동 혼주 전문 메이크업샵',
  description:
    '강남 논현동 혼주 전문 메이크업샵. 25년간 1만 명의 혼주님을 만난 대표원장이 1:1 사전 컨설팅 후 직접 담당합니다. 샵·출장 모두 가능, 토·일 06시부터.',
  alternates: { canonical: '/' },
  openGraph: {
    title: '메이크업포엘 | 강남 논현동 혼주 전문 메이크업샵',
    description:
      '25년간 1만 명의 혼주님을 만난 대표원장이 1:1 사전 컨설팅 후 직접 담당합니다.',
    url: '/',
    type: 'website',

    images: [OG_IMAGE],
  },
}

/** 원본 메인(index.php) 구조 그대로: main-visual / sec1 / sec2 / sec3 / sec4 */
export default async function Home() {
  const img = await getSiteImages()

  /*
    후기 슬라이드는 사진이 아니라 옮겨 적은 글을 보여 준다 (ReviewSlide 참고).
    문자 캡처가 중간부터 잘린 것("…시고 이어 저의 마음까지")은 뺀다 — 후기 페이지에서는
    사진 밑에 있어 괜찮지만 카드 첫 줄로 오면 깨진 글로 읽힌다.
  */
  const reviews = reviewTexts.items
    .map((r, i) => ({ id: `t${i}`, text: r.text }))
    .filter((r) => /^[가-힣A-Za-z“"(]/.test(r.text) && !/^(시고|고|며) /.test(r.text))
    .slice(0, 10)

  // 갤러리도 같은 이유로 Firestore 를 먼저 본다
  const gallery = await getGalleryImages()

  // 홈에 펼쳐 보일 100문100답 문항 — 원고(wed100.json)에서 slug 로 찾아 쓴다
  const wedItems = (wed100 as { items: { slug: string; question?: string; published?: boolean; audio?: string }[] }).items
  const pickQna = (slugs: string[]) =>
    slugs
      .map((slug) => wedItems.find((i) => i.slug === slug))
      .filter((i): i is { slug: string; question: string; published?: boolean } =>
        Boolean(i?.question && i?.published),
      )
      .map((i) => ({ slug: i.slug, question: i.question }))

  // 어느 문항을 앞에 세울지는 어드민에서 고른다 (설정이 없으면 코드의 기본값)
  const homeConfig = await getHomeConfig()
  const qna = pickQna(homeConfig.sectionQna)
  const heroQna = pickQna(homeConfig.heroQna)
  // 하드코딩된 '102개' 대신 원고에서 센다. 음성 보유 수도 함께 본다
  const published = wedItems.filter((i) => i.published && i.question)
  const qnaCount = published.length
  const audioCount = published.filter((i) => (i as { audio?: string }).audio).length

  /*
    히어로 왼쪽 — 넓은 화면은 사진 위 카드로, 좁은 화면은 사진 아래로 같은 내용을 쓴다.

    같은 내용이 두 번 그려지므로 h1 은 앞의 하나에만 준다. 둘 다 h1 이면 이 페이지가
    무엇에 대한 것인지 도리어 흐려진다.

    제목에 "혼주메이크업" 을 넣은 것은 이 집이 실제로 그것을 파는 집이기 때문이다.
    이 낱말을 노리는 페이지가 홈·100문100답 목록·문항 열둘로 이미 여럿이라, 검색어를
    가장 잘 받아야 할 홈이 정작 제목에 그 말을 안 갖고 있으면 안 된다.
  */
  const heroCopy = (asH1: boolean) => (
    <>
      <p className="text-[13px] font-bold tracking-[0.28em] text-[#F46E65]">MAKEUP FOR L</p>
      {(() => {
        const cls = 'mt-3 text-[27px] font-bold leading-[1.3] text-gray-900 sm:text-[33px]'
        const text = '혼주메이크업 25년, 1만 명의 얼굴'
        return asH1 ? <h1 className={cls}>{text}</h1> : <h2 className={cls}>{text}</h2>
      })()}
      <p className="mt-3 text-[15px] leading-[1.75] text-gray-600">
        혼주 메이크업을 중심으로 웨딩·가족·기업행사·화보까지.
        <br />
        메이크업 전 1:1 사전 컨설팅으로 시작합니다.
      </p>

      {/* 분야를 늘어놓는 대신 회사 규모로 보여준다 — 혼주는 주력이지만 전부는 아니다 */}
      <dl className="mt-6 flex flex-wrap gap-x-8 gap-y-3 border-y border-gray-100 py-4">
        {BRAND_STATS.map((s) => (
          <div key={s.label}>
            <dt className="text-[20px] font-bold leading-none text-[#F46E65]">{s.value}</dt>
            <dd className="mt-1.5 text-[13px] text-gray-500">{s.label}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/consultation"
          className="group inline-flex items-center gap-1.5 rounded-full bg-[#F46E65] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#F46E65]/25 transition-colors hover:bg-[#e15a51]"
        >
          1:1 사전컨설팅
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            ›
          </span>
        </Link>
        <Link
          href="/honjoo100"
          className="inline-flex items-center rounded-full border border-gray-200 px-6 py-3.5 text-[15px] font-bold text-gray-700 transition-colors hover:border-[#F46E65] hover:text-[#F46E65]"
        >
          혼주 100문100답
        </Link>
      </div>

      <HeroQnaSlide items={heroQna} />
    </>
  )

  /* 히어로 오른쪽 — 방문자가 자기를 규정하는 축(나는 혼주다)을 첫 화면에 둔다 */
  const fieldPanel = (
    <>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[20px] font-bold tracking-tight text-gray-900">업무분야</h2>
        <span className="text-[13px] font-medium text-gray-600">
          {GALLERY_CATEGORIES.length}개 분야
        </span>
      </div>
      <div className="mt-2.5 h-[2px] w-full bg-gradient-to-r from-[#F46E65] via-[#F46E65]/30 to-transparent" />
      <ul className="mt-1.5">
        {GALLERY_CATEGORIES.map((c) => (
          <li key={c.slug} className="border-b border-gray-100 last:border-0">
            <Link
              href={`/gallery/${c.slug}`}
              className="group flex items-center justify-between rounded-lg px-1 py-2.5 text-[15px] font-medium text-gray-800 transition-colors hover:text-[#F46E65]"
            >
              <span>{c.menuName}</span>
              <span
                aria-hidden
                className="text-gray-300 transition-transform group-hover:translate-x-1 group-hover:text-[#F46E65]"
              >
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  )

  return (
    <div className="mfl-container">
      {/*
        메인 비주얼 — 홈에서 가장 큰 요소(LCP)라 next/image 로 우선 로드한다.
        예전엔 크기 없는 <img> 라 화면이 한 번 튀고(CLS) 늦게 떴다.
        사진만 있고 글이 한 줄도 없어서 무엇을 하는 곳인지 스크롤해야 알 수 있었다.
      */}
      {/*
        휴대전화(640 미만)에서는 사진을 뺀다. 1920×980 사진이 390px 폭에서는 200px 높이의
        띠가 되어 가운데 수상 그래픽이 콩알만 했고, 그만큼 첫 화면의 글과 단추가 아래로 밀렸다.
        혼주는 대부분 휴대전화로 온다(2026-09-11 네이버 유입 24 중 19).
      */}
      <div className="main-visual relative max-sm:hidden">
        <div className="items">
          <div className="item">
            <div className="img">
              <Image
                src={img['main-vis'] || '/mfl/images/main/main_vis1.jpg'}
                alt="메이크업포엘 혼주 메이크업"
                width={1920}
                height={980}
                priority
                sizes="100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>

        {/*
          배경이 수상 그래픽이라 어둡게 덮으면 브랜드 이미지가 탁해진다.
          전면 그라데이션 대신 카드가 스스로 배경을 갖게 하고, 가장자리만 아주 옅게 눌러
          가운데 그래픽이 그대로 보이게 둔다.
        */}
        {/* 상단 — 밝은 배경 위의 흰 메뉴가 묻히지 않게 살짝 눌러준다 */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/30 to-transparent" />
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-black/10 via-transparent to-black/10 xl:block" />

        {/*
          카드 폭을 화면 비율로 잡는다. 고정 px 로 두면 좁은 화면에서 가운데
          makeupforl 워드마크를 덮는다. 워드마크는 화면 폭의 35~40% 를 차지하므로
          양쪽 카드를 각각 26% 로 두어 가운데를 비워준다.
          1280 미만은 아무리 줄여도 가운데가 안 남아 사진 아래 배치를 쓴다.
        */}
        <div className="absolute inset-0 hidden items-center xl:flex">
          <div className="hero-contain flex w-full items-center justify-between gap-8">
            <div className="hero-rise w-[26%] min-w-[330px] max-w-[460px] rounded-3xl bg-white/92 p-7 shadow-[0_24px_60px_-24px_rgba(0,0,0,.4)] ring-1 ring-black/5 backdrop-blur-md">
              {heroCopy(true)}
            </div>
            <div className="hero-rise hero-rise-2 w-[26%] min-w-[300px] max-w-[380px] rounded-3xl bg-white/92 p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,.4)] ring-1 ring-black/5 backdrop-blur-md">
              {fieldPanel}
            </div>
          </div>
        </div>
      </div>

      {/*
        좁은 화면 — 히어로 위에 얹을 자리가 없어 사진 아래로 내린다.
        업무분야는 일곱 줄 목록이 아니라 한 줄 알약으로. 목록으로 두면 WHY 까지 한참
        내려야 했고, 첫 화면에서 전화·상담 단추가 화면 밖에 있었다.
      */}
      <div className="border-b border-gray-100 bg-white xl:hidden">
        <div className="hero-rise mfl-contain py-9">{heroCopy(false)}</div>
        <div className="hero-rise hero-rise-2 mfl-contain border-t border-gray-100 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-[13px] font-bold tracking-wide text-gray-500">업무분야</span>
            {GALLERY_CATEGORIES.map((c) => (
              <Link
                key={c.slug}
                href={`/gallery/${c.slug}`}
                className="rounded-full border border-gray-200 px-3.5 py-1.5 text-[13px] font-semibold text-gray-700 transition-colors hover:border-[#F46E65] hover:text-[#F46E65]"
              >
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/*
        왜 메이크업포엘인가 — 브랜드소개 안에만 있던 차별점 네 가지를 홈으로 올린다.
        특히 '합법적인 정식 업체' 는 경쟁 업체 대비 결정적인 근거인데
        예전에는 브랜드소개까지 들어가 스크롤해야 볼 수 있었다.
      */}
      <div className="bg-white py-16 sm:py-20">
        <div className="mfl-contain max-w-[1100px]">
          {/*
            제목 크기는 이웃 절(.sec-tit 35px)에 맞춘다. 30px 로 두니 옆 절보다 한 단계
            작아 보였다. 카드는 두 줄뿐이라 여백을 줄이고 글자를 키운다 — 안이 비어 보이는
            카드는 내용이 적은 게 아니라 글자가 작은 것이다.
          */}
          <SectionHead eyebrow="WHY" title="왜 메이크업포엘인가?" />
          <div className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 sm:gap-5">
            {BRAND_POINTS.map((p, i) => (
              <div
                key={p.title}
                className="rounded-2xl border border-gray-100 bg-white px-6 py-6 shadow-sm transition-shadow hover:shadow-md sm:px-8 sm:py-7"
              >
                <span className="text-[15px] font-bold text-[#F46E65]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-1.5 text-[20px] font-bold text-gray-900 sm:text-[22px]">{p.title}</h3>
                <p className="mt-2 text-[16px] leading-[1.75] text-gray-600 sm:text-[17px]">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* sec1 — 서비스 소개 */}
      <div className="sec1">
        <div className="mfl-contain">
          <div className="mb-10 sm:mb-12">
            <SectionHead
              eyebrow="SERVICE"
              title="메이크업포엘의 서비스는 다릅니다"
              sub="메이크업 전 전문가의 1:1 사전 컨설팅으로 퍼스널컬러를 진단하고 어울리는 헤어스타일을 점검한 뒤 메이크업을 진행합니다."
            />
          </div>
          <div className="con-box">
            <div className="wrap">
              <Link
                href="/services#shop"
                className="box"
                style={{
                  backgroundImage: `url(${bgImage(img['sec1-bg1'] || '/mfl/images/main/sec1_bg1.jpg', 828)})`,
                }}
              >
                <div className="inner">
                  <div className="tit">샵서비스</div>
                  <p className="tt">고객님 한분한분의 소중한 날을 위한 프라이빗 헤어 메이크업</p>
                  <div className="radi">
                    <span>바로가기</span>
                  </div>
                </div>
              </Link>
            </div>
            <div className="wrap">
              <Link
                href="/services#visit"
                className="box type2"
                style={{
                  backgroundImage: `url(${bgImage(img['sec1-bg2'] || '/mfl/images/main/sec1_bg2.jpg', 828)})`,
                }}
              >
                <div className="inner">
                  <div className="tit">출장메이크업</div>
                  <p className="tt">“Anytime, Anywhere” 고객이 원하는 시간에 원하는 장소에서</p>
                  <div className="radi">
                    <span>바로가기</span>
                  </div>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/*
        100문100답 맛보기 — 예전에는 버튼만 있어 안에 뭐가 있는지 알 수 없었다.
        실제 문항을 펼쳐 두면 자기 걱정과 같은 질문을 발견하고 들어간다.
        문구는 wed100.json 에서 slug 로 찾아 쓰므로 원고를 고치면 여기도 같이 바뀐다.
      */}
      {qna.length > 0 && (
        <div className="bg-[#FDF4F3] py-16 sm:py-20">
          <div className="mfl-contain max-w-[1000px]">
            <div className="text-center">
              <SectionHead
                eyebrow="100 Q & A"
                title="혼주님이 가장 많이 물으신 것들"
                sub={`${qnaCount}개 문항에 원장이 직접 답했습니다.`}
              />
              {/*
                주제별로 묶은 세 장으로 보내는 길.

                '혼주메이크업' 을 제목에 가진 페이지가 다섯이라 서로 밀어내고 있었다.
                홈은 브랜드와 지역을 맡고, 낱말 자체는 /혼주메이크업 이 맡는다.
                대신 홈에서 그리로 링크를 보내 힘을 모은다.
              */}
              <p className="mt-4 text-[15px] leading-[1.9] text-gray-600">
                주제별로 묶어 읽으실 수도 있습니다 —{' '}
                <Link href="/혼주메이크업" className="font-semibold text-[#E2564C] hover:underline">
                  혼주메이크업
                </Link>
                {' · '}
                <Link href="/혼주한복" className="font-semibold text-[#E2564C] hover:underline">
                  혼주한복
                </Link>
                {' · '}
                <Link href="/혼주머리" className="font-semibold text-[#E2564C] hover:underline">
                  혼주머리
                </Link>
              </p>
              {/*
                전 문항에 음성이 있는데 100문100답 안에 들어가야만 알 수 있었다.
                글 읽기가 부담스러운 분께 이게 가장 큰 장점이라 밖으로 드러낸다.
              */}
              {audioCount > 0 && (
                <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[15px] font-semibold text-gray-700 shadow-sm">
                  <span aria-hidden className="text-[17px]">
                    🎧
                  </span>
                  글이 불편하시면 <b className="text-[#F46E65]">원장 음성</b>으로 들으실 수 있습니다
                </p>
              )}
            </div>

            <ul className="mt-9 grid gap-3 sm:grid-cols-2">
              {qna.map((q) => (
                <li key={q.slug}>
                  <QnaCard slug={q.slug} question={q.question} />
                </li>
              ))}
            </ul>

            <div className="mt-9 text-center">
              <Link
                href="/honjoo100"
                className="group inline-flex items-center gap-1.5 rounded-full bg-[#F46E65] px-8 py-4 text-[16px] font-bold text-white shadow-lg shadow-[#F46E65]/25 transition-colors hover:bg-[#e15a51]"
              >
                100문100답 전체 보기
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  ›
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 갤러리 — 옛 sec2(탭 + 큰 사진 + 썸네일)를 버리고 혼주 사진 격자 하나로 (MainGallery 참고) */}
      <div className="bg-[#F6F4F2] py-16 sm:py-20">
        <div className="mfl-contain max-w-[1100px]">
          <SectionHead
            eyebrow="GALLERY"
            title="혼주님들의 예식 날"
            sub="신부 전문 샵의 곁다리가 아니라, 혼주 한 분 한 분을 위해 한 얼굴입니다."
          />
          <MainGallery items={gallery} />
          <div className="mt-9 text-center sm:mt-10">
            <Link
              href="/gallery"
              className="group inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-8 py-4 text-[16px] font-bold text-gray-800 transition-colors hover:border-[#F46E65] hover:text-[#F46E65]"
            >
              갤러리 더보기
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                ›
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* sec3 — 고객후기 */}
      <div className="sec3">
        <div className="mfl-contain">
          <div className="mb-9 sm:mb-11">
            <SectionHead
              eyebrow="REVIEW"
              title="고객후기"
              sub="예식을 마친 혼주님과 자녀분들이 보내 주신 문자입니다."
            />
          </div>
          <ReviewSlide items={reviews} />
          <div className="mt-9 text-center sm:mt-10">
            <Link
              href="/reviews"
              className="group inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-8 py-4 text-[16px] font-bold text-gray-800 transition-colors hover:border-[#F46E65] hover:text-[#F46E65]"
            >
              고객후기 더보기
              <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                ›
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* sec4 — 100% 예약제 */}
      <div
        className="sec4"
        style={{
          backgroundImage: `url(${bgImage(img['btm-bg'] || '/mfl/images/main/btm_bg.jpg', 1920)})`,
        }}
      >
        <div className="mfl-contain">
          {/* "메이크업과 에스테틱" 은 옛 문구다 — 에스테틱은 지금 하지 않는 일 */}
          <h2 className="sec-tit2">
            혼주 메이크업의 모든 과정은 1:1 사전 컨설팅 후 100% 예약제로 진행됩니다.
          </h2>
          <div className="con">
            <div className="wrap">
              <div className="inner">
                <a href="tel:02-323-3321">
                  <div className="icon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/mfl/images/main/icon_tel.png" alt="" />
                  </div>
                  <div className="tt-wrap">
                    <p className="tt">02-323-3321</p>
                    <p className="tt2">전화주시면 친절하게 상담해드리겠습니다.</p>
                  </div>
                </a>
              </div>
            </div>
            <div className="wrap type2">
              <div className="inner">
                <a href="https://pf.kakao.com/_lXVVxb" target="_blank" rel="noreferrer">
                  <div className="icon">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/mfl/images/main/icon_kakao.png" alt="" />
                  </div>
                  <div className="tt-wrap">
                    <p className="tt">메이크업포엘</p>
                    <p className="tt2">채팅이 편하신 분들은 카카오채팅을 이용하세요.</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
