import { Metadata } from 'next'
import BookingForm from '@/components/booking/BookingForm'

export const metadata: Metadata = {
  title: '예약안내 | 메이크업포엘',
  description: '메이크업포엘 예약 안내. 샵 서비스 및 출장 메이크업 예약을 진행하세요.',
}

export default function ReservationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-white py-12">
      <div className="mx-auto max-w-3xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl mb-4">
            예약안내
          </h1>
          <p className="text-lg text-gray-600">
            메이크업과 에스테틱의 모든 과정은 <span className="font-semibold text-pink-600">100% 예약제</span>로 진행됩니다
          </p>
        </div>

        {/* Booking Form */}
        <BookingForm />

        {/* Additional Info */}
        <div className="mt-12 space-y-6">
          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">예약 안내사항</h2>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-pink-600 font-bold">•</span>
                <span>예약은 최소 3일 전에 해주시기 바랍니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-600 font-bold">•</span>
                <span>예약 변경이나 취소는 1일 전까지 가능합니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-600 font-bold">•</span>
                <span>당일 예약 취소나 노쇼의 경우 다음 예약이 제한될 수 있습니다.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-600 font-bold">•</span>
                <span>출장 메이크업은 최소 1주일 전 예약을 권장합니다.</span>
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-bold text-gray-900 mb-4">문의 안내</h2>
            <div className="space-y-3 text-gray-700">
              <p className="flex items-center gap-2">
                <span className="font-semibold">전화:</span>
                <a href="tel:02-323-3321" className="text-pink-600 hover:text-pink-700">
                  02-323-3321
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold">카카오톡:</span>
                <a
                  href="https://pf.kakao.com/_lXVVxb"
                  target="_blank"
                  className="text-pink-600 hover:text-pink-700"
                >
                  메이크업포엘
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="font-semibold">영업시간:</span>
                <span>평일 09:00~22:00, 토요일 09:00~18:00, 일요일 10:00~17:00</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
