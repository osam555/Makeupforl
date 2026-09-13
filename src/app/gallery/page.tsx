import { Metadata } from 'next'
import GalleryClient from '@/components/gallery/GalleryClient'
import { getGalleryImages } from '@/lib/galleryImages'
import Link from 'next/link'
import SubHero from '@/components/layout/SubHero'
import { getSiteImages } from '@/lib/siteImages'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'

export const metadata: Metadata = {
  // 자기 주소를 정본으로 못 박는다. 쿼리스트링이 붙은 유입도 한 주소로 모인다.
  alternates: { canonical: '/gallery' },
  title: '갤러리 | 메이크업포엘',
  description:
    '메이크업포엘의 메이크업 포트폴리오 — ' +
    GALLERY_CATEGORIES.map((c) => c.menuName).join(', '),
}

export default async function GalleryPage() {
  // 사진을 서버에서 미리 읽어 넘긴다 — 그래야 HTML 에 실린다
  const photos = (await getGalleryImages()).map((x, i) => ({
    ...x,
    order_position: x.order_position ?? i,
  }))
  const img = await getSiteImages()
  return (
    <>
      <SubHero title="갤러리" image={img['sub-hero']} />
      <section className="bg-white pt-14 pb-2 text-center">
        <div className="mfl-contain max-w-[900px]">
          <p className="text-[22px] font-bold leading-[1.5] text-gray-900 sm:text-[26px]">
            25년, 1만 명의 얼굴
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-[1.9] text-gray-600">
            혼주부터 가족·하객, 신부, 기업행사까지 — 분야별로 나눠 보실 수 있습니다.
          </p>
          {/*
            사진만 있고 읽을 글이 169단어뿐이었다. 사진은 검색에 안 걸린다.
            무엇을 보고 있는 것인지, 사진에서 무엇을 봐야 하는지를 적는다.
          */}
          <div className="mx-auto mt-8 max-w-2xl text-left text-[15px] leading-[1.9] text-gray-600">
            <p>
              사진을 고르실 때 <b className="text-gray-800">얼굴만 보지 마시고 옷과 함께</b>{' '}
              보시길 권합니다. 같은 메이크업도 한복 저고리 색이 무엇이냐에 따라 전혀 다르게
              보입니다. 혼주 사진에서 저고리와 얼굴을 나란히 두고 보시면, 상담에서 무엇을
              말씀하셔야 할지가 훨씬 분명해집니다.
            </p>
            <p className="mt-4">
              머리는 <b className="text-gray-800">볼륨의 높이보다 위치</b>를 보십시오. 같은
              올림머리라도 번을 어디에 두느냐에 따라 나이가 오갑니다. 뒷모습 사진이 섞여 있는
              것은 그래서입니다 — 하객이 가장 오래 보는 것이 혼주의 뒷모습입니다.
            </p>
            <p className="mt-4">
              여기 사진은 모두 예식 당일 또는 사전 컨설팅에서 실제로 진행한 것입니다. 마음에
              드는 사진이 있으면 그대로 가져와 보여 주셔도 됩니다. 다만 얼굴형과 피부 톤이
              다르면 같은 스타일도 다르게 나오므로,{' '}
              <Link href="/consultation" className="font-semibold text-[#E2564C] hover:underline">
                1:1 사전 컨설팅
              </Link>
              에서 함께 보고 정하는 편이 정확합니다. 가격과 예약 절차는{' '}
              <Link href="/혼주메이크업" className="font-semibold text-[#E2564C] hover:underline">
                혼주메이크업 안내
              </Link>
              에 정리해 두었습니다. 예식 당일 아침에 찍은 사진과 그때그때 적은 글은{' '}
              <Link href="/instagram" className="font-semibold text-[#E2564C] hover:underline">
                인스타그램
              </Link>
              에 옮겨 두었습니다.
            </p>
            <p className="mt-4">
              분야를 나눈 기준은 <b className="text-gray-800">누가 받는가</b>입니다. 혼주와
              신부는 나이도 조명 조건도 다르고, 가족·하객은 혼주와 톤이 따로 놀지 않게 맞춰야
              합니다. 남자 메이크업은 화장한 티가 나면 실패이고, 기업행사와 화보는 카메라가
              무엇을 잡느냐에 따라 피부 표현의 두께를 달리 잡습니다. 같은 손이 하더라도 자리에
              따라 다른 일입니다.
            </p>
          </div>
        </div>
      </section>
      {/*
        Suspense 를 걷어냈다. useSearchParams 를 쓰는 부분만 GalleryClient 안에서
        따로 떼어 놓았으므로, 사진 그리드가 서버에서 함께 그려진다.
      */}
      <>
        <GalleryClient category="all" initial={photos} />
      </>
    </>
  )
}
