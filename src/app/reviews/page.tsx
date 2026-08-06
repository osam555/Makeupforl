import { Metadata } from 'next'
import ReviewsList from '@/components/reviews/ReviewsList'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'

export const metadata: Metadata = {
  title: '고객후기 | 메이크업포엘',
  description: '메이크업포엘 고객님들의 생생한 후기와 평가를 확인하세요.',
}

export default async function ReviewsPage() {
  const img = await getSiteImages()
  return (
    <div className="min-h-screen bg-gray-50">
      <SubHero title="고객후기" image={img['sub-hero']} />
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-lg text-gray-600">
            메이크업포엘을 이용하신 고객님들의 소중한 후기입니다
          </p>
          <p className="mx-auto mt-5 max-w-2xl rounded-xl border border-pink-100 bg-white px-5 py-4 text-sm leading-relaxed text-gray-600">
            저희 메이크업포엘은 <b className="text-pink-700">업체를 통한 마케팅용 후기를 올리지
            않습니다.</b> 고객 한 분 한 분이 보내주신 후기를 그대로 올립니다.
          </p>
        </div>

        <ReviewsList />
      </div>
    </div>
  )
}
