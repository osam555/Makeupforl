import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'

import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'

export const metadata: Metadata = {
  title: '1:1 사전컨설팅 | 메이크업포엘',
  description:
    '혼주 올림머리, 정수리 탈모, 퍼스널컬러 한복 색상까지. 25년 1만 명의 노하우로 결혼식 날 가장 잘 어울리는 모습을 미리 찾아드립니다.',
  keywords: '혼주 사전컨설팅, 혼주 올림머리, 퍼스널컬러 한복, 혼주 메이크업 상담',
}

const HELPS = [
  {
    n: 1,
    t: '혼주 올림머리 스타일 처방',
    d: '거울 앞에서 몇 가지 올림머리 스타일링을 보여드리고, 가장 잘 어울리고 젊고 세련돼 보이는 스타일을 찾아드립니다. 이 과정 없이 올림머리를 했다가 10살은 더 나이 들어 보였는데 시간에 쫓겨 수정할 수 없어 속상했다는 후기가 많아 준비했습니다.',
  },
  {
    n: 2,
    t: '정수리 탈모·가는 머리카락 보완',
    d: '혼주의 80%가 가지고 있는 정수리 탈모, 가늘고 숱이 적은 머리카락, 올림머리하기엔 짧은 길이 등을 어떻게 자연스럽게 보완할지 자세히 알려드립니다.',
  },
  {
    n: 3,
    t: '가발 스타일링',
    d: '건강이나 다양한 이유로 가발을 사용하시는 분들도, 가발을 많이 다뤄본 경험으로 충분히 아름답게 스타일링해 드립니다.',
  },
  {
    n: 4,
    t: '중년 피부에 맞는 메이크업',
    d: '아이들 키우느라 신경 쓰지 못한 시간 뒤에 남은 쳐진 눈꺼풀, 패인 주름, 탁한 피부, 두둑해진 얼굴형을 어떻게 메이크업하는 게 좋은지 컨설팅해 드립니다.',
  },
  {
    n: 5,
    t: '원하는 이미지로 이미지메이킹',
    d: '혼주는 결혼식장의 첫인상입니다. 단아한·고급스러운·세련된·젊어 보이는·우아한·화려한 등 보여주고 싶은 이미지를 고르시면 메이크업과 헤어로 완성해 드립니다. 사람은 이목구비가 아니라 전체적인 분위기로 파악되기 때문에 혼주 이미지는 아주 중요합니다.',
  },
  {
    n: 6,
    t: '퍼스널 컬러로 한복 색 추천',
    d: '퍼스널 컬러 진단을 통해 어울리는 한복 색을 추천해 드리고, 피해야 할 색도 함께 알려드립니다. (만족도 100%)',
  },
  {
    n: 7,
    t: '개인적인 걱정거리 해결',
    d: '안경 쓴 혼주, 흉터가 있는 분, 화상 얼굴, 비대칭 등도 해결할 수 있습니다. 미국에서 특수분장을 전공한 이력으로 많은 화상 혼주, 구안와사 등 얼굴의 문제를 도와드렸습니다.',
  },
  {
    n: 8,
    t: '사돈 간 조율',
    d: '나이 차이가 많이 나는 사돈끼리 보이지 않는 경쟁심리가 있는데, 이런 부분도 1:1 컨설팅을 통해 도와드립니다.',
  },
  {
    n: 9,
    t: '수술 없이 10년 젊어 보이는 혼주',
    d: '저희의 특허받은 특별 프로그램을 통해 10년 젊은 나이의 혼주가 되실 수 있습니다.',
  },
  {
    n: 10,
    t: '그 밖의 모든 궁금증',
    d: '25년 동안 1만 명의 메이크업을 하며 터득한 노하우와 혼주를 사랑하는 마음까지, 메이크업포엘의 「혼주 메이크업 연구소」를 통해 칭찬 듬뿍 받는 혼주가 되시도록 돕겠습니다.',
  },
]

export default async function ConsultationPage() {
  const img = await getSiteImages()
  return (
    <div className="min-h-screen bg-white">
      <SubHero title="1:1 사전컨설팅" image={img['sub-hero']} />
      <section className="bg-gradient-to-br from-[#FDF4F3] to-white py-20">
        <div className="mfl-contain max-w-[1000px]">
          <p className="text-xs font-bold tracking-[0.3em] text-[#F46E65]">MAKEUPFORL ONLY</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            저희만의 특별함을 소개하겠습니다
          </h2>
          <div className="mt-8 space-y-4 text-[17px] leading-[1.9] text-gray-700">
            <p>
              결혼식 날이 결정되고 혼주가 되는데 무엇을, 어떻게 해야 할지 잘 모르실 거예요.
              오랜만에 사람들 앞에서 주목받는 자리에 선다고 생각하니, 별다른 신경 안 쓰고 살아오던
              자신의 외모에서부터 난감해집니다.
            </p>
            <p>
              &lsquo;주인공도 아닌데 그냥 대충 하지 뭐&rsquo;라고 생각했는데, 결혼식 날이 가까워
              오니 잠이 안 오고 결혼식장의 혼주들만 눈에 들어온다고 합니다. <b>공감하시나요?</b>
            </p>
            <p>
              이럴 때 많은 혼주들을 도와드린 전문가가 있다면 어떨까요? 그래서 준비했습니다.
              혼주 화장과 혼주 헤어에 필요한 궁금증을 다 풀어드리고,{' '}
              <b className="text-[#E2564C]">
                내게 가장 잘 어울리는 모습으로 결혼식 날의 혼주가 될 수 있도록
              </b>{' '}
              메이크업포엘이 도와드리겠습니다.
            </p>
          </div>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href="/reservation"
              className="rounded-xl bg-[#F46E65] px-6 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#E2564C]"
            >
              사전컨설팅 예약하기
            </Link>
            <Link
              href="/honjoo100"
              className="rounded-xl border border-[#F8C3BF] bg-white px-6 py-3.5 text-sm font-bold text-gray-900 transition hover:border-[#F46E65]"
            >
              혼주메이크업 100문100답 보기
            </Link>
          </div>
        </div>
      </section>

      {/* 10가지 도움 */}
      <section className="py-20">
        <div className="mfl-contain max-w-[1000px]">
          <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            1:1 사전 컨설팅은 이런 도움을 드립니다
          </h2>
          <div className="mt-10 space-y-6">
            {HELPS.map((h) => (
              <div
                key={h.n}
                className="flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:flex-row sm:items-start"
              >
                {img[`consult-${h.n}`] && (
                  <div className="relative h-32 w-full flex-none overflow-hidden rounded-xl bg-gray-50 sm:h-28 sm:w-40">
                    <Image
                      src={img[`consult-${h.n}`]}
                      alt={h.t}
                      fill
                      sizes="(max-width:640px) 100vw, 160px"
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex gap-4">
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#F46E65] text-sm font-bold text-white">
                    {h.n}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">{h.t}</h3>
                    <p className="mt-2 text-[15px] leading-[1.85] text-gray-600">{h.d}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 마무리 */}
      <section className="bg-gray-900 py-20">
        <div className="mfl-contain max-w-[900px] text-center">
          <p className="text-xl leading-relaxed text-gray-300 sm:text-2xl">
            아직도, 신부 따라가서 하는
            <br />
            <span className="font-bold text-white">&lsquo;공장식 혼주 메이크업&rsquo;</span>을
            하시나요?
          </p>
          <p className="mt-8 text-lg leading-relaxed text-gray-300">
            이젠 혼주메이크업도 <b className="text-white">혼주만을 위한 전문가</b>가 필요합니다.
          </p>
          <p className="mt-6 text-2xl font-bold text-[#F46E65]">혼주는 결혼식장의 첫인상입니다.</p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/reservation"
              className="rounded-xl bg-[#F46E65] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#E2564C]"
            >
              사전컨설팅 예약하기
            </Link>
            <a
              href="tel:02-323-3321"
              className="rounded-xl border border-gray-600 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-gray-800"
            >
              02-323-3321
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
