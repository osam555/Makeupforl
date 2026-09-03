'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

export type QnaItem = { slug: string; question: string }

/**
 * 히어로에서 100문100답 문항을 한 개씩 돌려 보여준다.
 * 버튼만 있으면 안에 뭐가 있는지 알 수 없어서, 실제 질문을 흘려보내
 * 자기 걱정과 같은 것을 발견하게 한다.
 *
 * 모션을 줄이도록 설정한 이용자에게는 돌리지 않고 첫 문항만 보여준다.
 */
export default function QnaRotator({ items }: { items: QnaItem[] }) {
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
      className="mt-6 sm:mt-7"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <p className="text-[11px] font-bold tracking-[0.22em] text-[#F46E65]">
        혼주님이 많이 묻는 질문
      </p>

      {/* 높이를 고정해 문항이 바뀔 때 아래 버튼이 밀리지 않게 한다 */}
      <div className="relative mt-2 h-[58px] sm:h-[62px]">
        <Link
          key={cur.slug}
          href={`/honjoo100/${cur.slug}`}
          className="qna-slide group absolute inset-0 flex items-start gap-2.5"
        >
          <span className="mt-[3px] shrink-0 text-[17px] font-bold text-[#F46E65]">Q</span>
          <span className="text-[16px] font-semibold leading-[1.5] text-gray-900 underline-offset-4 group-hover:underline sm:text-[17px]">
            {cur.question}
          </span>
        </Link>
      </div>

      {/* 지금 몇 번째인지 — 눌러서 바로 넘길 수도 있다 */}
      {items.length > 1 && (
        <div className="flex gap-1.5">
          {items.map((it, n) => (
            <button
              key={it.slug}
              type="button"
              aria-label={`${n + 1}번째 질문 보기`}
              aria-current={n === i}
              onClick={() => setI(n)}
              className={[
                'h-1.5 rounded-full transition-all',
                n === i ? 'w-6 bg-[#F46E65]' : 'w-1.5 bg-gray-300 hover:bg-gray-400',
              ].join(' ')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
