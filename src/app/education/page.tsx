import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BookOpen, Video, FileText } from 'lucide-react'

export const metadata: Metadata = {
  title: '교육자료 | 메이크업포엘',
  description: '메이크업포엘의 메이크업 팁과 교육 자료를 확인하세요.',
}

const educationCategories = [
  {
    icon: BookOpen,
    title: '메이크업 기초',
    description: '메이크업을 처음 시작하시는 분들을 위한 기초 가이드',
    topics: ['피부 준비', '베이스 메이크업', '컬러 메이크업 순서', '메이크업 도구 사용법'],
  },
  {
    icon: Video,
    title: '스타일별 메이크업',
    description: '다양한 상황에 맞는 메이크업 스타일',
    topics: ['데일리 메이크업', '웨딩 메이크업', '파티 메이크업', '직장인 메이크업'],
  },
  {
    icon: FileText,
    title: '메이크업 관리',
    description: '메이크업을 오래 유지하고 관리하는 방법',
    topics: ['메이크업 고정', '수정 방법', '클렌징 방법', '화장품 보관법'],
  },
]

export default function EducationPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-pink-50 to-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-6">
            교육자료
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            메이크업포엘이 준비한 유용한 메이크업 정보와 팁
          </p>
        </div>
      </section>

      {/* Education Categories */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {educationCategories.map((category) => (
              <Card key={category.title} className="border-2 hover:border-pink-200 transition-colors">
                <CardHeader>
                  <div className="inline-flex p-3 rounded-lg bg-pink-100 mb-4 w-fit">
                    <category.icon className="h-6 w-6 text-pink-600" />
                  </div>
                  <CardTitle className="text-2xl">{category.title}</CardTitle>
                  <p className="text-gray-600 mt-2">{category.description}</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {category.topics.map((topic) => (
                      <li key={topic} className="flex items-center gap-2 text-gray-700">
                        <div className="w-1.5 h-1.5 rounded-full bg-pink-600"></div>
                        {topic}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Coming Soon */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <Card className="max-w-3xl mx-auto text-center">
            <CardContent className="pt-12 pb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                더 많은 교육 자료 준비 중
              </h2>
              <p className="text-gray-600 mb-6">
                곧 더 다양하고 유익한 메이크업 교육 자료를 제공할 예정입니다.
                <br />
                메이크업에 대한 궁금한 점이 있으시다면 언제든 문의해 주세요!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href="tel:02-323-3321" className="text-pink-600 hover:text-pink-700 font-medium">
                  전화 문의: 02-323-3321
                </a>
                <span className="text-gray-300 hidden sm:block">|</span>
                <a
                  href="https://pf.kakao.com/_lXVVxb"
                  target="_blank"
                  className="text-pink-600 hover:text-pink-700 font-medium"
                >
                  카카오톡 문의
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
