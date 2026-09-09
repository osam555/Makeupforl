import { Metadata } from 'next'
import GalleryClient from '@/components/gallery/GalleryClient'
import { getGalleryImages } from '@/lib/galleryImages'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'

export const metadata: Metadata = {
  // 자기 주소를 정본으로 못 박는다. 쿼리스트링이 붙은 유입도 한 주소로 모인다.
  alternates: { canonical: '/gallery' },
  title: '갤러리 | 메이크업포엘',
  description:
    '메이크업포엘의 메이크업 포트폴리오 — ' +
    GALLERY_CATEGORIES.map((c) => c.menuName).join(', '),
}

export default async function GalleryPage() {
  // 사진을 서버에서 미리 읽어 넘긴다 — 그래야 HTML 에 실린다
  const photos = (await getGalleryImages()).map((x, i) => ({
    ...x,
    order_position: x.order_position ?? i,
  }))
  const img = await getSiteImages()
  return (
    <>
      <SubHero title="갤러리" image={img['sub-hero']} />
      <section className="bg-white pt-14 pb-2 text-center">
        <div className="mfl-contain max-w-[900px]">
          <p className="text-[22px] font-bold leading-[1.5] text-gray-900 sm:text-[26px]">
            25년, 1만 명의 얼굴
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-[1.9] text-gray-600">
            혼주부터 가족·하객, 신부, 기업행사까지 — 분야별로 나눠 보실 수 있습니다.
          </p>
        </div>
      </section>
      {/*
        Suspense 를 걷어냈다. useSearchParams 를 쓰는 부분만 GalleryClient 안에서
        따로 떼어 놓았으므로, 사진 그리드가 서버에서 함께 그려진다.
      */}
      <>
        <GalleryClient category="all" initial={photos} />
      </>
    </>
  )
}
