import { Metadata } from 'next'
import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Check, CalendarCheck, MessageCircle } from 'lucide-react'
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
      {/* 제목은 히어로에만 둔다 — 아래에 또 쓰면 같은 말이 두 번 나온다 */}
      <SubHero title={c.menuName} image={img['sub-hero']} />

      {/* 분야 소개 */}
      <section className="bg-gradient-to-br from-[#FDF4F3] to-white py-16">
        <div className="mfl-contain max-w-[900px] text-center">
          <p className="text-[22px] font-bold leading-[1.5] text-gray-900 sm:text-[26px]">
            {c.lead}
          </p>
          {c.body.map((p) => (
            <p key={p} className="mx-auto mt-5 max-w-2xl text-[15px] leading-[1.9] text-gray-600">
              {p}
            </p>
          ))}
        </div>
      </section>

      {/* 이런 분들께 · 진행 방식 */}
      <section className="py-14">
        <div className="mfl-contain max-w-[1000px]">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">이런 분들께</h2>
              <ul className="mt-5 space-y-3">
                {c.forWhom.map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] leading-[1.75] text-gray-600">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#F46E65]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <h2 className="text-lg font-bold text-gray-900">진행 방식</h2>
              <ul className="mt-5 space-y-3">
                {c.points.map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] leading-[1.75] text-gray-600">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#F46E65]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 사진 */}
      <section>
        <div className="mfl-contain max-w-[1200px] pt-2 text-center">
          <h2 className="text-2xl font-bold text-gray-900">{c.menuName} 포트폴리오</h2>
        </div>
        <Suspense fallback={<div className="bg-gray-50 py-12" />}>
          <GalleryClient category={c.slug} />
        </Suspense>
      </section>

      {/* 예약 유도 */}
      <section className="bg-white py-16">
        <div className="mfl-contain max-w-[900px] text-center">
          <h2 className="text-2xl font-bold text-gray-900">먼저 상담부터 받아보세요</h2>
          <p className="mt-3 text-[15px] leading-[1.9] text-gray-600">
            메이크업 전 1:1 사전 컨설팅에서 퍼스널컬러 진단과 어울리는 헤어스타일 점검을 마친 뒤
            당일에 임합니다.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/consultation"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F46E65] px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-[#e15a51]"
            >
              <MessageCircle className="h-4 w-4" />
              1:1 사전컨설팅
            </Link>
            <Link
              href="/reservation"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50"
            >
              <CalendarCheck className="h-4 w-4" />
              예약안내
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
