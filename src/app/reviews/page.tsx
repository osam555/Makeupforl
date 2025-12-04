import { Metadata } from 'next'
import ReviewsList from '@/components/reviews/ReviewsList'

export const metadata: Metadata = {
  title: '고객후기 | 메이크업포엘',
  description: '메이크업포엘 고객님들의 생생한 후기와 평가를 확인하세요.',
}

export default function ReviewsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            고객후기
          </h1>
          <p className="text-lg text-gray-600">
            메이크업포엘을 이용하신 고객님들의 소중한 후기입니다
          </p>
        </div>

        <ReviewsList />
      </div>
    </div>
  )
}
