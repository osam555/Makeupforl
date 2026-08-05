'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

const KEY = 'wed100Theme'

/** 100문100답 섹션 전용 라이트/다크 테마 래퍼 + 토글 */
export default function Wed100Shell({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const saved = window.localStorage.getItem(KEY)
    if (saved === 'dark' || saved === 'light') {
      setDark(saved === 'dark')
    } else {
      setDark(window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
    setReady(true)
  }, [])

  const toggle = () => {
    setDark((v) => {
      window.localStorage.setItem(KEY, v ? 'light' : 'dark')
      return !v
    })
  }

  return (
    <div className={`w100 ${dark ? 'w100-dark' : ''}`} style={{ minHeight: '60vh' }}>
      {children}
      <button
        onClick={toggle}
        aria-label={dark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        title={dark ? '라이트 모드' : '다크 모드'}
        className="fixed bottom-5 right-5 z-50 grid h-12 w-12 place-items-center rounded-full border border-[var(--w-line)] bg-[var(--w-card)] text-[var(--w-ink)] shadow-lg transition hover:scale-105"
        style={{ opacity: ready ? 1 : 0 }}
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>
    </div>
  )
}
