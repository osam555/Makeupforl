import { Metadata } from 'next'
import { Suspense } from 'react'
import GalleryClient from '@/components/gallery/GalleryClient'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'

export const metadata: Metadata = {
  title: '갤러리 | 메이크업포엘',
  description: '메이크업포엘의 다양한 메이크업 포트폴리오를 확인하세요. 혼주, 가족·하객, 웨딩, 헤어변형, 남자 메이크업, 기업행사·영상, 화보·프로필',
}

export default async function GalleryPage() {
  const img = await getSiteImages()
  return (
    <>
      <SubHero title="갤러리" image={img['sub-hero']} />
      {/* GalleryClient 가 useSearchParams 를 쓰므로 Suspense 로 감싼다 */}
      <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12" />}>
        <GalleryClient />
      </Suspense>
    </>
  )
}
