import Link from 'next/link'
import Image from 'next/image'

import { getSiteImages } from '@/lib/siteImages'
import MainGallery from '@/components/home/MainGallery'
import ReviewSlide from '@/components/home/ReviewSlide'
import reviewsSeed from '@/data/reviews.json'
import gallerySeed from '@/data/gallery.json'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'

export const revalidate = 3600

type GalleryItem = { id: string; url: string; alt_text: string; category: string }

/** 원본 메인(index.php) 구조 그대로: main-visual / sec1 / sec2 / sec3 / sec4 */
export default async function Home() {
  const img = await getSiteImages()

  const reviews = (reviewsSeed as { items: { id: string; title: string; date: string; url: string }[] })
    .items.slice(0, 10)
    .map((r) => ({ ...r, url: img[r.id] || r.url }))

  const gallery = (gallerySeed as GalleryItem[]).map((g) => ({ ...g, url: img[g.id] || g.url }))

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

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/45 via-black/15 to-transparent" />
        <div className="absolute inset-0 flex items-center">
          <div className="mfl-contain">
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
              <div className="mt-5 flex flex-wrap gap-2 sm:mt-8 sm:gap-3">
                <Link
                  href="/honjoo100"
                  className="rounded-full bg-[#F46E65] px-5 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#e15a51] sm:px-7 sm:py-3.5 sm:text-[15px]"
                >
                  혼주메이크업 100문100답
                </Link>
                <Link
                  href="/consultation"
                  className="rounded-full border border-white/70 px-5 py-2.5 text-[13px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/15 sm:px-7 sm:py-3.5 sm:text-[15px]"
                >
                  1:1 사전컨설팅
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 업무분야 바로가기 — 방문자가 자기를 규정하는 축(나는 혼주다)을 첫 화면에 둔다 */}
      <div className="border-b border-gray-100 bg-white py-7">
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
