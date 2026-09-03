import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Phone, Clock, Award } from 'lucide-react'

import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'
import { BRAND_POINTS } from '@/lib/brandPoints'

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

export default async function BrandPage() {
  const img = await getSiteImages()
  return (
    <div className="min-h-screen bg-white">
      {/*
        브랜드소개는 사진 없이 제목만 둔다. 공용 sub-hero 가 신부 인물 사진이라
        바로 아래 대표원장 인사말과 인물이 겹쳐 보였다.
        탭은 SubTabs 가 헤더 메뉴에서 자동으로 만들고, 스크롤에 따라 활성이 움직인다.
      */}
      <SubHero title="브랜드 소개" />
      {/* 대표 인사말 — 원본: .greeting .top-con (bg #F4F4F4, padding 68px 100px 0, mb 55px)
          .tt-wrap { padding-right:615px; padding-bottom:72px } + ceo.png 389×476 우측 하단 */}
      <div className="mfl-contain">
        <div className="mfl-real pt-[53px]">
          <div className="relative mb-[55px] overflow-hidden bg-[#F4F4F4] px-6 pt-10 sm:px-12 sm:pt-16 lg:px-[100px] lg:pt-[68px]">
            <div className="relative pb-10 lg:pb-[72px] lg:pr-[615px]">
              <p className="mb-[10px] text-[20px] font-medium leading-[1.6] text-[#F46E65]">
                안녕하세요.
                <br className="sm:hidden" /> 메이크업포엘 대표 김성희입니다.
              </p>
              <div className="space-y-[25px] text-[16px] leading-[1.647] text-[#242424]">
                <p>
                  메이크업디자이너로 지낸 20년동안 1만명이 넘는 고객을 만났습니다.
                  <br className="hidden sm:block" /> 20년의 시간은 한사람의 아름다운 얼굴의 완성을
                  위해 필요한 시간이었습니다.
                </p>
                <p>저희 메이크업포엘은 여러분의 선택과 믿음으로 여기까지 왔습니다.</p>
                <p>
                  그동안 저희를 사랑해주신 모든분들께 진심으로 고개숙여 감사드리며,
                  <br className="hidden sm:block" /> 이제 그 사랑을 돌려드리겠습니다.
                </p>
              </div>
            </div>
            <div className="pointer-events-none absolute bottom-0 right-0 hidden h-[476px] w-[389px] lg:block">
              <Image
                src={img['ceo']}
                alt="메이크업포엘 대표원장 김성희"
                fill
                sizes="389px"
                className="object-contain object-right-bottom"
                priority
              />
            </div>
            <div className="relative mx-auto h-[280px] w-[230px] lg:hidden">
              <Image
                src={img['ceo']}
                alt="메이크업포엘 대표원장 김성희"
                fill
                sizes="230px"
                className="object-contain object-bottom"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 회사 소개 */}
      <section id="company" className="scroll-mt-20 bg-gray-50 py-20">
        <div className="mfl-contain max-w-[1200px]">
          <h2 className="text-2xl font-bold text-gray-900">회사 소개</h2>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ['20년', '메이크업 경력'],
              ['1만 명+', '누적 고객'],
              ['55명', '아티스트·컬러 컨설턴트'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                <p className="text-3xl font-bold text-[#F46E65]">{v}</p>
                <p className="mt-1 text-sm text-gray-600">{l}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-gray-200 bg-white p-7">
              <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900">
                <Award className="h-5 w-5 text-[#F46E65]" />
                보유 자격
              </h3>
              <ul className="mt-4 space-y-2.5 text-[15px] text-gray-600">
                {LICENSES.map((x) => (
                  <li key={x} className="flex gap-2">
                    <span className="text-[#F46E65]">·</span>
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
                    <span className="text-[#F46E65]">·</span>
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
        <div className="mfl-contain max-w-[1000px]">
          <h2 className="text-2xl font-bold text-gray-900">왜 메이크업포엘인가?</h2>
          <div className="mt-8 space-y-4">
            {BRAND_POINTS.map(({ title: t, desc: d }) => (
              <div key={t} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h3 className="font-bold text-gray-900">{t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-gray-600">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/honjoo100"
              className="rounded-xl bg-[#F46E65] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#E2564C]"
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
      <section id="location" className="scroll-mt-20 bg-gray-50 py-20">
        <div className="mfl-contain max-w-[1000px]">
          <h2 className="text-2xl font-bold text-gray-900">오시는 길</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <MapPin className="h-5 w-5 text-[#F46E65]" />
              <h3 className="mt-3 font-bold text-gray-900">주소</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                서울 강남구 논현로157길 12
                <br />
                평화빌딩 201호
              </p>
              <p className="mt-2 text-xs text-gray-500">압구정역 3번출구 역세권</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-6">
              <Phone className="h-5 w-5 text-[#F46E65]" />
              <h3 className="mt-3 font-bold text-gray-900">연락처</h3>
              <a
                href="tel:02-323-3321"
                className="mt-1.5 block text-sm font-semibold text-[#F46E65]"
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
              <Clock className="h-5 w-5 text-[#F46E65]" />
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
