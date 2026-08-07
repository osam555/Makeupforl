import { Metadata } from 'next'
import Link from 'next/link'
import { Headphones, Palette, Scissors, Shirt, CalendarCheck, Search } from 'lucide-react'

import { getPublishedWed100Items, wed100Parts } from '@/lib/wed100'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'

export const metadata: Metadata = {
  title: '교육자료 | 메이크업포엘',
  description:
    '혼주메이크업 100문100답을 비롯해 메이크업포엘이 정리한 자료 모음. 예약·컨설팅·메이크업·헤어·한복·예식 당일까지 궁금한 것을 찾아보세요.',
}

const PART_ICON = [Search, Palette, Palette, Scissors, Shirt, CalendarCheck]

export default async function EducationPage() {
  const items = await getPublishedWed100Items()
  const img = await getSiteImages()
  const counts = new Map<number, number>()
  items.forEach((x) => counts.set(x.part, (counts.get(x.part) ?? 0) + 1))
  const totalMin = Math.round(
    items.reduce(
      (a, x) => a + (x.duration ?? x.cues.reduce((b, c) => b + c.ko.length, 0) / 5.2 + 6),
      0,
    ) / 60,
  )
  const picks = ['p1-01', 'p1-09', 'p3-01', 'p4-01', 'p5-01', 'p6-01']
    .map((s) => items.find((x) => x.slug === s))
    .filter(Boolean)

  return (
    <div className="min-h-screen bg-white">
      <SubHero title="교육자료" image={img['sub-hero']} />
      <section className="bg-gradient-to-br from-[#FDF4F3] to-white py-14">
        <div className="mfl-contain max-w-[1000px] text-center">
          <p className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-600">
            25년간 1만 명의 혼주님을 만나며 쌓인 질문과 답을 정리했습니다.
            읽으셔도 되고, 들으셔도 됩니다.
          </p>
        </div>
      </section>

      {/* 100문100답 메인 */}
      <section className="py-16">
        <div className="mfl-contain max-w-[1200px]">
          <div className="overflow-hidden rounded-3xl border border-[#FADEDC] bg-gradient-to-br from-white to-[#FDF4F3] p-8 sm:p-10">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F46E65] px-3 py-1 text-xs font-bold text-white">
              <Headphones className="h-3.5 w-3.5" /> 대표 자료
            </span>
            <h2 className="mt-5 text-3xl font-bold text-gray-900">혼주메이크업 100문 100답</h2>
            <p className="mt-3 text-[16px] leading-[1.85] text-gray-600">
              결혼식 날, 후회하면 늦습니다. 업체 선정부터 예식 당일까지 혼주님이 가장 많이 묻는
              질문에 대표원장이 하나씩 답했습니다. 각 질문마다 음성과 자막(한국어·English)을
              제공하니 눈이 피로하실 땐 들으셔도 됩니다.
            </p>
            <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
              {[
                [String(items.length), '질문'],
                [String(wed100Parts.length), '파트'],
                [`약 ${totalMin}분`, '오디오'],
                ['한 / EN', '자막'],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-2xl font-bold text-[#F46E65]">{v}</dt>
                  <dd className="text-xs text-gray-500">{l}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/wed100"
                className="rounded-xl bg-[#F46E65] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#E2564C]"
              >
                100문100답 전체 보기
              </Link>
              {items[0] && (
                <Link
                  href={`/wed100/${items[0].slug}`}
                  className="rounded-xl border border-[#F8C3BF] bg-white px-6 py-3.5 text-sm font-bold text-gray-900 transition hover:border-[#F46E65]"
                >
                  ▶ 1번부터 듣기
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 파트별 */}
      <section className="pb-16">
        <div className="mfl-contain max-w-[1200px]">
          <h2 className="text-2xl font-bold text-gray-900">주제별로 찾아보기</h2>
          <p className="mt-2 text-sm text-gray-600">준비 순서 그대로 6개 파트로 나눴습니다.</p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {wed100Parts.map((p, i) => {
              const Icon = PART_ICON[i] ?? Search
              return (
                <Link
                  key={p.part}
                  href="/wed100"
                  className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FDECEA] text-[#F46E65]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <p className="mt-4 text-[11px] font-extrabold tracking-widest text-[#F46E65]">
                    PART {p.part}
                  </p>
                  <h3 className="mt-1 text-base font-bold text-gray-900">{p.title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">
                    {p.intro[0] ?? ''}
                  </p>
                  <p className="mt-3 text-xs font-bold text-[#F46E65]">
                    {counts.get(p.part) ?? 0}개 질문 →
                  </p>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* 많이 찾는 질문 */}
      <section className="bg-gray-50 py-16">
        <div className="mfl-contain max-w-[1200px]">
          <h2 className="text-2xl font-bold text-gray-900">이런 것들을 많이 물어보십니다</h2>
          <div className="mt-7 overflow-hidden rounded-2xl border border-gray-200 bg-white">
            {picks.map((x) => (
              <Link
                key={x!.slug}
                href={`/wed100/${x!.slug}`}
                className="flex items-center gap-4 border-b border-gray-100 px-5 py-4 text-sm last:border-0 hover:bg-[#FDF4F3]/40"
              >
                <span className="w-14 flex-none text-[11px] font-extrabold tracking-wider text-[#F46E65]">
                  P{x!.part}·{String(x!.n).padStart(2, '0')}
                </span>
                <span className="flex-1 font-medium text-gray-900">{x!.question}</span>
                <span className="flex-none text-xs text-gray-400">듣기 →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="mfl-contain max-w-[900px] text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            읽고 들으셨다면, 이제 얼굴을 직접 봐야 합니다
          </h2>
          <p className="mt-3 leading-relaxed text-gray-600">
            혼주 메이크업은 얼굴 골격·피부 상태·한복 색에 따라 답이 달라집니다.
            <br />
            1:1 사전 컨설팅에서 원장이 직접 진단해 드립니다.
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
