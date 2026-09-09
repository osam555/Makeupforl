import { Metadata } from 'next'
import ReviewsList from '@/components/reviews/ReviewsList'
import Link from 'next/link'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'

export const metadata: Metadata = {
  // 자기 주소를 정본으로 못 박는다. 쿼리스트링이 붙은 유입도 한 주소로 모인다.
  alternates: { canonical: '/reviews' },
  title: '혼주메이크업 고객후기 | 메이크업포엘',
  description: '혼주메이크업을 받으신 분들이 예식 후 직접 보내 주신 후기입니다. 업체를 통한 마케팅용 후기는 올리지 않습니다. 사진이 잘 나왔다, 나이 들어 보이지 않았다, 하루 종일 무너지지 않았다 — 되풀이되는 말들을 모았습니다.',
}

export default async function ReviewsPage() {
  const img = await getSiteImages()
  return (
    <div className="min-h-screen bg-gray-50">
      <SubHero title="고객후기" image={img['sub-hero']} />
      <div className="mfl-contain py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-lg text-gray-600">
            메이크업포엘을 이용하신 고객님들의 소중한 후기입니다
          </p>
          <p className="mx-auto mt-5 max-w-2xl rounded-xl border border-[#FADEDC] bg-white px-5 py-4 text-sm leading-relaxed text-gray-600">
            저희 메이크업포엘은 <b className="text-[#E2564C]">업체를 통한 마케팅용 후기를 올리지
            않습니다.</b> 고객 한 분 한 분이 보내주신 후기를 그대로 올립니다.
          </p>

          {/*
            후기가 사진뿐이라 이 페이지에는 읽을 글이 한 줄도 없었다.

            문자 안의 문장을 옮겨 적으면 글은 생기지만, 그건 고객이 개인적으로 보내
            주신 메시지를 검색 대상으로 바꾸는 일이라 함부로 할 수 없다. 대신 그
            후기들이 실제로 무엇을 말하는지, 왜 이렇게 모으는지를 우리 말로 쓴다.
          */}
          <div className="mx-auto mt-8 max-w-3xl text-left">
            <h2 className="text-xl font-bold text-gray-900">
              혼주님들이 끝나고 가장 많이 하시는 말
            </h2>
            <p className="mt-3 text-[15px] leading-[1.9] text-gray-600">
              예식이 끝나고 보내 주시는 문자에는 비슷한 말이 되풀이됩니다. 하나는{' '}
              <b className="text-gray-800">사진이 잘 나왔다</b>는 것입니다. 예식 사진은 평생
              남는데, 조명 아래에서 어떻게 보일지는 당일 아침에 알 수 없습니다. 다른 하나는{' '}
              <b className="text-gray-800">나이 들어 보이지 않았다</b>는 것입니다. 혼주 메이크업은
              진하게 하면 나이가 드러나고, 옅게 하면 조명에 지워집니다. 그 사이를 맞추는 일이
              대부분입니다.
            </p>
            <p className="mt-4 text-[15px] leading-[1.9] text-gray-600">
              그리고 <b className="text-gray-800">하루 종일 무너지지 않았다</b>는 말씀을 많이
              하십니다. 혼주는 아침 일찍 시작해 예식과 폐백, 식사까지 열 시간 가까이 사람을
              맞습니다. 눈물이 나기도 하고 땀이 나기도 합니다. 그 시간을 버티게 하는 것이 실은
              기술의 절반입니다.
            </p>
            <p className="mt-4 text-[15px] leading-[1.9] text-gray-600">
              후기를 업체에 맡겨 만들지 않는 이유도 여기 있습니다. 만들어진 후기는 다 비슷한
              말을 하지만, 실제로 받아 보신 분들의 문자는 각자 걱정하던 대목을 짚습니다.
              정수리가 걱정이던 분은 정수리 이야기를, 안경을 쓰시는 분은 안경 이야기를 하십니다.
            </p>
            <p className="mt-4 text-[15px] leading-[1.9] text-gray-600">
              예식 전에 무엇을 정해야 하는지는{' '}
              <Link href="/혼주메이크업" className="font-semibold text-[#E2564C] hover:underline">
                혼주메이크업 안내
              </Link>
              에, 한복과 머리에 관한 것은{' '}
              <Link href="/혼주한복" className="font-semibold text-[#E2564C] hover:underline">
                혼주한복
              </Link>
              ·
              <Link href="/혼주머리" className="font-semibold text-[#E2564C] hover:underline">
                혼주머리
              </Link>
              에 적어 두었습니다.
            </p>
          </div>
        </div>

        <ReviewsList />
      </div>
    </div>
  )
}
