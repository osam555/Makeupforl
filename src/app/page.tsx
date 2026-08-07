import Link from 'next/link'

import { getSiteImages } from '@/lib/siteImages'
import MainGallery from '@/components/home/MainGallery'
import ReviewSlide from '@/components/home/ReviewSlide'
import reviewsSeed from '@/data/reviews.json'
import gallerySeed from '@/data/gallery.json'

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
      {/* 메인 비주얼 */}
      <div className="main-visual">
        <div className="items">
          <div className="item">
            <div className="img">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img['main-vis'] || '/mfl/images/main/main_vis1.jpg'} alt="메이크업포엘" />
            </div>
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
                href="/services"
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
                href="/services"
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
