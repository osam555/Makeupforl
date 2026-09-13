import type { Metadata } from 'next'
import Link from 'next/link'

import InstagramPost from '@/components/instagram/InstagramPost'
import SubHero from '@/components/layout/SubHero'
import { getInstagram } from '@/lib/instagram'
import { SITE_URL } from '@/lib/site'
import { getSiteImages } from '@/lib/siteImages'

export const metadata: Metadata = {
  // 자기 주소를 정본으로 못 박는다. 쿼리스트링이 붙은 유입도 한 주소로 모인다.
  alternates: { canonical: '/instagram' },
  title: '인스타그램 | 메이크업포엘',
  description:
    '메이크업포엘 인스타그램(@makeupforl)에 올린 혼주 헤어·메이크업 사진과 글. 한복에 어울리는 혼주 올림머리, 압구정 샵과 출장 메이크업 사례를 모았습니다.',
  keywords: '메이크업포엘 인스타그램, 혼주메이크업 인스타, 혼주헤어 사진, 압구정메이크업샵, 출장메이크업',
}

/**
 * 인스타그램 게시물을 사이트에 옮겨 싣는 페이지.
 *
 * 왜 있나 — 인스타그램 robots.txt 가 네이버 크롤러(Yeti)를 이름을 찍어 막는다. 그래서
 * 네이버에서 "메이크업포엘" 을 찾으면 인스타 계정은 "robots.txt 로 인해 정보를 수집할 수
 * 없습니다" 로만 뜨고, 거기 올린 사진과 글은 검색에 한 줄도 안 잡힌다. 여기 옮겨 두면
 * 우리 도메인 아래에서 잡힌다. 인스타 임베드(iframe)로는 안 된다 — 그것도 인스타 서버에서
 * 오는 것이라 검색엔진에는 빈 칸이다.
 */
export default async function InstagramPage() {
  const { profile, groups, total, fetchedAt } = getInstagram()
  const img = await getSiteImages()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: '메이크업포엘 인스타그램',
    url: `${SITE_URL}/instagram`,
    about: { '@id': `${SITE_URL}/#business` },
    sameAs: profile.url,
    hasPart: groups.slice(0, 20).map((g) => ({
      '@type': 'SocialMediaPosting',
      url: g.url,
      datePublished: g.date,
      headline: g.text.split('\n').find((l) => l.trim()) ?? '',
      image: g.images.map((im) => `${SITE_URL}${im.src}`),
      author: { '@id': `${SITE_URL}/#business` },
    })),
  }

  return (
    <>
      <SubHero title="인스타그램" image={img['sub-hero']} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="mfl-contain max-w-[1100px] pb-16 pt-12">
        <div className="mb-10 flex flex-col gap-6 border-b border-[#E5E5E5] pb-10 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[20px] font-medium leading-[1.6] text-[#F46E65]">
              예식 당일의 혼주님들, 인스타그램에 올린 그대로.
            </p>
            <p className="mt-2.5 text-[16px] leading-[1.647] text-gray-800">
              @{profile.username} 에 올린 사진과 글을 여기에도 옮겨 둡니다. 게시물 {profile.posts}개 중{' '}
              {total}개.
            </p>
            <div className="mt-5 text-[15px] leading-[1.9] text-gray-600">
              <p>
                인스타그램에는 <b className="text-gray-800">예식 당일 아침에 찍은 사진</b>이 올라갑니다.
                조명도 배경도 고르지 않은 대신, 한복을 입고 머리를 올린 완성된 모습이 그대로 있습니다.
                갤러리의 정돈된 사진과 함께 보시면 실제로 어떻게 나오는지가 더 분명합니다.
              </p>
              <p className="mt-3.5">
                사진마다 붙인 짧은 글도 그대로 옮겼습니다. 화이트 한복에는 어떤 뒤꽂이를 쓰는지,
                요즘 혼주 머리는 볼륨을 어디까지 주는지 — 그때그때 손님을 보내 드리며 적은 말이라
                안내문보다 솔직합니다. 자세한 것은{' '}
                <Link href="/혼주머리" className="font-semibold text-[#E2564C] hover:underline">
                  혼주머리
                </Link>
                ·
                <Link href="/혼주한복" className="font-semibold text-[#E2564C] hover:underline">
                  혼주한복
                </Link>{' '}
                안내와{' '}
                <Link href="/honjoo100" className="font-semibold text-[#E2564C] hover:underline">
                  100문100답
                </Link>
                에 있습니다.
              </p>
            </div>
          </div>
          <a
            href={profile.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[50px] w-full max-w-[260px] shrink-0 items-center justify-center rounded-[25px] bg-[#F46E65] text-[17px] font-medium text-white transition hover:bg-[#E2564C]"
          >
            인스타그램 바로가기
          </a>
        </div>

        {groups.length === 0 ? (
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#F4F4F4] px-6 py-16 text-center">
            <p className="text-[17px] text-gray-800">아직 옮겨 둔 게시물이 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g, i) => (
              <InstagramPost key={g.id} post={g} priority={i < 3} />
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-[13px] text-gray-500">
          {fetchedAt.replace(/-/g, '.')} 기준. 새 게시물은 인스타그램에서 먼저 보실 수 있습니다.
        </p>

        <div className="mt-12 rounded-2xl bg-[#F4F4F4] px-8 py-10 text-center">
          <p className="text-[20px] font-medium text-gray-800">분야별로 정리된 사진은 갤러리에</p>
          <p className="mt-2.5 text-[16px] leading-[1.647] text-gray-600">
            혼주·신부·가족하객·남성·기업행사 — 누가 받는가로 나눠 두었습니다.
          </p>
          <Link
            href="/gallery"
            className="mt-6 inline-flex h-[50px] items-center justify-center rounded-[25px] border border-[#F46E65] bg-white px-8 text-[17px] font-medium text-[#F46E65] transition hover:bg-[#F46E65] hover:text-white"
          >
            갤러리 보기
          </Link>
        </div>
      </div>
    </>
  )
}
