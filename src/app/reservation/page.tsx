import { Metadata } from 'next'
import BookingForm from '@/components/booking/BookingForm'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'

export const metadata: Metadata = {
  title: '예약안내 | 메이크업포엘',
  description:
    '메이크업포엘 예약 안내. 문의 → 예약 → 1:1 사전컨설팅 → 당일 서비스까지 8단계로 진행됩니다. 예약금·환불 규정 안내.',
}

const STEPS = [
  { n: 1, t: '문의', d: '전화 또는 카카오채팅으로 문의해 주세요.' },
  { n: 2, t: '예약', d: '예약계좌로 여자 1분 기준 5만원을 입금해 주시면 예약이 확정됩니다.' },
  {
    n: 3,
    t: '사전컨설팅',
    d: '샵에 방문해 1:1 컨설팅을 받습니다. 지방·해외에 계시거나 방문이 어려우시면 원격 컨설팅으로 진행합니다.',
  },
  { n: 4, t: '개인차트 작성', d: '컨설팅 내용을 바탕으로 고객님 전용 차트를 작성합니다.' },
  { n: 5, t: '디자인 및 준비', d: '당일 연출할 디자인을 미리 준비하고 필요한 재료를 점검합니다.' },
  { n: 6, t: '행사 일주일 전 최종점검', d: '전화통화로 시간과 안내사항을 다시 확인합니다.' },
  { n: 7, t: '안내메시지 발송', d: '메이크업 전 준비하실 사항을 메시지로 보내드립니다.' },
  { n: 8, t: '당일 서비스', d: '예약된 시간에 서비스를 제공해 드립니다.' },
]

const REFUND = [
  { when: '행사 3주 전', rate: '전액 환불', tone: 'text-emerald-700 bg-emerald-50' },
  { when: '행사 2주 전', rate: '30% 환불', tone: 'text-amber-700 bg-amber-50' },
  { when: '행사 1주 전', rate: '환불 불가', tone: 'text-red-700 bg-red-50' },
]

export default async function ReservationPage() {
  const img = await getSiteImages()
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FDF4F3] to-white">
      <SubHero title="예약안내" image={img['sub-hero']} />
      <div className="mfl-contain max-w-[900px] py-12">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="text-lg text-gray-600">
            메이크업의 모든 과정은{' '}
            <span className="font-semibold text-[#F46E65]">100% 예약제</span>로 진행됩니다
          </p>
          <p className="mt-2 text-sm text-gray-500">
            아래 중 편한 방법으로 문의 주시면 친절하고 상세하게 안내드리겠습니다.
          </p>
        </div>

        {/* 문의 방법 */}
        <div className="mb-10 grid gap-3 sm:grid-cols-2">
          <a
            href="tel:02-323-3321"
            className="rounded-xl bg-[#F46E65] px-6 py-5 text-center text-white shadow-sm transition hover:bg-[#E2564C]"
          >
            <span className="block text-xs opacity-90">전화 문의</span>
            <span className="mt-1 block text-xl font-bold">02-323-3321</span>
          </a>
          <a
            href="https://pf.kakao.com/_lXVVxb"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-[#F8C3BF] bg-white px-6 py-5 text-center shadow-sm transition hover:border-[#F46E65]"
          >
            <span className="block text-xs text-gray-500">카카오톡 채팅</span>
            <span className="mt-1 block text-xl font-bold text-gray-900">메이크업포엘</span>
          </a>
        </div>

        {/* Booking Form */}
        <BookingForm />

        {/* 진행 절차 */}
        <div className="mt-12 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-xl font-bold text-gray-900">예약 진행 절차</h2>
          <p className="mb-6 text-sm text-gray-500">
            문의부터 당일 서비스까지 8단계로 꼼꼼하게 준비해 드립니다.
          </p>
          <ol className="space-y-4">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#F46E65] text-xs font-bold text-white">
                  {s.n}
                </span>
                <span>
                  <span className="block font-semibold text-gray-900">{s.t}</span>
                  <span className="mt-0.5 block text-sm leading-relaxed text-gray-600">{s.d}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>

        {/* 예약금 */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">예약금 안내</h2>
          <div className="rounded-lg bg-[#FDF4F3] p-4">
            <p className="text-sm text-gray-700">
              예약금 <span className="font-bold text-[#E2564C]">여자 1인 기준 5만원</span>
            </p>
            <p className="mt-2 text-sm text-gray-700">
              신한은행 <span className="font-semibold">110-474-881691</span>
              <span className="ml-2 text-gray-500">예금주 김성희(메이크업포엘)</span>
            </p>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            예약금 입금이 확인되면 예약이 확정되며, 잔액은 당일 결제하시면 됩니다.
            정확한 금액은 인원·서비스 종류에 따라 달라지므로 문의 시 안내해 드립니다.
          </p>
        </div>

        {/* 환불 규정 */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">취소·환불 규정</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {REFUND.map((r) => (
              <div key={r.when} className={`rounded-lg p-4 text-center ${r.tone}`}>
                <p className="text-xs font-medium opacity-80">{r.when}</p>
                <p className="mt-1 text-base font-bold">{r.rate}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            예식일이 가까울수록 다른 고객의 예약을 받을 수 없기 때문에 위와 같이 운영하고 있습니다.
            일정 변경이 필요하시면 가능한 한 빨리 연락 주세요.
          </p>
        </div>

        {/* 문의 안내 */}
        <div className="mt-6 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-bold text-gray-900">문의 안내</h2>
          <div className="space-y-3 text-gray-700">
            <p className="flex items-center gap-2">
              <span className="font-semibold">전화:</span>
              <a href="tel:02-323-3321" className="text-[#F46E65] hover:text-[#E2564C]">
                02-323-3321
              </a>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-semibold">카카오톡:</span>
              <a
                href="https://pf.kakao.com/_lXVVxb"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#F46E65] hover:text-[#E2564C]"
              >
                메이크업포엘
              </a>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-semibold">이메일:</span>
              <a href="mailto:makeupforl@naver.com" className="text-[#F46E65] hover:text-[#E2564C]">
                makeupforl@naver.com
              </a>
            </p>
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">영업시간:</span>
              <span>평일 09:00~22:00, 토요일 09:00~18:00, 일요일 10:00~17:00</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
