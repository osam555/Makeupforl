'use client'

import { useEffect } from 'react'
import { Moon, Sun } from 'lucide-react'

import { useHydrated, useStoredChoice } from '@/lib/stored'

export const SITE_THEME_KEY = 'mfl:siteTheme'
const THEMES = ['light', 'dark'] as const

/**
 * 손님용 화면의 밝은/어두운 테마 단추.
 *
 * 값은 html 의 data-theme 로 건다 — 껍데기(SiteShell) 안쪽만 바꾸면 헤더 밖 배경과
 * 스크롤 끝의 빈 자리가 밝은 채로 남는다. 첫 그림이 밝게 떴다가 어두워지는 깜빡임은
 * layout 의 인라인 스크립트가 같은 키를 먼저 읽어 막는다.
 *
 * 100문100답은 자기 테마 키(wed100Theme)가 따로 있어 같이 맞춰 준다. 사이트는 어두운데
 * 문항만 밝으면 다른 사이트로 넘어온 것처럼 보인다.
 */
export default function ThemeToggle() {
  const [theme, setTheme] = useStoredChoice(SITE_THEME_KEY, 'light', THEMES)
  const ready = useHydrated()
  const dark = theme === 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
  }, [dark])

  const toggle = () => {
    const next = dark ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem('wed100Theme', next)
    } catch {
      /* 무시 */
    }
  }

  return (
    <button
      type="button"
      className="btn-theme"
      onClick={toggle}
      aria-label={dark ? '밝은 화면으로' : '어두운 화면으로'}
      title={dark ? '밝은 화면' : '어두운 화면'}
      style={{ opacity: ready ? 1 : 0 }}
    >
      {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
    </button>
  )
}
