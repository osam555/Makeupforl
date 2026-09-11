'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Item = { id: string; text: string; date: string }

/**
 * 홈 고객후기 슬라이드 (원본 sec3 · 4장 노출 · 좌우 원형 화살표).
 *
 * 전에는 문자 캡처 사진을 넣고 밑에 게시판 제목("고객문자")과 올린 날짜("2023.10.10")를
 * 달았다. 사진은 세로가 제각각이라 잘리고, 제목과 날짜는 넉 장이 다 똑같아 아무 말도
 * 하지 않았다. 사진 안의 글을 옮겨 둔 것(reviewTexts)이 이미 있어 그것을 보여 준다 —
 * 읽히고, 검색엔진도 읽고, 잘릴 것이 없다. 사진 원본은 /reviews 에 그대로 있다.
 */
export default function ReviewSlide({ items }: { items: Item[] }) {
  const [per, setPer] = useState(4)
  const [start, setStart] = useState(0)
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
      <div className="items-viewport">
        <div
          className="items"
          style={{ transform: `translateX(-${(start * 100) / per}%)` }}
        >
          {items.map((r) => (
            <div className="item" key={r.id} style={{ width: `${100 / per}%` }}>
              <Link href="/reviews" className="doc-review quote">
                <blockquote>
                  <p>{r.text}</p>
                </blockquote>
                <p className="date">{fmtMonth(r.date)} · 고객님 문자</p>
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

/** "2023-10" → "2023년 10월" */
function fmtMonth(d: string): string {
  const [y, m] = d.split('-')
  return m ? `${y}년 ${Number(m)}월` : y
}
