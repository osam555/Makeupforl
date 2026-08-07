'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Item = { id: string; title: string; date: string; url: string }

/** 원본 sec3 후기 슬라이드 (slick 4장 노출 · 좌우 원형 화살표) */
export default function ReviewSlide({ items }: { items: Item[] }) {
  const [per, setPer] = useState(4)
  const [start, setStart] = useState(0)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const calc = () => {
      const w = window.innerWidth
      setPer(w <= 640 ? 1 : w <= 900 ? 2 : w <= 1230 ? 3 : 4)
    }
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const max = Math.max(items.length - per, 0)
  const go = (d: number) => setStart((s) => Math.min(Math.max(s + d, 0), max))

  return (
    <div className="review-slide">
      <div className="items-viewport" ref={wrapRef}>
        <div
          className="items"
          style={{ transform: `translateX(-${(start * 100) / per}%)` }}
        >
          {items.map((r) => (
            <div className="item" key={r.id} style={{ width: `${100 / per}%` }}>
              <Link href="/reviews" className="doc-review">
                <div className="img">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={r.url} alt={r.title} />
                </div>
                <div className="tt-wrap">
                  <div className="tit">{r.title}</div>
                  <p className="tt"></p>
                  <p className="date">{r.date.replace(/-/g, '.')}</p>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="slick-arrow slick-prev"
        onClick={() => go(-1)}
        aria-label="이전"
        disabled={start === 0}
      />
      <button
        type="button"
        className="slick-arrow slick-next"
        onClick={() => go(1)}
        aria-label="다음"
        disabled={start >= max}
      />
    </div>
  )
}
