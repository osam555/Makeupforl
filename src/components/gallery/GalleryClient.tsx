'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import GalleryGrid from './GalleryGrid'
import { GALLERY_TABS, categoryHref, toSlug } from '@/lib/galleryCategories'

type Props = {
  /** 'all' 또는 분야 슬러그. 경로(/gallery/honju)에서 넘어온다 */
  category: string
}

/** 분야 전환 탭 + 사진 그리드. 제목은 각 페이지가 알아서 붙인다 */
export default function GalleryClient({ category }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const legacy = searchParams.get('cat')

  // 예전 링크(/gallery?cat=honju, ?cat=혼주)를 새 경로로 넘긴다
  useEffect(() => {
    if (!legacy) return
    const slug = toSlug(legacy)
    if (slug !== 'all') router.replace(categoryHref(slug))
  }, [legacy, router])

  return (
    <div className="bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* 탭처럼 보이지만 각자 독립 주소를 가진 링크다 */}
        <nav aria-label="업무분야" className="mb-8">
          <ul className="flex w-full flex-wrap justify-center gap-2 rounded-lg bg-white p-2">
            {GALLERY_TABS.map((tab) => {
              const active = tab.slug === category
              return (
                <li key={tab.slug}>
                  <Link
                    href={categoryHref(tab.slug)}
                    aria-current={active ? 'page' : undefined}
                    className={[
                      'inline-flex items-center rounded-md px-6 py-2 text-sm font-medium transition-colors',
                      active
                        ? 'bg-[#F46E65] text-white'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900',
                    ].join(' ')}
                  >
                    {tab.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <GalleryGrid category={category} />
      </div>
    </div>
  )
}
