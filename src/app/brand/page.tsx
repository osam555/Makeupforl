import { Metadata } from 'next'
import Link from 'next/link'
import { MapPin, Phone, Clock, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: '브랜드소개 | 메이크업포엘',
  description:
    '20년, 1만 명의 고객. 메이크업&헤어 아티스트와 컬러 컨설턴트 55명이 함께하는 혼주 메이크업 전문 메이크업포엘입니다.',
  keywords: '메이크업포엘, 김성희, 혼주메이크업 전문, 강남 메이크업',
}

const LICENSES = [
  '메이크업 국가자격증',
  '피부 국가자격증',
  '헤어 국가자격증',
  '국제아토피 상담사 라이센스 (문제성 피부)',
  '이미지메이킹 라이센스',
  '퍼스널컬러 진단 라이센스',
  '뷰티 창업상담사',
]

const CAREER = [
  '미국 특수분장 전공',
  '협회 부회장 역임',
  '장관상 수상',
  '뷰티 앱 개발',
  '서울시 강사',
  '웨딩홀 운영',
  '드라마 전속 협력',
  '정부 인사 메이크업',
  '기업행사·방송 출연',
  '전통축제·패션쇼 다수',
  '예술의전당 공연 분장',
  '연세대·서강대 창업박람회',
]

export default function BrandPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-gradient-to-br from-pink-50 to-white py-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <p className="text-xs font-bold tracking-[0.3em] text-pink-600">BRAND STORY</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            메이크업포엘 소개
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-gray-600">
            메이크업 전 전문가의 <b className="text-pink-600">1:1 사전 컨설팅</b>을 통해 퍼스널컬러
            진단, 어울리는 헤어스타일 점검 후 메이크업을 진행합니다.
          </p>
        </div>
      </section>

      {/* 대표 인사말 */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">대표 인사말</h2>
          <blockquote className="mt-8 space-y-5 border-l-4 border-pink-200 pl-6 text-[17px] leading-[1.95] text-gray-700">
            <p>안녕하세요. 메이크업포엘 대표 김성희입니다.</p>
            <p>
              메이크업디자이너로 지낸 20년 동안 <b>1만 명이 넘는 고객</b>을 만났습니다. 20년의
              시간은 한 사람의 아름다운 얼굴의 완성을 위해 필요한 시간이었습니다.
            </p>
            <p>
              저희 메이크업포엘은 여러분의 선택과 믿음으로 여기까지 왔습니다. 그동안 저희를
              사랑해주신 모든 분들께 진심으로 고개 숙여 감사드리며,{' '}
              <b className="text-pink-700">이제 그 사랑을 돌려드리겠습니다.</b>
            </p>
          </blockquote>
          <p className="mt-6 text-right text-sm font-semibold text-gray-500">
            메이크업포엘 대표원장 김성희
          </p>
        </div>
      </section>

      {/* 회사 소개 */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-5xl px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">회사 소개</h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['20년', '메이크업 경력'],
              ['1만 명+', '누적 고객'],
              ['55명', '아티스트·컬러 컨설턴트'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <p className="text-3xl font-bold text-pink-600">{v}</p>
                <p className="mt-1 text-sm text-gray-600">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-7">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Award className="h-5 w-5 text-pink-600" />
                보유 자격
              </h3>
              <ul className="mt-4 space-y-2.5 text-[15px] text-gray-600">
                {LICENSES.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="text-pink-500">·</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-7">
              <h3 className="text-lg font-bold text-gray-900">대표 약력</h3>
              <ul className="mt-4 grid gap-2.5 text-[15px] text-gray-600 sm:grid-cols-2">
                {CAREER.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="text-pink-500">·</span>
                    {x}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 왜 메이크업포엘인가 */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">왜 메이크업포엘인가?</h2>
          <div className="mt-8 space-y-4">
            {[
              [
                '혼주만을 위한 전문점',
                '신부 전문 샵에서 부수적으로 다뤄지는 혼주가 아니라, 혼주 한 분께 온전히 집중합니다.',
              ],
              [
                '메이크업 전 1:1 사전 컨설팅',
                '퍼스널컬러 진단, 어울리는 헤어스타일 점검을 먼저 하고 당일에 임합니다.',
              ],
              [
                '중년의 얼굴을 아는 기술',
                '쳐진 눈꺼풀, 패인 주름, 정수리 탈모, 적은 숱까지 이해하고 다룹니다.',
              ],
              [
                '합법적인 정식 업체',
                '국가자격증과 면허를 갖춘 아티스트가 정식 허가 업체를 통해 서비스합니다.',
              ],
            ].map(([t, d]) => (
              <div key={t} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-gray-900">{t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/wed100"
              className="rounded-xl bg-pink-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-pink-700"
            >
              혼주메이크업 100문100답 보기
            </Link>
            <Link
              href="/consultation"
              className="rounded-xl border border-gray-200 px-6 py-3.5 text-sm font-bold text-gray-900 transition hover:border-gray-300"
            >
              1:1 사전컨설팅
            </Link>
          </div>
        </div>
      </section>

      {/* 오시는 길 */}
      <section className="bg-gray-50 py-20">
        <div className="mx-auto max-w-4xl px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900">오시는 길</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <MapPin className="h-5 w-5 text-pink-600" />
              <h3 className="mt-3 font-bold text-gray-900">주소</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                서울시 강남구 논현로 158길14
                <br />
                영빌딩 3층
              </p>
              <p className="mt-2 text-xs text-gray-500">압구정역 3번출구 역세권</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <Phone className="h-5 w-5 text-pink-600" />
              <h3 className="mt-3 font-bold text-gray-900">연락처</h3>
              <a
                href="tel:02-323-3321"
                className="mt-1.5 block text-sm font-semibold text-pink-600"
              >
                02-323-3321
              </a>
              <a
                href="mailto:makeupforl@naver.com"
                className="mt-1 block text-sm text-gray-600"
              >
                makeupforl@naver.com
              </a>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <Clock className="h-5 w-5 text-pink-600" />
              <h3 className="mt-3 font-bold text-gray-900">영업시간</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                평일 09:00~22:00
                <br />
                토요일 09:00~18:00
                <br />
                일요일 10:00~17:00
              </p>
            </div>
          </div>
          <p className="mt-6 text-xs text-gray-500">
            모든 과정은 100% 예약제로 진행됩니다. 방문 전 반드시 예약해 주세요.
          </p>
        </div>
      </section>
    </div>
  )
}
