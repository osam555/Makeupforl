import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Phone, MessageCircle } from 'lucide-react'

export default function ContactSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-[#FDF4F3] to-rose-50">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            메이크업과 에스테틱의 모든 과정은
            <br />
            <span className="text-[#F46E65]">100% 예약제</span>로 진행됩니다
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 max-w-4xl mx-auto">
          {/* Phone Contact */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex p-4 rounded-full bg-[#FDECEA] mb-4">
                <Phone className="h-8 w-8 text-[#F46E65]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">전화 상담</h3>
              <p className="text-gray-600 mb-6">
                전화주시면 친절하게 상담해드리겠습니다
              </p>
              <Link href="tel:02-323-3321" className="w-full">
                <Button size="lg" className="w-full bg-[#F46E65] hover:bg-[#E2564C] text-lg">
                  02-323-3321
                </Button>
              </Link>
              <p className="mt-4 text-sm text-gray-500">
                평일 09:00 ~ 22:00<br />
                토요일 09:00 ~ 18:00<br />
                일요일 10:00 ~ 17:00
              </p>
            </div>
          </Card>

          {/* KakaoTalk Contact */}
          <Card className="p-8 hover:shadow-lg transition-shadow">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex p-4 rounded-full bg-yellow-100 mb-4">
                <MessageCircle className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">카카오톡 상담</h3>
              <p className="text-gray-600 mb-6">
                채팅이 편하신 분들은 카카오채팅을 이용하세요
              </p>
              <Link href="https://pf.kakao.com/_lXVVxb" target="_blank" className="w-full">
                <Button
                  size="lg"
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-lg"
                >
                  메이크업포엘 채팅하기
                </Button>
              </Link>
              <p className="mt-4 text-sm text-gray-500">
                24시간 메시지 가능<br />
                실시간 답변 시간: 평일 09:00 ~ 22:00
              </p>
            </div>
          </Card>
        </div>

        {/* Location Info */}
        <div className="mt-12 text-center">
          <p className="text-gray-600">
            <span className="font-semibold">오시는 길:</span> 서울시 강남구 논현로 158길14 영빌딩 3층
          </p>
        </div>
      </div>
    </section>
  )
}
