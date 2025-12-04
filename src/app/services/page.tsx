import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, Sparkles, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: '샵 / 출장메이크업 | 메이크업포엘',
  description: '메이크업포엘의 샵 서비스와 출장 메이크업 서비스를 확인하세요.',
}

const shopServices = [
  '전문가 1:1 사전 컨설팅',
  '퍼스널컬러 진단',
  '헤어스타일 점검 및 연출',
  '프라이빗 메이크업 공간',
  '프리미엄 화장품 사용',
  '메이크업 유지 팁 제공',
]

const onsiteServices = [
  '원하는 장소로 방문',
  '시간 자유 선택 가능',
  '웨딩, 행사 전문 메이크업',
  '이동 장비 완비',
  '퍼스널컬러 진단 포함',
  '헤어 스타일링 포함',
]

const serviceCategories = [
  { name: '웨딩 메이크업', description: '인생에서 가장 아름다운 날을 위한 완벽한 메이크업' },
  { name: '혼주 메이크업', description: '우아하고 품격 있는 혼주님을 위한 메이크업' },
  { name: '하객 메이크업', description: '결혼식, 파티에 어울리는 화사한 메이크업' },
  { name: '남자 메이크업', description: '자연스러우면서도 깔끔한 남성 메이크업' },
  { name: '기업행사 메이크업', description: '프레젠테이션, 촬영을 위한 전문 메이크업' },
  { name: '프로필 메이크업', description: '증명사진, 프로필 촬영을 위한 메이크업' },
]

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-pink-50 to-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-6">
            샵 / 출장메이크업
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            고객님의 니즈에 맞는 최적의 메이크업 서비스를 제공합니다
          </p>
        </div>
      </section>

      {/* Service Types */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Shop Service */}
            <Card className="border-2 hover:border-pink-200 transition-colors">
              <CardHeader>
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-pink-500 to-rose-500 mb-4 w-fit">
                  <Sparkles className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl">샵 서비스</CardTitle>
                <CardDescription className="text-base">
                  고객님 한분한분의 소중한 날을 위한 프라이빗 헤어 메이크업
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {shopServices.map((service) => (
                    <div key={service} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-pink-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{service}</span>
                    </div>
                  ))}
                </div>
                <Link href="/reservation">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-90">
                    샵 서비스 예약하기
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Onsite Service */}
            <Card className="border-2 hover:border-pink-200 transition-colors">
              <CardHeader>
                <div className="inline-flex p-3 rounded-lg bg-gradient-to-br from-rose-500 to-pink-500 mb-4 w-fit">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl">출장 메이크업</CardTitle>
                <CardDescription className="text-base">
                  "Anytime, Anywhere" 고객이 원하는 시간에 원하는 장소에서
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {onsiteServices.map((service) => (
                    <div key={service} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-pink-600 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{service}</span>
                    </div>
                  ))}
                </div>
                <Link href="/reservation">
                  <Button className="w-full bg-gradient-to-r from-rose-500 to-pink-500 hover:opacity-90">
                    출장 메이크업 예약하기
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Service Categories */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">다양한 메이크업 서비스</h2>
            <p className="text-lg text-gray-600">
              모든 순간을 특별하게 만들어 드립니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {serviceCategories.map((category) => (
              <Card key={category.name} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{category.name}</CardTitle>
                  <CardDescription>{category.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            메이크업 예약은 메이크업포엘에서
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            전문가의 1:1 컨설팅으로 가장 아름다운 모습을 만들어 드립니다
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/reservation">
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700">
                지금 예약하기
              </Button>
            </Link>
            <Link href="tel:02-323-3321">
              <Button size="lg" variant="outline" className="border-pink-600 text-pink-600 hover:bg-pink-50">
                전화 상담: 02-323-3321
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
