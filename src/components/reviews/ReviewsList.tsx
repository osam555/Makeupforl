'use client'

import { useState, useEffect } from 'react'
import { getDb } from '@/lib/firebase/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Star } from 'lucide-react'
import Image from 'next/image'

interface Review {
  id: string
  title: string
  content: string
  author_name: string | null
  image_url: string | null
  rating: number
  created_at: string
}

// Sample reviews for demo
const sampleReviews: Review[] = [
  {
    id: '1',
    title: '고객문자',
    content: '정말 만족스러운 메이크업이었어요! 전문가분의 1:1 컨설팅이 큰 도움이 되었습니다. 퍼스널컬러 진단을 통해 제게 딱 맞는 색상을 찾아주셨고, 헤어스타일까지 완벽하게 연출해주셨어요.',
    author_name: '김○○',
    image_url: null,
    rating: 5,
    created_at: '2023-10-10',
  },
  {
    id: '2',
    title: '감사문자',
    content: '결혼식 날 메이크업 정말 감사했습니다. 아침 일찍부터 정성스럽게 메이크업 해주셔서 하루 종일 예쁜 모습으로 있을 수 있었어요. 주변 분들께서도 메이크업이 너무 자연스럽고 예쁘다고 칭찬 많이 해주셨습니다!',
    author_name: '박○○',
    image_url: null,
    rating: 5,
    created_at: '2023-10-10',
  },
  {
    id: '3',
    title: '고객후기',
    content: '출장 메이크업 서비스 이용했는데 정말 편하고 좋았어요. 집에서 편안하게 메이크업 받을 수 있어서 시간도 절약되고 스트레스도 없었습니다. 실력도 뛰어나셔서 완전 만족합니다!',
    author_name: '이○○',
    image_url: null,
    rating: 5,
    created_at: '2023-03-31',
  },
  {
    id: '4',
    title: '감사인사',
    content: '어머니 혼주 메이크업으로 방문했어요. 연세 있으신 분들 메이크업 정말 잘하시더라구요. 너무 과하지 않으면서도 화사하게 해주셔서 어머니께서도 정말 좋아하셨습니다. 추천드립니다!',
    author_name: '최○○',
    image_url: null,
    rating: 5,
    created_at: '2023-09-15',
  },
  {
    id: '5',
    title: '재방문 후기',
    content: '벌써 세 번째 방문인데 갈 때마다 만족스러워요. 항상 친절하시고 제 얼굴형과 피부톤에 맞춰 메이크업 해주십니다. 앞으로도 중요한 날엔 메이크업포엘만 찾을 것 같아요!',
    author_name: '정○○',
    image_url: null,
    rating: 5,
    created_at: '2023-08-20',
  },
  {
    id: '6',
    title: '추천합니다',
    content: '프로필 촬영 전 메이크업 받았는데 정말 잘 받았어요. 카메라에 잘 나오는 메이크업을 정확히 알고 계셔서 사진 정말 잘 나왔습니다. 실력 있는 곳 찾으시는 분들께 강력 추천드려요!',
    author_name: '윤○○',
    image_url: null,
    rating: 5,
    created_at: '2023-07-05',
  },
]

export default function ReviewsList() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReviews()
  }, [])

  async function loadReviews() {
    setLoading(true)

    try {
      const db = getDb()
      if (!db) throw new Error('firebase-not-configured')
      const { collection, getDocs, orderBy, query, where } = await import('firebase/firestore')
      const snap = await getDocs(
        query(
          collection(db, 'reviews'),
          where('published', '==', true),
          orderBy('created_at', 'desc'),
        ),
      )
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Review)
      setReviews(data.length > 0 ? data : sampleReviews)
    } catch (error) {
      console.error('Error:', error)
      setReviews(sampleReviews)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {reviews.map((review) => (
        <Card key={review.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{review.title}</h3>
                {review.author_name && (
                  <p className="text-sm text-gray-500 mt-1">{review.author_name}</p>
                )}
              </div>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < review.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 text-sm leading-relaxed line-clamp-6">
              {review.content}
            </p>
            {review.image_url && (
              <div className="mt-4 relative aspect-video rounded-lg overflow-hidden">
                <Image
                  src={review.image_url}
                  alt="고객 후기 이미지"
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <p className="text-xs text-gray-400 mt-4">
              {new Date(review.created_at).toLocaleDateString('ko-KR')}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
