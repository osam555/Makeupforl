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
    <div className={`w100 ${dark ? 'w100-dark' : ''}`}>
      {/* 테마 선택 — 한 번 정하면 잘 안 바꾸는 설정이라 아이콘 하나로 줄였다 */}
      <div className="sticky top-0 z-40 border-b border-[var(--w-line)] bg-[var(--w-bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end px-4 py-1 lg:px-8">
          <button
            onClick={() => choose(!dark)}
            aria-label={dark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'}
            title={dark ? '라이트 모드' : '다크 모드'}
            className="grid h-9 w-9 place-items-center rounded-full text-[var(--w-ink2)] transition hover:bg-[var(--w-hover)]"
            style={{ opacity: ready ? 1 : 0, transition: 'opacity .2s' }}
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {children}
    </div>
  )
}
