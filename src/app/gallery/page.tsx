import { Metadata } from 'next'
import { Suspense } from 'react'
import GalleryClient from '@/components/gallery/GalleryClient'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'

export const metadata: Metadata = {
  title: '갤러리 | 메이크업포엘',
  description:
    '메이크업포엘의 메이크업 포트폴리오 — ' +
    GALLERY_CATEGORIES.map((c) => c.menuName).join(', '),
}

export default async function GalleryPage() {
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
      {/* GalleryClient 가 useSearchParams(구 ?cat= 링크 처리)를 쓰므로 Suspense 로 감싼다 */}
      <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12" />}>
        <GalleryClient category="all" />
      </Suspense>
    </>
  )
}
