'use client'

import { useEffect, useRef, useState } from 'react'

import QnaCard from './QnaCard'

type Q = { slug: string; question: string }

const INTERVAL = 5000

/**
 * 홈 히어로의 100문100답 미리보기.
 *
 * 버튼만 있으면 안에 무엇이 들어 있는지 알 수 없어 들어가 보지 않는다.
 * 실제 질문을 보여 주면 "내가 궁금했던 것"을 만나 클릭으로 이어진다.
 * 카드 모양은 아래 100문100답 섹션과 같은 것을 쓴다(QnaCard).
 *
 * 저절로 바뀌는 글은 읽는 도중 넘어가면 곤란하다. 특히 이 사이트는 50대 이상
 * 혼주 방문이 많다. 그래서 마우스를 올리거나 키보드 초점이 닿으면 멈추고,
 * 눈에 보이는 멈춤 버튼을 따로 둔다(WCAG 2.2.2). 동작 최소화를 켠 기기에서는
 * 애니메이션 없이 글자만 바뀐다.
 */
export default function HeroQnaSlide({ items }: { items: Q[] }) {
  const [at, setAt] = useState(0)
  const [paused, setPaused] = useState(false)
  const [still, setStill] = useState(false)
  const hold = useRef(false)

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setStill(m.matches)
    sync()
    m.addEventListener('change', sync)
    return () => m.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (paused || items.length < 2) return
    const t = setInterval(() => {
      if (!hold.current) setAt((i) => (i + 1) % items.length)
    }, INTERVAL)
    return () => clearInterval(t)
  }, [paused, items.length])

  if (items.length === 0) return null
  const cur = items[Math.min(at, items.length - 1)]

  return (
    <div
      className="mt-6 rounded-2xl bg-[#FDF4F3] p-3"
      onMouseEnter={() => (hold.current = true)}
      onMouseLeave={() => (hold.current = false)}
      onFocusCapture={() => (hold.current = true)}
      onBlurCapture={() => (hold.current = false)}
    >
      <div className="flex items-center gap-2 px-3 pb-2 pt-1">
        <span className="text-[12px] font-semibold tracking-[0.16em] text-[#F46E65]">
          100 Q &amp; A
        </span>
        {items.length > 1 && (
          <button
            type="button"
            onClick={() => setPaused((v) => !v)}
            aria-label={paused ? '질문 자동 넘김 다시 시작' : '질문 자동 넘김 멈춤'}
            className="ml-auto rounded px-1.5 py-0.5 text-[11px] text-gray-400 transition-colors hover:bg-white hover:text-gray-700"
          >
            {paused ? '▶ 자동' : '❚❚ 멈춤'}
          </button>
        )}
      </div>

      {/* 높이를 잡아 두 줄짜리 질문으로 바뀔 때 아래 내용이 밀리지 않게 한다 */}
      <div className={`min-h-[92px] ${still ? '' : 'qna-slide-in'}`} key={cur.slug}>
        <QnaCard slug={cur.slug} question={cur.question} />
      </div>

      {items.length > 1 && (
        <div className="flex justify-center gap-1.5 pb-1 pt-3">
          {items.map((q, i) => (
            <button
              key={q.slug}
              type="button"
              onClick={() => {
                setAt(i)
                setPaused(true)
              }}
              aria-label={`${i + 1}번째 질문 보기`}
              aria-current={i === at}
              className={`h-1.5 rounded-full transition-all ${
                i === at ? 'w-5 bg-[#F46E65]' : 'w-1.5 bg-[#E8D2CF] hover:bg-[#D9BAB6]'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
