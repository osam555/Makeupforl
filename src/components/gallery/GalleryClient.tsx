'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import GalleryGrid from './GalleryGrid'

const categories = [
  { slug: 'all', name: '전체' },
  { slug: 'honju', name: '혼주' },
  { slug: 'family-guest', name: '가족 및 하객' },
  { slug: 'wedding', name: '웨딩' },
  { slug: 'hair-styling', name: '헤어변형' },
  { slug: 'men-makeup', name: '남자 메이크업' },
  { slug: 'corporate-video', name: '기업행사&영상메이크업' },
  { slug: 'photoshoot-profile', name: '화보 & 프로필' },
]

/** ?cat= 값을 탭 슬러그로 — 슬러그와 한글 이름(옛 링크) 둘 다 받는다 */
function toSlug(cat: string | null) {
  if (!cat) return 'all'
  const hit = categories.find((c) => c.slug === cat || c.name === cat)
  return hit ? hit.slug : 'all'
}

export default function GalleryClient() {
  const searchParams = useSearchParams()
  const catParam = searchParams.get('cat')
  const [activeCategory, setActiveCategory] = useState(() => toSlug(catParam))

  // 헤더 서브메뉴로 이동하면 같은 페이지라 리마운트되지 않으므로 쿼리 변화를 따라간다
  useEffect(() => {
    setActiveCategory(toSlug(catParam))
  }, [catParam])

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            Gallery
          </h1>
          <p className="text-lg text-gray-600">
            메이크업포엘의 다양한 메이크업 포트폴리오를 확인하세요
          </p>
        </div>

        {/* Category Tabs */}
        <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
          <TabsList className="w-full flex flex-wrap justify-center gap-2 bg-white p-2 mb-8 h-auto">
            {categories.map((category) => (
              <TabsTrigger
                key={category.slug}
                value={category.slug}
                className="px-6 py-2 data-[state=active]:bg-[#F46E65] data-[state=active]:text-white"
              >
                {category.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category.slug} value={category.slug}>
              <GalleryGrid category={category.slug} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </div>
  )
}
