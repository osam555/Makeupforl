'use client'

import { useEffect, useState } from 'react'
import { Play, X } from 'lucide-react'

import { cleanTitle, youtubeEmbed, youtubeThumb, youtubeWatch, type VideoItem } from '@/lib/videos-shared'

function fmtDate(d?: string | null) {
  if (!d) return ''
  return d.replace(/-/g, '.')
}

export default function VideoSection({
  items,
  columns = 4,
  large = false,
}: {
  items: VideoItem[]
  columns?: 2 | 3 | 4
  large?: boolean
}) {
  const [open, setOpen] = useState<VideoItem | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null)
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const grid =
    columns === 2
      ? 'sm:grid-cols-2'
      : columns === 3
        ? 'sm:grid-cols-2 lg:grid-cols-3'
        : 'sm:grid-cols-2 lg:grid-cols-4'

  return (
    <>
      <div className={`grid grid-cols-1 gap-x-6 gap-y-9 ${grid}`}>
        {items.map((v) => (
          <button
            key={v.youtubeId}
            type="button"
            onClick={() => setOpen(v)}
            className="group text-left"
          >
            <span className="relative block overflow-hidden rounded-2xl bg-[#F4F4F4]">
              <span className="block" style={{ paddingBottom: '56.25%' }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youtubeThumb(v.youtubeId)}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.04]"
              />
              <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/20" />
              <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#F46E65]/90 text-white shadow-lg transition group-hover:scale-110">
                <Play className="ml-0.5 h-6 w-6 fill-white" />
              </span>
            </span>
            <span
              className={`mt-4 block font-medium leading-[1.45] text-[#242424] transition group-hover:text-[#F46E65] ${
                large ? 'text-[20px]' : 'text-[17px]'
              }`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {cleanTitle(v.title)}
            </span>
            {v.summary && (
              <span className="mt-1.5 block text-[15px] leading-relaxed text-[#686868]">
                {v.summary}
              </span>
            )}
            {v.publishedAt && (
              <span className="mt-1.5 block text-[14px] text-[#909090]">{fmtDate(v.publishedAt)}</span>
            )}
          </button>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(null)}
          role="dialog"
          aria-modal="true"
          aria-label={open.title}
        >
          <div className="w-full max-w-[960px]" onClick={(e) => e.stopPropagation()}>
            <div className="relative overflow-hidden rounded-2xl bg-black" style={{ paddingBottom: '56.25%' }}>
              <iframe
                src={`${youtubeEmbed(open.youtubeId)}&autoplay=1`}
                title={open.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[18px] font-medium text-white">{cleanTitle(open.title)}</p>
                <a
                  href={youtubeWatch(open.youtubeId)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[14px] text-white/70 underline underline-offset-4 hover:text-white"
                >
                  유튜브에서 보기
                </a>
              </div>
              <button
                type="button"
                onClick={() => setOpen(null)}
                aria-label="닫기"
                className="shrink-0 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
