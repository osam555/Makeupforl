import Image from 'next/image'

import type { InstagramGroup } from '@/lib/instagram'

function fmtDate(d: string) {
  return d.replace(/-/g, '.')
}

/**
 * 인스타그램 게시물 한 묶음.
 *
 * 사진은 <Image> 로 싣는다 — public/instagram 의 1080px 원본을 그대로 내보내면 한 화면에
 * 몇 MB 가 되므로, /_next/image 를 거쳐 화면 폭에 맞춘 WebP 로 내린다. 크기는 시드에
 * 적혀 있어 자리를 미리 잡는다(빌드 때 사진을 읽지 않아도 된다).
 *
 * 본문은 서버가 그리는 HTML 에 그대로 들어간다. 이 페이지의 목적이 그것이다 —
 * 인스타그램에 있는 글은 네이버가 읽을 수 없다.
 */
export default function InstagramPost({ post, priority = false }: { post: InstagramGroup; priority?: boolean }) {
  const [first, ...rest] = post.images
  const alt = post.text.split('\n').find((l) => l.trim())?.replace(/[^\p{L}\p{N}\s,.!?]/gu, '').trim()
  const label = alt ? `메이크업포엘 인스타그램 — ${alt}` : '메이크업포엘 인스타그램 사진'

  /*
    사진 묶음의 배치. 한 장이면 인스타 비율(4:5) 그대로, 두 장이면 나란히,
    셋 이상이면 첫 장을 크게 두고 나머지를 아래 한 줄에 — 넉 장까지만 보이고
    나머지는 인스타 링크로 넘긴다. 카드 한 장이 화면 한 벌을 다 차지하면 안 된다.
  */
  const shown = rest.slice(0, 3)
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E5E5E5] bg-white">
      <div className={rest.length === 1 ? 'grid grid-cols-2 gap-0.5' : ''}>
        <Image
          src={first.src}
          alt={label}
          width={first.width}
          height={first.height}
          sizes="(min-width: 1024px) 340px, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          className={`w-full object-cover ${rest.length === 1 ? 'aspect-square' : 'aspect-[4/5]'}`}
        />
        {rest.length === 1 && (
          <Image
            src={rest[0].src}
            alt={`${label} 2`}
            width={rest[0].width}
            height={rest[0].height}
            sizes="(min-width: 1024px) 170px, 50vw"
            className="aspect-square w-full object-cover"
          />
        )}
      </div>
      {rest.length > 1 && (
        <div className={`mt-0.5 grid gap-0.5 ${shown.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
          {shown.map((im, i) => (
            <Image
              key={im.src}
              src={im.src}
              alt={`${label} ${i + 2}`}
              width={im.width}
              height={im.height}
              sizes="(min-width: 1024px) 115px, 33vw"
              className="aspect-square w-full object-cover"
            />
          ))}
        </div>
      )}
      <div className="p-5 sm:p-6">
        <p className="whitespace-pre-line text-[15px] leading-[1.9] text-gray-700">{post.text}</p>
        {post.tags.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-x-2 gap-y-1 text-[13px] text-[#E2564C]">
            {post.tags.map((t) => (
              <span key={t}>#{t}</span>
            ))}
          </p>
        )}
        <p className="mt-4 flex items-center justify-between text-[13px] text-gray-500">
          <time dateTime={post.date}>{fmtDate(post.date)}</time>
          <a href={post.url} target="_blank" rel="noreferrer" className="hover:underline">
            인스타그램에서 보기{post.count > 1 ? ` (${post.count}장 묶음)` : ''} ↗
          </a>
        </p>
      </div>
    </article>
  )
}
