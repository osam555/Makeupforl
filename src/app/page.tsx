import Link from 'next/link'
import Image from 'next/image'

import { getSiteImages } from '@/lib/siteImages'
import { getGalleryImages } from '@/lib/galleryImages'
import { getReviews } from '@/lib/reviewImages'
import MainGallery from '@/components/home/MainGallery'
import ReviewSlide from '@/components/home/ReviewSlide'
import QnaRotator from '@/components/home/QnaRotator'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'
import { BRAND_POINTS, HOME_QNA_SLUGS, HOME_HERO_QNA_SLUGS } from '@/lib/brandPoints'
import wed100 from '@/data/wed100.json'

export const revalidate = 3600

/** 원본 메인(index.php) 구조 그대로: main-visual / sec1 / sec2 / sec3 / sec4 */
export default async function Home() {
  const img = await getSiteImages()

  // Firestore 에 옮겨진 Storage 사본을 쓴다. 시드를 그대로 넘기면 옛 서버 주소로 불러온다
  const reviews = await getReviews(10)

  // 갤러리도 같은 이유로 Firestore 를 먼저 본다
  const gallery = await getGalleryImages()

  // 홈에 펼쳐 보일 100문100답 문항 — 원고(wed100.json)에서 slug 로 찾아 쓴다
  const wedItems = (wed100 as { items: { slug: string; question?: string; published?: boolean }[] }).items
  const pickQna = (slugs: string[]) =>
    slugs
      .map((slug) => wedItems.find((i) => i.slug === slug))
      .filter((i): i is { slug: string; question: string; published?: boolean } =>
        Boolean(i?.question && i?.published),
      )
      .map((i) => ({ slug: i.slug, question: i.question }))

  const qna = pickQna(HOME_QNA_SLUGS)
  const heroQna = pickQna(HOME_HERO_QNA_SLUGS)

  /* 히어로 왼쪽 — 넓은 화면은 사진 위 카드로, 좁은 화면은 사진 아래로 같은 내용을 쓴다 */
  const heroCopy = (
    <>
      <p className="text-[11px] font-bold tracking-[0.28em] text-[#F46E65]">MAKEUP FOR L</p>
      <h2 className="mt-3 text-[27px] font-bold leading-[1.3] text-gray-900 sm:text-[33px]">
        혼주 메이크업 전문
      </h2>
      <p className="mt-3 text-[15px] leading-[1.75] text-gray-600">
        20년, 1만 명의 얼굴을 만났습니다.
        <br />
        신부 곁의 혼주가 아니라 혼주 한 분께 집중합니다.
      </p>

      <QnaRotator items={heroQna} />

      <Link
        href="/honjoo100"
        className="group mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#F46E65] px-7 py-3.5 text-[15px] font-bold text-white shadow-lg shadow-[#F46E65]/25 transition-colors hover:bg-[#e15a51]"
      >
        100문100답 전체 보기
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          ›
        </span>
      </Link>
    </>
  )

  /* 히어로 오른쪽 — 방문자가 자기를 규정하는 축(나는 혼주다)을 첫 화면에 둔다 */
  const fieldPanel = (
    <>
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-[20px] font-bold tracking-tight text-gray-900">업무분야</h2>
        <span className="text-[12px] font-medium text-gray-400">
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
      <div className="main-visual relative">
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
        <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-black/10 via-transparent to-black/10 lg:block" />

        <div className="absolute inset-0 hidden items-center lg:flex">
          <div className="hero-contain flex w-full items-center justify-between gap-10">
            <div className="w-[460px] shrink-0 rounded-3xl bg-white/92 p-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,.4)] ring-1 ring-black/5 backdrop-blur-md">
              {heroCopy}
            </div>
            <div className="w-[360px] shrink-0 rounded-3xl bg-white/92 p-7 shadow-[0_24px_60px_-24px_rgba(0,0,0,.4)] ring-1 ring-black/5 backdrop-blur-md">
              {fieldPanel}
            </div>
          </div>
        </div>
      </div>

      {/* 좁은 화면 — 히어로 위에 얹을 자리가 없어 사진 아래로 내린다 */}
      <div className="border-b border-gray-100 bg-white lg:hidden">
        <div className="mfl-contain py-9">{heroCopy}</div>
        <div className="mfl-contain border-t border-gray-100 py-7">{fieldPanel}</div>
      </div>

      {/*
        왜 메이크업포엘인가 — 브랜드소개 안에만 있던 차별점 네 가지를 홈으로 올린다.
        특히 '합법적인 정식 업체' 는 경쟁 업체 대비 결정적인 근거인데
        예전에는 브랜드소개까지 들어가 스크롤해야 볼 수 있었다.
      */}
      <div className="bg-white py-16 sm:py-20">
        <div className="mfl-contain max-w-[1100px]">
          <div className="text-center">
            <p className="text-[12px] font-semibold tracking-[0.28em] text-[#F46E65]">WHY</p>
            <h2 className="mt-3 text-[24px] font-bold text-gray-900 sm:text-[30px]">
              왜 메이크업포엘인가?
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {BRAND_POINTS.map((p, i) => (
              <div
                key={p.title}
                className="rounded-2xl border border-gray-100 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
              >
                <span className="text-[13px] font-bold text-[#F46E65]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 text-[17px] font-bold text-gray-900">{p.title}</h3>
                <p className="mt-2 text-[15px] leading-[1.8] text-gray-600">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* sec1 — 서비스 소개 */}
      <div className="sec1">
        <div className="mfl-contain">
          <div className="tit-box">
            <h2 className="sec-tit pink">메이크업포엘의 서비스는 다릅니다!</h2>
            <p>
              메이크업 전 전문가의 1:1 사전 컨설팅을 통해 퍼스널컬러 진단, 어울리는 헤어스타일 점검 후
              메이크업을 진행합니다.
            </p>
          </div>
          <div className="con-box">
            <div className="wrap">
              <Link
                href="/services#shop"
                className="box"
                style={{ backgroundImage: `url(${img['sec1-bg1'] || '/mfl/images/main/sec1_bg1.jpg'})` }}
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
                style={{ backgroundImage: `url(${img['sec1-bg2'] || '/mfl/images/main/sec1_bg2.jpg'})` }}
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
              <p className="text-[12px] font-semibold tracking-[0.28em] text-[#F46E65]">
                100 Q &amp; A
              </p>
              <h2 className="mt-3 text-[24px] font-bold text-gray-900 sm:text-[30px]">
                혼주님이 가장 많이 물으신 것들
              </h2>
              <p className="mt-3 text-[15px] leading-[1.8] text-gray-600">
                102개 문항에 원장이 직접 답했습니다.
              </p>
            </div>

            <ul className="mt-9 grid gap-3 sm:grid-cols-2">
              {qna.map((q) => (
                <li key={q.slug}>
                  <Link
                    href={`/honjoo100/${q.slug}`}
                    className="group flex h-full items-start gap-3 rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <span className="mt-0.5 shrink-0 text-[17px] font-bold text-[#F46E65]">Q</span>
                    <span className="text-[16px] font-medium leading-[1.6] text-gray-800 transition-colors group-hover:text-[#F46E65]">
                      {q.question}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="mt-9 text-center">
              <Link
                href="/honjoo100"
                className="inline-block rounded-full bg-[#F46E65] px-8 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-[#e15a51]"
              >
                100문100답 전체 보기
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* sec2 — GALLERY */}
      <div className="sec2">
        <div className="mfl-contain">
          <h2 className="sec-tit">GALLERY</h2>
          <MainGallery items={gallery} />
        </div>
      </div>

      {/* sec3 — 고객후기 */}
      <div className="sec3">
        <div className="mfl-contain">
          <div className="tit-box">
            <h2 className="sec-tit">고객후기</h2>
            <Link href="/reviews" className="more">
              고객후기 더보기
            </Link>
          </div>
          <ReviewSlide items={reviews} />
        </div>
      </div>

      {/* sec4 — 100% 예약제 */}
      <div
        className="sec4"
        style={{ backgroundImage: `url(${img['btm-bg'] || '/mfl/images/main/btm_bg.jpg'})` }}
      >
        <div className="mfl-contain">
          <h2 className="sec-tit2">
            메이크업과 에스테틱의 모든 과정은 100% 예약제로 진행됩니다.
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
