import { Metadata } from 'next'
import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import GalleryClient from '@/components/gallery/GalleryClient'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'
import { GALLERY_CATEGORIES, findCategory } from '@/lib/galleryCategories'

type Params = { params: Promise<{ cat: string }> }

/** 분야마다 정적 페이지를 만든다 — 쿼리(?cat=)와 달리 각자 색인된다 */
export function generateStaticParams() {
  return GALLERY_CATEGORIES.map((c) => ({ cat: c.slug }))
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { cat } = await params
  const c = findCategory(cat)
  if (!c) return { title: '갤러리 | 메이크업포엘' }
  return {
    title: `${c.menuName} | 메이크업포엘`,
    description: c.desc,
    alternates: { canonical: `/gallery/${c.slug}` },
  }
}

export default async function GalleryCategoryPage({ params }: Params) {
  const { cat } = await params
  const c = findCategory(cat)
  if (!c) notFound()

  const img = await getSiteImages()
  return (
    <>
      <SubHero title={c.menuName} image={img['sub-hero']} />
      <Suspense fallback={<div className="min-h-screen bg-gray-50 py-12" />}>
        <GalleryClient category={c.slug} />
      </Suspense>
    </>
  )
}
