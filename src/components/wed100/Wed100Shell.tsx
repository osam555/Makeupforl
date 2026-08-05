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
      {/* 테마 선택 */}
      <div className="sticky top-0 z-40 border-b border-[var(--w-line)] bg-[var(--w-bg)]/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2 px-6 py-2 lg:px-8">
          <span className="text-[11px] font-medium text-[var(--w-mut)]">화면 테마</span>
          <div
            className="flex gap-0.5 rounded-full border border-[var(--w-line)] bg-[var(--w-card)] p-0.5"
            style={{ opacity: ready ? 1 : 0, transition: 'opacity .2s' }}
          >
            <button
              onClick={() => choose(false)}
              aria-pressed={!dark}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                dark
                  ? 'text-[var(--w-mut)] hover:text-[var(--w-ink)]'
                  : 'bg-[var(--w-rose)] text-white'
              }`}
            >
              <Sun className="h-3.5 w-3.5" /> 라이트
            </button>
            <button
              onClick={() => choose(true)}
              aria-pressed={dark}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                dark
                  ? 'bg-[var(--w-rose)] text-white'
                  : 'text-[var(--w-mut)] hover:text-[var(--w-ink)]'
              }`}
            >
              <Moon className="h-3.5 w-3.5" /> 다크
            </button>
          </div>
        </div>
      </div>

      {children}
    </div>
  )
}
