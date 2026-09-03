import Link from 'next/link'
import Image from 'next/image'

import { getSiteImages } from '@/lib/siteImages'
import MainGallery from '@/components/home/MainGallery'
import ReviewSlide from '@/components/home/ReviewSlide'
import reviewsSeed from '@/data/reviews.json'
import gallerySeed from '@/data/gallery.json'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'
import { BRAND_POINTS, HOME_QNA_SLUGS } from '@/lib/brandPoints'
import wed100 from '@/data/wed100.json'

export const revalidate = 3600

type GalleryItem = { id: string; url: string; alt_text: string; category: string }

/** 원본 메인(index.php) 구조 그대로: main-visual / sec1 / sec2 / sec3 / sec4 */
export default async function Home() {
  const img = await getSiteImages()

  const reviews = (reviewsSeed as { items: { id: string; title: string; date: string; url: string }[] })
    .items.slice(0, 10)
    .map((r) => ({ ...r, url: img[r.id] || r.url }))

  const gallery = (gallerySeed as GalleryItem[]).map((g) => ({ ...g, url: img[g.id] || g.url }))

  // 홈에 펼쳐 보일 100문100답 문항 — 원고(wed100.json)에서 slug 로 찾아 쓴다
  const wedItems = (wed100 as { items: { slug: string; question?: string; published?: boolean }[] }).items
  const qna = HOME_QNA_SLUGS.map((slug) => wedItems.find((i) => i.slug === slug))
    .filter((i): i is { slug: string; question: string; published?: boolean } =>
      Boolean(i?.question && i?.published))

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

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-black/10" />
        <div className="absolute inset-0 flex items-center">
          <div className="mfl-contain flex w-full items-center justify-between gap-10">
            {/* 왼쪽 — 무엇을 하는 곳인지 */}
            <div className="max-w-[560px] text-white">
              <p className="text-[13px] font-semibold tracking-[0.2em] text-white/85 sm:text-[15px]">
                MAKEUP FOR L
              </p>
              <h2 className="mt-3 text-[26px] font-bold leading-[1.35] drop-shadow-sm sm:text-[40px]">
                혼주 메이크업 전문
              </h2>
              <p className="mt-3 text-[14px] leading-[1.7] text-white/90 sm:mt-4 sm:text-[18px]">
                20년, 1만 명의 얼굴을 만났습니다.
                <br className="hidden sm:block" /> 신부 곁의 혼주가 아니라 혼주 한 분께
                집중합니다.
              </p>
              <div className="mt-5 sm:mt-8">
                <Link
                  href="/honjoo100"
                  className="inline-block rounded-full bg-[#F46E65] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#e15a51] sm:px-7 sm:py-3.5 sm:text-[15px]"
                >
                  혼주메이크업 100문100답
                </Link>
              </div>
            </div>

            {/*
              오른쪽 — 방문자가 자기를 규정하는 축(나는 혼주다)을 첫 화면에 둔다.
              좁은 화면에서는 히어로 위에 얹을 자리가 없어 아래 띠로 대신한다.
            */}
            <div className="hidden w-[330px] shrink-0 rounded-2xl bg-white/92 p-5 shadow-xl backdrop-blur-sm lg:block">
              <p className="px-2 pb-1 text-[13px] font-bold tracking-[0.14em] text-gray-500">
                업무분야
              </p>
              <ul>
                {GALLERY_CATEGORIES.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/gallery/${c.slug}`}
                      className="group flex items-center justify-between rounded-lg px-2 py-2.5 text-[15px] font-medium text-gray-800 transition-colors hover:bg-[#FDECEA] hover:text-[#F46E65]"
                    >
                      <span>{c.menuName}</span>
                      <span
                        aria-hidden
                        className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#F46E65]"
                      >
                        ›
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 좁은 화면용 업무분야 띠 — 히어로 오른쪽 패널을 대신한다 */}
      <div className="border-b border-gray-100 bg-white py-7 lg:hidden">
        <div className="mfl-contain">
          <ul className="flex flex-wrap justify-center gap-2 sm:gap-3">
            {GALLERY_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/gallery/${c.slug}`}
                  className="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-700 transition-colors hover:border-[#F46E65] hover:text-[#F46E65] sm:px-5 sm:text-[15px]"
                >
                  {c.menuName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
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
