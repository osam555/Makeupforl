import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'
import { Home, Car, ShieldCheck, AlertTriangle } from 'lucide-react'

export const metadata: Metadata = {
  title: '샵 / 출장메이크업 | 메이크업포엘',
  description:
    '압구정역 3번출구 프라이빗 1인실 샵과, 원하는 시간·장소로 찾아가는 출장 메이크업 O2O 서비스. 국가자격증을 보유한 정식 허가 업체입니다.',
  keywords: '강남 메이크업샵, 출장메이크업, 혼주 출장메이크업, 압구정 메이크업',
}

const PROCESS = [
  { n: 1, t: '문의', d: '전화 또는 카카오채팅으로 문의' },
  { n: 2, t: '예약', d: '예약금 입금으로 일정 확정' },
  { n: 3, t: '사전컨설팅', d: '샵 방문 또는 원격 컨설팅' },
  { n: 4, t: '디자인 및 준비', d: '디자인 확정, 재료 점검' },
  { n: 5, t: '행사 일주일 전 최종점검', d: '시간·안내사항 재확인' },
  { n: 6, t: '안내메시지 발송', d: '메이크업 전 준비사항 안내' },
  { n: 7, t: '당일 서비스', d: '예약 시간에 서비스 제공' },
]

export default async function ServicesPage() {
  const img = await getSiteImages()
  return (
    <div className="min-h-screen bg-white">
      <SubHero title="샵 / 출장메이크업" image={img['sub-hero']} />
      <section className="bg-gradient-to-br from-[#FDF4F3] to-white py-16">
        <div className="mfl-contain max-w-[1200px] text-center">
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
            메이크업포엘의 서비스는 다릅니다. 메이크업 전 전문가의 1:1 사전 컨설팅을 통해 퍼스널컬러
            진단과 어울리는 헤어스타일 점검을 마친 뒤 메이크업을 진행합니다.
          </p>
        </div>
      </section>

      {/* 두 가지 서비스 */}
      <section className="py-16">
        <div className="mfl-contain max-w-[1200px]">
          <div className="grid gap-6 md:grid-cols-2">
            {/* 샵 */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="relative aspect-[16/10] bg-gray-100">
                <Image src={img['shop-bg']} alt="메이크업포엘 샵 전경" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div className="p-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FDECEA] text-[#F46E65]">
                <Home className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-xl font-bold text-gray-900">샵 서비스</h2>
              <p className="mt-2 text-sm font-medium text-[#F46E65]">
                고객님 한 분 한 분의 소중한 날을 위한 프라이빗 헤어 메이크업
              </p>
              <p className="mt-4 text-[15px] leading-[1.85] text-gray-600">
                깔끔한 실내전경, 분리된 공간, 1인실 보유.
                <br />
                압구정역 3번출구 역세권에 위치한 샵에서 조용하고 편리한 메이크업 &amp; 헤어 서비스를
                받으실 수 있습니다.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-gray-600">
                <li>· 프라이빗 1인실</li>
                <li>· 압구정역 3번출구 도보 거리</li>
                <li>· 사전 컨설팅 후 진행</li>
              </ul>
              </div>
            </div>

            {/* 출장 */}
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="relative aspect-[16/10] bg-gray-100">
                <Image src={img['makeup-img']} alt="출장 메이크업 서비스" fill sizes="(max-width:768px) 100vw, 50vw" className="object-cover" />
              </div>
              <div className="p-8">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#FDECEA] text-[#F46E65]">
                <Car className="h-5 w-5" />
              </span>
              <h2 className="mt-5 text-xl font-bold text-gray-900">출장 메이크업</h2>
              <p className="mt-2 text-sm font-medium text-[#F46E65]">
                Anytime, Anywhere — 고객이 원하는 시간에 원하는 장소에서
              </p>
              <p className="mt-4 text-[15px] leading-[1.85] text-gray-600">
                행사 당일, 집 또는 나만의 공간에서 편하게 메이크업을 받고 싶으신가요?
                모든 준비를 갖춘 전문가 아티스트가 행사 당일 고객님을 찾아가서 메이크업·헤어
                서비스를 제공해 드리는{' '}
                <b className="text-gray-800">찾아가는 메이크업 O2O 서비스</b>입니다.
              </p>
              <ul className="mt-5 space-y-2 text-sm text-gray-600">
                <li>· 자택·예식장·촬영장 어디든</li>
                <li>· 전문가 팀 단위 출장 가능</li>
                <li>· 사전 컨설팅 후 진행</li>
              </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 주의사항 */}
      <section className="pb-16">
        <div className="mfl-contain max-w-[1200px]">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-7">
            <h2 className="flex items-center gap-2 text-lg font-bold text-amber-900">
              <AlertTriangle className="h-5 w-5" />
              출장메이크업 신청 시 꼭 확인하세요
            </h2>
            <p className="mt-4 text-[15px] leading-[1.85] text-amber-900/90">
              출장메이크업 서비스는 오직 <b>메이크업 국가자격증</b>과 <b>면허증</b>을 소지한
              아티스트만, 정식 영업 허가를 받은 업체를 통해 <b>합법적으로</b> 제공할 수 있는
              서비스입니다. 메이크업포엘은 위 조건에 모두 부합합니다.
            </p>
            <p className="mt-3 text-[15px] leading-[1.85] text-amber-900/90">
              블로그·인스타그램·카페 등 플랫폼에서 개인 광고를 하고 불법으로 활동하는, 검증되지 않은
              출장 메이크업으로 인해 다양한 피해 사례가 발생하고 있습니다. 중요한 날인 만큼 합법적인
              곳을 통해 서비스 받으시길 권해드립니다.
            </p>
            <p className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-amber-800">
              <ShieldCheck className="h-4 w-4" />
              사업자등록 143-08-02484 · 통신판매업 2017-서울마포-0578
            </p>
          </div>
        </div>
      </section>

      {/* 진행 과정 */}
      <section className="bg-gray-50 py-16">
        <div className="mfl-contain max-w-[1200px]">
          <h2 className="text-2xl font-bold text-gray-900">진행 과정</h2>
          <p className="mt-2 text-sm text-gray-600">
            문의부터 당일 서비스까지, 빠짐없이 챙겨 드립니다.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map((p) => (
              <div key={p.n} className="rounded-xl border border-gray-200 bg-white p-5">
                <span className="text-xs font-extrabold tracking-widest text-[#F46E65]">
                  STEP {p.n}
                </span>
                <h3 className="mt-2 font-bold text-gray-900">{p.t}</h3>
                <p className="mt-1 text-sm text-gray-600">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mfl-contain max-w-[900px] text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            어떤 서비스가 맞을지 고민되시나요?
          </h2>
          <p className="mt-3 text-gray-600">
            1:1 사전 컨설팅에서 얼굴·피부·한복까지 보고 가장 맞는 방법을 안내해 드립니다.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/consultation"
              className="rounded-xl bg-[#F46E65] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#E2564C]"
            >
              1:1 사전컨설팅 알아보기
            </Link>
            <Link
              href="/reservation"
              className="rounded-xl border border-gray-200 px-6 py-3.5 text-sm font-bold text-gray-900 transition hover:border-gray-300"
            >
              예약 안내
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
