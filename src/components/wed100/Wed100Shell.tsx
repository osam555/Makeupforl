'use client'

import { Moon, Sun } from 'lucide-react'

import { useHydrated, useStoredChoice } from '@/lib/stored'

const KEY = 'wed100Theme'
const THEMES = ['light', 'dark'] as const

/** 100문100답 섹션 전용 라이트/다크 테마 래퍼 + 선택 토글 */
export default function Wed100Shell({ children }: { children: React.ReactNode }) {
  // 기본값은 라이트. 사용자가 고른 값만 기억한다.
  const [theme, setTheme] = useStoredChoice(KEY, 'light', THEMES)
  const dark = theme === 'dark'

  // 저장된 값을 알기 전(서버가 그린 화면과 같아야 하는 동안)에는 단추를 감춰 둔다
  const ready = useHydrated()

  const choose = (v: boolean) => setTheme(v ? 'dark' : 'light')

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
