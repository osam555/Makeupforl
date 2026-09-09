'use client'

import { useEffect, useState } from 'react'
import { Moon, RefreshCw, Sun } from 'lucide-react'

import FontSizeToggle, { type FontSize } from '@/components/admin/FontSize'

const KEY = 'mfl:adminTheme'
export type Theme = 'light' | 'dark'

/**
 * 밝은 화면 / 어두운 화면.
 *
 * 원장님은 예식 전날 밤과 새벽에 이 화면을 여신다. 어두운 방에서 흰 화면은
 * 눈이 부시다. 글자 크기와 마찬가지로 이 기기에 남긴다 — 큰 화면과 휴대전화에서
 * 원하는 쪽이 다르다.
 *
 * 기본은 밝은 쪽이다. 낮에 쓰는 경우가 더 많고, 바꾸고 싶을 때 바꾸면 된다.
 */
export function useTheme(): [Theme, (v: Theme) => void] {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === 'dark' || saved === 'light') setTheme(saved)
    } catch {
      /* 저장이 막혀 있으면 기본값으로 */
    }
  }, [])

  const choose = (v: Theme) => {
    setTheme(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* 못 남겨도 이번 화면에는 적용된다 */
    }
  }

  return [theme, choose]
}

/**
 * 글자 크기 · 테마 · 새로고침.
 *
 * 새로고침을 둔 이유는, 이 화면들이 열 때 한 번 값을 읽고 그대로 있기 때문이다.
 * 예약이 들어왔는지, 방금 고친 문항이 반영됐는지 보려면 다시 읽어야 하는데
 * 휴대전화 앱으로 열면 주소창이 없어 새로고침할 방법이 없었다.
 */
export default function AdminToolbar({
  font,
  onFont,
  theme,
  onTheme,
}: {
  font: FontSize
  onFont: (v: FontSize) => void
  theme: Theme
  onTheme: (v: Theme) => void
}) {
  const [busy, setBusy] = useState(false)

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <FontSizeToggle size={font} onChange={onFont} />

      <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--a-e0d6cc)] bg-white p-1">
        {(
          [
            ['light', '밝게', Sun],
            ['dark', '어둡게', Moon],
          ] as const
        ).map(([v, label, Icon]) => (
          <button
            key={v}
            type="button"
            onClick={() => onTheme(v)}
            aria-pressed={theme === v}
            className={[
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
              theme === v
                ? 'bg-[var(--a-2e2724)] text-[var(--color-white)]'
                : 'text-[var(--a-6b5d57)] hover:bg-[var(--a-f4f1ee)]',
            ].join(' ')}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            {label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={() => {
          setBusy(true)
          location.reload()
        }}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--a-e0d6cc)] bg-white px-2.5 py-1.5 text-xs font-bold text-[var(--a-6b5d57)] hover:text-[var(--a-a63d5a)] disabled:opacity-60"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} aria-hidden />
        새로고침
      </button>
    </div>
  )
}
