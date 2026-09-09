import Link from 'next/link'

export const metadata = { title: '연결이 끊겼습니다 | 메이크업포엘', robots: { index: false } }

/**
 * 인터넷이 끊겼을 때 보여 줄 화면.
 *
 * 전화번호를 크게 둔다. 연결이 끊긴 사람에게 가장 필요한 것은 이 사이트의
 * 다른 페이지가 아니라 사람에게 닿는 길이다.
 */
export default function Offline() {
  return (
    <div className="mfl-contain flex min-h-[60vh] max-w-[560px] flex-col justify-center py-20 text-center">
      <p className="text-[13px] font-bold tracking-[0.28em] text-[#F46E65]">OFFLINE</p>
      <h1 className="mt-3 text-2xl font-bold text-gray-900">연결이 끊겼습니다</h1>
      <p className="mt-3 text-[15px] leading-[1.9] text-gray-600">
        인터넷 연결을 확인해 주세요. 급하시면 전화로 바로 상담하실 수 있습니다.
      </p>
      <a
        href="tel:02-323-3321"
        className="mx-auto mt-6 rounded-xl bg-[#F46E65] px-7 py-3.5 text-base font-bold text-white"
      >
        02-323-3321
      </a>
      <Link href="/" className="mt-4 text-sm font-semibold text-gray-500 hover:text-gray-800">
        다시 시도하기
      </Link>
    </div>
  )
}
