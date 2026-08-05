'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Search, Play, List, LayoutGrid } from 'lucide-react'

import { PART_THEME } from '@/types/wed100'

export interface BrowserItem {
  slug: string
  part: number
  n: number
  question: string
  question_en: string
  keywords: string[]
  thumbImage: string
  duration: number
  hasAudio: boolean
}

function fmt(sec: number) {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Wed100Browser({
  items,
  parts,
}: {
  items: BrowserItem[]
  parts: { part: number; title: string }[]
}) {
  const [part, setPart] = useState(0)
  const [kw, setKw] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const rows = useMemo(() => {
    const q = kw.trim()
    return items.filter(
      (x) =>
        (!part || x.part === part) &&
        (!q ||
          x.question.includes(q) ||
          x.question_en.toLowerCase().includes(q.toLowerCase()) ||
          x.keywords.some((k) => k.includes(q))),
    )
  }, [items, part, kw])

  return (
    <div>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[#B3A69F]" />
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="예: 한복, 가격, 올림머리, 예약 시기…"
            className="w-full rounded-xl border border-[#E7DDD4] bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#A63D5A]"
          />
        </div>
        <button
          onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          className="flex items-center gap-2 rounded-xl border border-[#E7DDD4] bg-white px-4 py-3 text-xs font-bold text-[#5B4F49]"
        >
          {view === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          {view === 'grid' ? '목록으로' : '카드로'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setPart(0)}
          className={`rounded-full border px-3.5 py-2 text-xs transition ${
            part === 0
              ? 'border-[#A63D5A] bg-[#A63D5A] font-bold text-white'
              : 'border-[#E7DDD4] bg-white text-[#5B4F49] hover:border-[#D9C6BA]'
          }`}
        >
          전체 {items.length}
        </button>
        {parts.map((p) => (
          <button
            key={p.part}
            onClick={() => setPart(p.part)}
            className={`rounded-full border px-3.5 py-2 text-xs transition ${
              part === p.part
                ? 'border-[#A63D5A] bg-[#A63D5A] font-bold text-white'
                : 'border-[#E7DDD4] bg-white text-[#5B4F49] hover:border-[#D9C6BA]'
            }`}
          >
            P{p.part}. {p.title}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="mt-10 text-center text-sm text-[#8A7B73]">
          검색 결과가 없습니다. 다른 단어로 찾아보세요.
        </p>
      )}

      {view === 'grid' ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((x) => {
            const theme = PART_THEME[x.part]
            return (
              <Link
                key={x.slug}
                href={`/wed100/${x.slug}`}
                id={`part-${x.part}`}
                className="group overflow-hidden rounded-2xl border border-[#E7DDD4] bg-white transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-square bg-[#F3ECE6]">
                  <Image
                    src={x.thumbImage}
                    alt={x.question}
                    fill
                    sizes="(max-width:640px) 100vw, 25vw"
                    className="object-cover"
                  />
                  <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-white/95 text-[#A63D5A] shadow">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                </div>
                <div className="p-4">
                  <p
                    className="text-[10px] font-extrabold tracking-[0.13em]"
                    style={{ color: theme.accent }}
                  >
                    PART {x.part} · {String(x.n).padStart(2, '0')}
                  </p>
                  <h3 className="mt-1.5 line-clamp-3 min-h-[60px] text-sm font-bold leading-snug text-[#2E2724]">
                    {x.question}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {x.keywords.slice(0, 3).map((k) => (
                      <span
                        key={k}
                        className="rounded bg-[#F6E9ED] px-1.5 py-0.5 text-[10px] text-[#8A2E48]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[11px] text-[#9A8B84]">
                    🎧 {fmt(x.duration)} · 자막 한/영{!x.hasAudio && ' · 음성 준비중'}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[#E7DDD4] bg-white">
          {rows.map((x) => (
            <Link
              key={x.slug}
              href={`/wed100/${x.slug}`}
              className="flex items-center gap-4 border-b border-[#F2EAE3] px-5 py-3.5 text-sm last:border-0 hover:bg-[#FDF9F6]"
            >
              <span
                className="w-14 shrink-0 text-[11px] font-extrabold tracking-wider"
                style={{ color: PART_THEME[x.part].accent }}
              >
                P{x.part}·{String(x.n).padStart(2, '0')}
              </span>
              <span className="flex-1">
                <span className="block font-medium text-[#2E2724]">{x.question}</span>
                <span className="mt-0.5 block text-[11px] text-[#9C8D86]">{x.question_en}</span>
              </span>
              <span className="shrink-0 text-[11px] text-[#9C8D86]">🎧 {fmt(x.duration)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
