'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export type NowPlayingItem = { slug: string; question: string; part: number }

const BARS = [6, 13, 9, 20, 14, 26, 18, 30, 22, 15, 24, 11, 19, 8, 14, 21, 10, 16, 7, 12]

function partLabel(part: number) {
  if (part === 0) return 'PROLOGUE'
  if (part === 7) return 'EPILOGUE'
  return `PART ${part}`
}

/**
 * 히어로의 NOW PLAYING 카드. 예전에는 첫 문항 하나만 고정으로 보여줬는데,
 * 어떤 질문들이 있는지 감이 오도록 몇 개를 돌려 보여준다.
 * (홈 히어로에 있던 문항 회전을 여기로 옮겼다 — 혼주 질문은 이 페이지의 것이다)
 *
 * 모션을 줄이도록 설정한 이용자에게는 돌리지 않고 첫 문항만 보여준다.
 */
export default function NowPlayingRotator({
  items,
  totalMinutes,
  className = 'absolute bottom-2 -left-8 w-[290px]',
}: {
  items: NowPlayingItem[]
  totalMinutes: number
  /** 넓은 화면은 원장 사진 옆에 겹쳐 놓고, 좁은 화면은 본문 흐름에 그대로 놓는다 */
  className?: string
}) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const reduced = useRef(false)

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced.current || items.length < 2 || paused) return
    const t = setInterval(() => setI((v) => (v + 1) % items.length), 4000)
    return () => clearInterval(t)
  }, [items.length, paused])

  if (items.length === 0) return null
  const cur = items[i]

  return (
    <div
      className={className}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <Link
        href={`/honjoo100/${cur.slug}`}
        className="group block rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)]/95 p-4 shadow-xl backdrop-blur transition hover:-translate-y-0.5 hover:shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-extrabold tracking-[0.22em] text-[var(--w-rose)]">
            NOW PLAYING · {partLabel(cur.part)}
          </p>
          <p className="text-[10px] font-semibold tabular-nums text-[var(--w-mut)]">
            {i + 1} / {items.length}
          </p>
        </div>

        {/* 높이를 고정해 문항이 바뀔 때 카드가 들썩이지 않게 한다 */}
        <div className="relative mt-2 h-[40px]">
          <p
            key={cur.slug}
            className="qna-slide line-clamp-2 text-sm font-bold leading-snug text-[var(--w-ink)]"
          >
            {cur.question}
          </p>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--w-rose)] text-[11px] text-white transition group-hover:bg-[var(--w-rose-d)]">
            ▶
          </span>
          <span className="flex h-8 flex-1 items-end gap-[3px]" aria-hidden>
            {BARS.map((h, n) => (
              <i
                key={n}
                className="block w-[3px] rounded-full bg-[var(--w-rose)] opacity-45"
                style={{ height: `${h}px` }}
              />
            ))}
          </span>
        </div>

        <p className="mt-2 text-[11px] text-[var(--w-mut)]">
          전체 약 {totalMinutes}분 · 한/EN 자막
        </p>
      </Link>

      {/* 눌러서 바로 넘길 수 있다 */}
      {items.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {items.map((it, n) => (
            <button
              key={it.slug}
              type="button"
              aria-label={`${n + 1}번째 질문 보기`}
              aria-current={n === i}
              onClick={() => setI(n)}
              className={[
                'h-1.5 rounded-full transition-all',
                n === i
                  ? 'w-7 bg-[var(--w-rose)]'
                  : 'w-1.5 bg-[var(--w-rose)]/30 hover:bg-[var(--w-rose)]/60',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
