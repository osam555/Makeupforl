'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const KEY = 'wed100Theme'

/** 100문100답 섹션 전용 라이트/다크 테마 래퍼 + 선택 토글 */
export default function Wed100Shell({ children }: { children: React.ReactNode }) {
  // 기본값은 라이트. 사용자가 고른 값만 기억한다.
  const [dark, setDark] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setDark(window.localStorage.getItem(KEY) === 'dark')
    setReady(true)
  }, [])

  const choose = (v: boolean) => {
    window.localStorage.setItem(KEY, v ? 'dark' : 'light')
    setDark(v)
  }

  return (
    <div className={`w100 relative ${dark ? 'w100-dark' : ''}`}>
      {/* 테마 선택 — 한 줄을 통째로 쓰지 않도록 우측 상단에 겹쳐 놓는다 */}
      <button
        onClick={() => choose(!dark)}
        aria-label={dark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'}
        title={dark ? '라이트 모드' : '다크 모드'}
        className="absolute right-3 top-2 z-40 grid h-9 w-9 place-items-center rounded-full border border-[var(--w-line)] bg-[var(--w-card)]/80 text-[var(--w-ink2)] backdrop-blur transition hover:bg-[var(--w-card)] lg:right-5 lg:top-3"
        style={{ opacity: ready ? 1 : 0, transition: 'opacity .2s' }}
      >
        {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </button>

      {children}
    </div>
  )
}
