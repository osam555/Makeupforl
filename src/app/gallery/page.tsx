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
      {/* GalleryClient 가 useSearchParams(구 ?cat= 링크 처리)를 쓰므로 Suspense 로 감싼다 */}
      <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12" />}>
        <GalleryClient category="all" />
      </Suspense>
    </>
  )
}
