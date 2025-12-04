import { Metadata } from 'next'
import { Award, Heart, Sparkles, Users } from 'lucide-react'

export const metadata: Metadata = {
  title: '브랜드소개 | 메이크업포엘',
  description: '메이크업포엘은 전문가의 1:1 사전 컨설팅을 통한 프라이빗 헤어 메이크업 서비스를 제공합니다.',
}

const features = [
  {
    icon: Heart,
    title: '1:1 맞춤 컨설팅',
    description: '고객님 한 분 한 분의 피부톤, 얼굴형, 스타일에 맞춘 전문가의 사전 컨설팅',
  },
  {
    icon: Sparkles,
    title: '퍼스널컬러 진단',
    description: '정확한 퍼스널컬러 분석을 통해 가장 잘 어울리는 메이크업 연출',
  },
  {
    icon: Award,
    title: '전문 메이크업 아티스트',
    description: '다년간의 경력과 노하우를 갖춘 전문 메이크업 아티스트',
  },
  {
    icon: Users,
    title: '프라이빗 서비스',
    description: '완전 예약제로 진행되는 편안하고 프라이빗한 메이크업 공간',
  },
]

export default function BrandPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-pink-50 to-white py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-6">
              메이크업포엘
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              나를 빛나게 하는 시간
              <br />
              전문가의 1:1 사전 컨설팅을 통한 프라이빗 헤어 메이크업
            </p>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">메이크업포엘 소개</h2>
            <div className="prose prose-lg text-gray-700 space-y-4">
              <p>
                메이크업포엘은 강남에 위치한 프리미엄 메이크업 전문샵으로,
                고객님 한 분 한 분의 소중한 날을 위한 맞춤형 메이크업 서비스를 제공합니다.
              </p>
              <p>
                우리의 가장 큰 차별점은 <strong className="text-pink-600">메이크업 전 전문가의 1:1 사전 컨설팅</strong>입니다.
                퍼스널컬러 진단, 어울리는 헤어스타일 점검을 통해 고객님께 가장 잘 어울리는
                메이크업을 연출해 드립니다.
              </p>
              <p>
                웨딩, 혼주, 하객, 기업 행사, 프로필 촬영 등 다양한 목적의 메이크업 경험을 보유하고 있으며,
                샵 서비스뿐만 아니라 출장 메이크업 서비스도 제공하여 고객님이 원하는 시간과
                장소에서 편안하게 서비스를 받으실 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">왜 메이크업포엘인가?</h2>
            <p className="text-lg text-gray-600">
              메이크업포엘만의 특별한 서비스
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pink-100 mb-4">
                  <feature.icon className="h-8 w-8 text-pink-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">오시는 길</h2>
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">주소</h3>
                <p className="text-gray-700">서울시 강남구 논현로 158길14 영빌딩 3층</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">전화</h3>
                <p className="text-gray-700">02-323-3321</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">영업시간</h3>
                <p className="text-gray-700">
                  평일: 09:00 ~ 22:00<br />
                  토요일: 09:00 ~ 18:00<br />
                  일요일: 10:00 ~ 17:00
                </p>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm text-pink-600 font-semibold">
                  ※ 모든 서비스는 100% 예약제로 운영됩니다
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
