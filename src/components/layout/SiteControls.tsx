'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { useHydrated, useStoredChoice } from '@/lib/stored'
import { SITE_THEME_KEY } from '@/components/layout/ThemeToggle'

export const SITE_SIZE_KEY = 'mfl:siteSize'
const SIZES = ['normal', 'large', 'xlarge'] as const
type Size = (typeof SIZES)[number]
const SIZE_LABEL: Record<Size, string> = { normal: '보통', large: '크게', xlarge: '더 크게' }
const THEMES = ['light', 'dark'] as const

/**
 * 손님용 화면의 글자 크기·테마 — 스크롤하면 위에 떠 있는 알약.
 *
 * 헤더에 달 단추가 있지만 헤더는 스크롤과 함께 올라가 버린다. 100문답처럼 긴 화면
 * 중간에서 글자를 키우고 싶을 때 맨 위로 돌아가야 했다. 헤더가 보이는 동안(80px 안)은
 * 숨긴다 — 그때는 헤더 단추와 겹치고, 하나면 된다.
 *
 * 크기는 html 의 data-size 로 건다. 값에 따른 zoom 은 site-dark.css 가 맡고, 첫 그림
 * 전에 layout 의 인라인 스크립트가 같은 키를 읽어 건다(테마와 같은 방식).
 * 100문100답 페이지는 자기 단추와 zoom 이 있어 SiteShell 이 이 컴포넌트를 빼고 그린다.
 */
export default function SiteControls() {
  const [size, setSize] = useStoredChoice<Size>(SITE_SIZE_KEY, 'normal', SIZES)
  const [theme, setTheme] = useStoredChoice(SITE_THEME_KEY, 'light', THEMES)
  const ready = useHydrated()
  const [scrolled, setScrolled] = useState(false)
  const dark = theme === 'dark'

  useEffect(() => {
    document.documentElement.setAttribute('data-size', size)
  }, [size])

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 80)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark'
    setTheme(next)
    document.documentElement.setAttribute('data-theme', next)
    try {
      localStorage.setItem('wed100Theme', next)
    } catch {
      /* 무시 */
    }
  }

  const show = ready && scrolled
  return (
    <div className="pointer-events-none sticky top-2 z-[95] flex h-0 items-start justify-end pr-3 lg:pr-5">
      <div
        className="site-controls pointer-events-auto flex items-center gap-1.5"
        style={{ opacity: show ? 1 : 0, transform: show ? 'none' : 'translateY(-6px)', transition: 'opacity .2s, transform .2s', visibility: show ? 'visible' : 'hidden' }}
      >
        <div role="radiogroup" aria-label="글자 크기" className="site-controls-pill flex items-center overflow-hidden rounded-full">
          {SIZES.map((v, i) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={size === v}
              onClick={() => setSize(v)}
              title={`글자 ${SIZE_LABEL[v]}`}
              className={[
                'h-9 px-2.5 font-bold leading-none transition',
                i === 0 ? 'text-[13px]' : i === 1 ? 'text-[15px]' : 'text-[17px]',
                size === v ? 'is-on' : '',
              ].join(' ')}
            >
              가
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={dark ? '밝은 화면으로' : '어두운 화면으로'}
          className="site-controls-pill grid h-9 w-9 place-items-center rounded-full"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}
