'use client'

import { useState } from 'react'

type Item = { id: string; url: string; alt_text: string; category: string }

/** 원본 sec2 갤러리: 카테고리 탭 + 좌측 큰 이미지 / 우측 썸네일 2열 */
const CATEGORIES: { key: string; name: string }[] = [
  { key: 'honju', name: '혼주' },
  { key: 'family-guest', name: '가족 및 하객' },
  { key: 'wedding', name: '웨딩' },
  { key: 'men-makeup', name: '남자 메이크업' },
  { key: 'corporate-video', name: '기업행사&영상메이크업' },
  { key: 'photoshoot-profile', name: '화보 & 프로필' },
  { key: 'fashion-show', name: '패션쇼' },
]

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
