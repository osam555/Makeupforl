'use client'

import { useState } from 'react'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'

type Item = { id: string; url: string; alt_text: string; category: string }

/** 원본 sec2 갤러리: 카테고리 탭 + 좌측 큰 이미지 / 우측 썸네일 2열 */
/* 사이트 업무분야와 같은 목록을 쓴다. 예전에는 여기만 따로 적혀 있어 헤어변형이 빠지고
   사진이 한 장도 없는 패션쇼가 남아 있었다 */
const CATEGORIES = GALLERY_CATEGORIES.map((c) => ({ key: c.slug, name: c.name }))

export default function MainGallery({ items }: { items: Item[] }) {
  const [cat, setCat] = useState('honju')
  const [idx, setIdx] = useState(0)

  const list = items.filter((i) => i.category === cat).slice(0, 8)
  const current = list[Math.min(idx, Math.max(list.length - 1, 0))]

  return (
    <>
      <div className="mfl-gal-cate">
        <div className="gal-cate">
          <ul>
            {CATEGORIES.map((c) => (
              <li key={c.key} className={c.key === cat ? 'active' : undefined}>
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault()
                    setCat(c.key)
                    setIdx(0)
                  }}
                >
                  {c.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="gal-cnt">
        <div className="gal-list">
          <div className="tab-contents">
            <div className="tab-content">
              <div className="img-box">
                <div className="pic">
                  {current && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.url} alt={current.alt_text} />
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="tab-area">
            <div className="tab-menu">
              <ul className="tabs">
                {list.map((it, i) => (
                  <li key={it.id} className={i === idx ? 'active' : undefined}>
                    <button type="button" onClick={() => setIdx(i)} className="block w-full">
                      <span className="pic">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={it.url} alt={it.alt_text} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
