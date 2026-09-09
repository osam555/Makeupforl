import type { Metadata } from 'next'
import Link from 'next/link'

import VideoSection from '@/components/videos/VideoSection'
import { getVideos } from '@/lib/videos'

export const revalidate = 3600

export const metadata: Metadata = {
  // 자기 주소를 정본으로 못 박는다. 쿼리스트링이 붙은 유입도 한 주소로 모인다.
  alternates: { canonical: '/videos' },
  title: '유튜브 채널 | 메이크업포엘',
  description:
    '혼주메이크업 전문 메이크업포엘 유튜브 채널. 혼주 올림머리, 한복 메이크업, 사전컨설팅 등 최신 영상과 많이 보신 영상을 모았습니다.',
  keywords: '혼주메이크업 영상, 혼주 올림머리 영상, 메이크업포엘 유튜브, 혼주메이크업 연구소',
}

export default async function VideosPage() {
  const { featured, recent, popular, channel, total } = await getVideos()

  return (
    <div className="bg-white">
      <h1 className="blind">유튜브 채널</h1>

      <div className="mfl-contain mfl-real-t2 pt-[50px]">
        {/* 상단 안내 + 채널 바로가기 */}
        <div className="mb-[55px] flex flex-col gap-6 border-b border-[#E5E5E5] pb-[45px] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[20px] font-medium leading-[1.6] text-[#F46E65]">
              보시는 편이 빠를 때가 있습니다.
            </p>
            <p className="mt-2.5 text-[16px] leading-[1.647] text-[#242424]">
              혼주 올림머리, 한복에 어울리는 메이크업, 사전컨설팅에서 무엇을 보는지 —
              <br className="hidden sm:block" />
              글로 설명하기 어려운 것들을 영상으로 담았습니다. 총 {total}개 영상.
            </p>
            {/*
              읽을 글이 211단어뿐이라 검색에 걸릴 것이 없었다. 영상 목록만 있고
              "왜 영상인가" 가 없었다. 그 답을 적는다.
            */}
            <div className="mt-5 max-w-2xl text-[15px] leading-[1.9] text-[#454545]">
              <p>
                혼주 준비에서 말로 옮기기 어려운 것이 둘 있습니다. 하나는{' '}
                <b>머리 볼륨을 어디에 얼마나 주느냐</b>이고, 다른 하나는{' '}
                <b>한복 저고리 색이 얼굴에 어떻게 비치느냐</b>입니다. 둘 다 사진 한 장으로는
                잘 안 보이고, 글로 쓰면 길어집니다. 그래서 영상으로 담았습니다.
              </p>
              <p className="mt-3.5">
                올림머리를 올리는 과정, 가발과 부분 가발을 얹기 전에 무엇을 먼저 만드는지,
                사전 컨설팅에서 실제로 무엇을 보고 무엇을 물어보는지 — 상담실에서 설명하던
                것을 그대로 찍었습니다. 예약 전에 보시면 상담에서 무엇을 말씀하실지가
                분명해집니다.
              </p>
              <p className="mt-3.5">
                더 자세한 내용은{' '}
                <Link href="/honjoo100" className="font-semibold text-[#E2564C] hover:underline">
                  혼주메이크업 100문 100답
                </Link>
                에, 가격과 예약 절차는{' '}
                <Link
                  href="/혼주메이크업"
                  className="font-semibold text-[#E2564C] hover:underline"
                >
                  혼주메이크업 안내
                </Link>
                에 있습니다.
              </p>
              <p className="mt-3.5">
                영상은 글이 부담스러운 분을 위한 것이기도 합니다. 100문 100답에는 전 문항에
                원장이 직접 읽은 음성이 붙어 있어서, 눈이 침침하거나 글이 길게 느껴지실 때는
                들으시면 됩니다. 예식 준비는 대개 두세 달에 걸쳐 조금씩 하는 일이라, 오가는
                길에 하나씩 들으셔도 충분합니다.
              </p>
            </div>
          </div>
          <a
            href={channel.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-[50px] w-full max-w-[260px] shrink-0 items-center justify-center rounded-[25px] bg-[#F46E65] text-[17px] font-medium text-white transition hover:bg-[#E2564C]"
          >
            유튜브 채널 바로가기
          </a>
        </div>

        {featured.length > 0 && (
          <section className="mb-[70px]">
            <h2 className="doc-tit">대표 영상</h2>
            <p className="-mt-2 mb-7 text-[15px] text-[#686868]">처음이라면 이 영상부터 보세요.</p>
            <VideoSection items={featured} columns={2} large />
          </section>
        )}

        {recent.length > 0 && (
          <section className="mb-[70px]">
            <h2 className="doc-tit">최신 영상</h2>
            <p className="-mt-2 mb-7 text-[15px] text-[#686868]">
              채널에 새 영상이 올라오면 자동으로 이곳에 반영됩니다.
            </p>
            <VideoSection items={recent} columns={4} />
          </section>
        )}

        {popular.length > 0 && (
          <section className="mb-[70px]">
            <h2 className="doc-tit">인기 영상</h2>
            <p className="-mt-2 mb-7 text-[15px] text-[#686868]">혼주님들이 많이 보신 영상입니다.</p>
            <VideoSection items={popular} columns={4} />
          </section>
        )}

        {total === 0 && (
          <div className="rounded-2xl border border-[#E5E5E5] bg-[#F4F4F4] px-6 py-16 text-center">
            <p className="text-[17px] text-[#242424]">아직 등록된 영상이 없습니다.</p>
            <a
              href={channel.url}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-[15px] font-medium text-[#F46E65] underline underline-offset-4"
            >
              유튜브 채널에서 보기
            </a>
          </div>
        )}

        {/* 100문100답 안내 */}
        <div className="rounded-2xl bg-[#F4F4F4] px-8 py-10 text-center">
          <p className="text-[20px] font-medium text-[#242424]">
            글과 음성으로 정리된 자료도 있습니다
          </p>
          <p className="mt-2.5 text-[16px] leading-[1.647] text-[#454545]">
            혼주님이 가장 많이 묻는 질문에 대표원장이 하나씩 답했습니다. 한국어·영어 자막 제공.
          </p>
          <Link
            href="/honjoo100"
            className="mt-6 inline-flex h-[50px] items-center justify-center rounded-[25px] border border-[#F46E65] bg-white px-8 text-[17px] font-medium text-[#F46E65] transition hover:bg-[#F46E65] hover:text-white"
          >
            혼주메이크업 100문100답 보기
          </Link>
        </div>
      </div>
    </div>
  )
}
