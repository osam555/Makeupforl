import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Sparkles, MapPin, ArrowRight } from 'lucide-react'

const services = [
  {
    icon: Sparkles,
    title: '샵서비스',
    description: '고객님 한분한분의 소중한 날을 위한 프라이빗 헤어 메이크업',
    features: [
      '전문가 1:1 사전 컨설팅',
      '퍼스널컬러 진단',
      '헤어스타일 점검',
      '프라이빗 공간 제공',
    ],
    href: '/services/shop',
    gradient: 'from-[#FDF4F3]0 to-rose-500',
  },
  {
    icon: MapPin,
    title: '출장메이크업',
    description: '"Anytime, Anywhere" 고객이 원하는 시간에 원하는 장소에서',
    features: [
      '원하는 장소 방문',
      '시간 자유 선택',
      '웨딩, 행사 전문',
      '이동 장비 완비',
    ],
    href: '/services/onsite',
    gradient: 'from-rose-500 to-[#FDF4F3]0',
  },
]

export default function ServiceCards() {
  return (
    <section id="services" className="py-24 bg-white">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            메이크업포엘의 서비스는 다릅니다!
          </h2>
          <p className="mt-4 text-lg text-gray-600">
            메이크업 전 전문가의 1:1 사전 컨설팅을 통해 퍼스널컬러 진단,
            <br />
            어울리는 헤어스타일 점검 후 메이크업을 진행합니다.
          </p>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {services.map((service) => (
            <Card
              key={service.title}
              className="relative overflow-hidden border-none shadow-lg hover:shadow-xl transition-all duration-300 group"
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${service.gradient} opacity-5 group-hover:opacity-10 transition-opacity`}></div>

              <CardHeader className="relative">
                <div className={`inline-flex p-3 rounded-lg bg-gradient-to-br ${service.gradient} mb-4`}>
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-2xl">{service.title}</CardTitle>
                <CardDescription className="text-base text-gray-600 mt-2">
                  {service.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="relative">
                <ul className="space-y-3 mb-6">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full bg-gradient-to-br ${service.gradient}`}></div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link href={service.href}>
                  <Button
                    className={`w-full bg-gradient-to-r ${service.gradient} hover:opacity-90 transition-opacity group`}
                  >
                    자세히 보기
                    <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <p className="text-sm text-gray-600">
            메이크업과 에스테틱의 모든 과정은 <span className="font-semibold text-[#F46E65]">100% 예약제</span>로 진행됩니다.
          </p>
        </div>
      </div>
    </section>
  )
}
