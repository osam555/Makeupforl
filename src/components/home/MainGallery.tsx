'use client'

import Image from 'next/image'
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
                    /*
                      원본을 그대로 부르면 안 된다. Storage 에 올라간 갤러리 사진은
                      한 장이 3MB 를 넘는다. 홈에서만 이 자리와 아래 썸네일로 8MB 가
                      넘게 나가고 있었다. next/image 를 태우면 화면 크기에 맞춰
                      줄이고 WebP 로 바꿔 내려준다.

                      .pic 이 position:relative + padding-bottom 으로 비율을 잡고 있어
                      fill 이 그대로 들어맞는다 (mfl-original.css 82~83행).
                    */
                    <Image
                      src={current.url}
                      alt={current.alt_text}
                      fill
                      sizes="(max-width: 1024px) 100vw, 60vw"
                    />
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
                        {/* 썸네일은 실제로 185px 남짓으로 그려진다. 원본을 받을 이유가 없다 */}
                        <Image
                          src={it.url}
                          alt={it.alt_text}
                          fill
                          sizes="(max-width: 1024px) 50vw, 190px"
                        />
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
