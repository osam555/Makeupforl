import Image from 'next/image'
import Link from 'next/link'

import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'

type Item = { id: string; url: string; alt_text: string; category: string }

/**
 * 홈 갤러리 — 혼주 사진 다섯 장을 격자로.
 *
 * 전에는 옛 사이트 그대로 "분야 탭 일곱 + 큰 사진 하나 + 썸네일 여덟" 이었다.
 * 세로 사진이 가로 상자에 들어가 좌우로 흰 띠가 컸고, 썸네일은 손톱만 했고, 휴대전화에서는
 * 탭이 잘렸다. 홈은 "얼마나 예쁘게 되는가" 를 3초 안에 보여 주는 자리라 사진만 크게 둔다.
 * 분야 나누기는 갤러리 페이지가 한다 — 여기서는 분야로 가는 길만 아래에 둔다.
 *
 * 격자는 3:4 세로 칸이다. 혼주 사진은 거의 다 상반신 세로라 이 비율에서 얼굴이 안 잘린다.
 * 첫 장은 두 칸을 차지해 시선이 시작할 자리를 만든다. 다섯 장인 이유 — 큰 한 장(2×2) +
 * 작은 넉 장이 넉 줄 격자의 두 줄을 딱 채운다. 일곱 장으로 두니 셋째 줄에 두 장만 남아
 * 오른쪽이 비었다. 휴대전화(두 줄 격자)에서도 큰 한 장 + 두 줄로 떨어진다.
 */
export default function MainGallery({ items }: { items: Item[] }) {
  const photos = items.filter((i) => i.category === 'honju').slice(0, 5)
  if (photos.length === 0) return null

  return (
    <>
      <ul className="mt-9 grid grid-cols-2 gap-2.5 sm:mt-11 sm:grid-cols-4 sm:gap-3">
        {photos.map((p, i) => (
          <li
            key={p.id}
            className={[
              'relative overflow-hidden rounded-2xl bg-gray-100',
              i === 0 ? 'col-span-2 row-span-2 aspect-[3/4]' : 'aspect-[3/4]',
            ].join(' ')}
          >
            <Link href="/gallery/honju" className="group block h-full w-full">
              <Image
                src={p.url}
                alt={p.alt_text}
                fill
                sizes={i === 0 ? '(max-width: 640px) 100vw, 50vw' : '(max-width: 640px) 50vw, 25vw'}
                className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.04]"
              />
            </Link>
          </li>
        ))}
      </ul>

      {/* 분야로 가는 길 — 탭이 아니라 링크다. 홈에서 갈아 끼울 게 아니라 그 장으로 가면 된다 */}
      <div className="mt-7 flex flex-wrap justify-center gap-2 sm:mt-8">
        {GALLERY_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/gallery/${c.slug}`}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-[14px] font-semibold text-gray-700 transition-colors hover:border-[#F46E65] hover:text-[#F46E65]"
          >
            {c.name}
          </Link>
        ))}
      </div>
    </>
  )
}
