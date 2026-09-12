'use client'

import { Moon, Sun } from 'lucide-react'

import { useHydrated, useStoredChoice } from '@/lib/stored'

const KEY = 'wed100Theme'
const THEMES = ['light', 'dark'] as const

/*
  글자 크기 — 보통 / 크게 / 더 크게.

  손님이 50~60대라 기본을 '크게' 로 둔다. 화면의 글자가 px 로 잡혀 있어 뿌리 크기를
  올리는 방식이 안 먹고, 하나씩 고치면 백 군데다. 이 칸에 zoom 을 걸면 글자·여백·
  아이콘이 한 비율로 커진다 — 글자만 커지고 칸이 그대로면 더 답답해진다.
*/
const SIZE_KEY = 'wed100Size'
const SIZES = ['normal', 'large', 'xlarge'] as const
type Size = (typeof SIZES)[number]
const ZOOM: Record<Size, number> = { normal: 1, large: 1.15, xlarge: 1.3 }
const SIZE_LABEL: Record<Size, string> = { normal: '보통', large: '크게', xlarge: '더 크게' }

/** 100문100답 섹션 전용 라이트/다크 테마 래퍼 + 선택 토글 */
export default function Wed100Shell({ children }: { children: React.ReactNode }) {
  // 기본값은 라이트. 사용자가 고른 값만 기억한다.
  const [theme, setTheme] = useStoredChoice(KEY, 'light', THEMES)
  const dark = theme === 'dark'
  const [size, setSize] = useStoredChoice<Size>(SIZE_KEY, 'large', SIZES)

  // 저장된 값을 알기 전(서버가 그린 화면과 같아야 하는 동안)에는 단추를 감춰 둔다
  const ready = useHydrated()

  const choose = (v: boolean) => setTheme(v ? 'dark' : 'light')

  return (
    <div className={`w100 relative ${dark ? 'w100-dark' : ''}`} style={{ zoom: ZOOM[size] }}>
      {/* 글자 크기·테마 — 한 줄을 통째로 쓰지 않도록 우측 상단에 겹쳐 놓는다 */}
      <div
        className="absolute right-3 top-2 z-40 flex items-center gap-1.5 lg:right-5 lg:top-3"
        style={{ opacity: ready ? 1 : 0, transition: 'opacity .2s' }}
      >
        <div
          role="radiogroup"
          aria-label="글자 크기"
          className="flex items-center overflow-hidden rounded-full border border-[var(--w-line)] bg-[var(--w-card)]/80 backdrop-blur"
        >
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
                size === v ? 'bg-[var(--w-rose)] text-white' : 'text-[var(--w-ink2)] hover:bg-[var(--w-card)]',
              ].join(' ')}
            >
              가
            </button>
          ))}
        </div>
        <button
          onClick={() => choose(!dark)}
          aria-label={dark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'}
          title={dark ? '라이트 모드' : '다크 모드'}
          className="grid h-9 w-9 place-items-center rounded-full border border-[var(--w-line)] bg-[var(--w-card)]/80 text-[var(--w-ink2)] backdrop-blur transition hover:bg-[var(--w-card)]"
        >
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </div>

      {children}
    </div>
  )
}
