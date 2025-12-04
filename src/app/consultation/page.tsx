import { Metadata } from 'next'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Palette, Scissors, MessageCircle, CalendarCheck } from 'lucide-react'

export const metadata: Metadata = {
  title: '1:1 사전컨설팅 | 메이크업포엘',
  description: '메이크업 전 전문가의 1:1 사전 컨설팅을 통해 퍼스널컬러 진단과 헤어스타일 점검을 받으세요.',
}

const consultationSteps = [
  {
    number: '01',
    title: '예약 및 상담 신청',
    description: '전화, 카카오톡, 또는 온라인으로 편리하게 예약하세요',
    icon: CalendarCheck,
  },
  {
    number: '02',
    title: '퍼스널컬러 진단',
    description: '고객님의 피부톤에 가장 잘 어울리는 컬러를 정확하게 분석합니다',
    icon: Palette,
  },
  {
    number: '03',
    title: '헤어스타일 컨설팅',
    description: '얼굴형과 스타일에 어울리는 헤어스타일을 제안해 드립니다',
    icon: Scissors,
  },
  {
    number: '04',
    title: '맞춤 메이크업',
    description: '컨설팅 결과를 바탕으로 완벽한 메이크업을 연출합니다',
    icon: MessageCircle,
  },
]

const benefits = [
  {
    title: '정확한 퍼스널컬러 분석',
    description: '웜톤/쿨톤 진단을 넘어 계절별 세부 컬러 분석으로 가장 아름답게 빛나는 컬러를 찾아드립니다.',
  },
  {
    title: '얼굴형 분석',
    description: '고객님의 얼굴형에 맞는 메이크업 포인트와 헤어스타일을 제안합니다.',
  },
  {
    title: '피부 타입 진단',
    description: '피부 상태를 정확히 파악하여 적합한 화장품과 메이크업 방법을 추천합니다.',
  },
  {
    title: '스타일 제안',
    description: 'TPO(Time, Place, Occasion)에 맞는 최적의 메이크업 스타일을 제안합니다.',
  },
]

export default function ConsultationPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-pink-50 to-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-6">
            1:1 사전컨설팅
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            메이크업 전 전문가의 1:1 사전 컨설팅을 통해
            <br />
            퍼스널컬러 진단, 어울리는 헤어스타일 점검 후 메이크업을 진행합니다
          </p>
        </div>
      </section>

      {/* Why Consultation */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              왜 사전 컨설팅이 필요한가요?
            </h2>
            <p className="text-lg text-gray-600">
              모든 사람은 고유한 아름다움을 가지고 있습니다.
              <br />
              사전 컨설팅을 통해 고객님만의 특별한 매력을 발견하고 극대화합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((benefit) => (
              <Card key={benefit.title} className="border-2 hover:border-pink-200 transition-colors">
                <CardHeader>
                  <CardTitle className="text-xl">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              컨설팅 진행 과정
            </h2>
            <p className="text-lg text-gray-600">
              체계적인 4단계 프로세스로 완벽한 메이크업을 준비합니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {consultationSteps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-pink-100 mb-4">
                  <step.icon className="h-10 w-10 text-pink-600" />
                </div>
                <div className="text-3xl font-bold text-pink-600 mb-2">{step.number}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What You'll Learn */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-8">
              컨설팅을 통해 얻을 수 있는 것
            </h2>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>나에게 어울리는 컬러</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    웜톤, 쿨톤, 봄/여름/가을/겨울 타입 등 세분화된 퍼스널컬러 분석을 통해
                    가장 잘 어울리는 립스틱, 블러셔, 아이섀도우 컬러를 알 수 있습니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>얼굴형에 맞는 메이크업 포인트</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    타원형, 둥근형, 각진형 등 얼굴형 분석을 통해 장점은 살리고
                    단점은 보완하는 메이크업 방법을 배울 수 있습니다.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>어울리는 헤어스타일</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700">
                    얼굴형, 이마 모양, 턱선 등을 고려하여 가장 잘 어울리는 헤어스타일과
                    헤어 컬러를 제안받을 수 있습니다.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-br from-pink-50 to-white">
        <div className="mx-auto max-w-7xl px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            나만의 아름다움을 발견하세요
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            전문가의 1:1 사전 컨설팅으로 가장 완벽한 메이크업을 준비하세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/reservation">
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700">
                컨설팅 예약하기
              </Button>
            </Link>
            <Link href="https://pf.kakao.com/_lXVVxb" target="_blank">
              <Button size="lg" variant="outline" className="border-pink-600 text-pink-600 hover:bg-pink-50">
                카카오톡 상담
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
