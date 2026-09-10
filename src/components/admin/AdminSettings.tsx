'use client'

import { useEffect, useRef, useState } from 'react'
import { ExternalLink, LogOut, Moon, Settings, Sun, Type } from 'lucide-react'

import { useAdminAuth } from '@/components/admin/AdminAuth'
import { useAdminPrefs } from '@/components/admin/AdminTheme'
import type { FontSize } from '@/components/admin/FontSize'
import type { Theme } from '@/components/admin/AdminTheme'

/**
 * 설정 서랍.
 *
 * 글자 크기·테마·계정·로그아웃은 늘 화면 위에 펼쳐져 있었다. 세 줄이었다.
 * 휴대전화로 열면 사이트 헤더와 제목과 탭까지 여섯 줄이 지나서야 첫 숫자가
 * 나왔다 — 매일 보는 값을 보려고 매번 화면 반쯤을 넘겨야 했다.
 *
 * 이 중 어느 것도 자주 만지는 것이 아니다. 글자 크기는 한 번 정하면 그만이고
 * 테마는 낮과 밤에 한 번, 로그아웃은 거의 없다. 그래서 접어 넣는다. 자주 쓰는
 * 새로고침만 바깥에 남겼다.
 *
 * 다만 단추에 톱니 그림만 두지 않고 '설정' 이라고 적는다. 그림만으로는 무엇이
 * 들었는지 알 수 없고, 이 화면을 쓰시는 분에게는 글자가 더 빠르다.
 */
export default function AdminSettings() {
  const { font, setFont, theme, setTheme } = useAdminPrefs()
  const { email, signOut } = useAdminAuth()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  /* 바깥을 누르거나 Esc 를 누르면 닫는다 — 서랍은 닫는 법이 분명해야 한다 */
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={box}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={[
          'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-colors',
          open
            ? 'border-[var(--a-2e2724)] bg-[var(--a-2e2724)] text-[var(--color-white)]'
            : 'border-[var(--a-e0d6cc)] bg-[var(--color-white)] text-[var(--a-6b5d57)] hover:text-[var(--a-a63d5a)]',
        ].join(' ')}
      >
        <Settings className="h-3.5 w-3.5" aria-hidden />
        설정
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="관리 화면 설정"
          className="absolute right-0 top-full z-50 mt-2 w-[min(21rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--a-e0d6cc)] bg-[var(--color-white)] p-3 shadow-lg"
        >
          {/* 계정 — 로그인 전에는 보일 것이 없다 */}
          {email && (
            <Group label="계정">
              <p className="truncate text-xs text-[var(--a-3a322e)]">{email}</p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  signOut()
                }}
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--a-6b5d57)] hover:text-[var(--a-a63d5a)]"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden />
                로그아웃
              </button>
            </Group>
          )}

          {/* 글자 크기 */}
          <Group label="글자 크기">
            <Segmented<FontSize>
              value={font}
              onChange={setFont}
              options={[
                ['normal', '일반'],
                ['large', '크게'],
                ['xlarge', '아주 크게'],
              ]}
            />
          </Group>

          {/* 화면 */}
          <Group label="화면">
            <Segmented<Theme>
              value={theme}
              onChange={setTheme}
              options={[
                ['light', '밝게', Sun],
                ['dark', '어둡게', Moon],
              ]}
            />
          </Group>

          <a
            href="/"
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--a-6b5d57)] hover:text-[var(--a-a63d5a)]"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            손님이 보는 사이트 열기
          </a>
        </div>
      )}
    </div>
  )
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3 border-b border-[var(--a-f0e9e3)] pb-3 last:mb-0">
      <p className="mb-1.5 flex items-center gap-1.5 text-[0.6875rem] font-bold tracking-wider text-[var(--a-8a7a72)]">
        {label === '글자 크기' && <Type className="h-3 w-3" aria-hidden />}
        {label}
      </p>
      {children}
    </div>
  )
}

/**
 * 고르는 단추 한 줄.
 *
 * 칸을 고르게 나눠 손가락이 닿는 넓이를 만든다. 전에는 글자 길이에 맞춰 붙어
 * 있어서 '일반' 이 가장 작은 과녁이었다 — 가장 눌리기 어려운 것이 가장 작았다.
 */
function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly (readonly [T, string, React.ComponentType<{ className?: string }>?])[]
}) {
  return (
    <div
      className="grid gap-1 rounded-lg border border-[var(--a-e0d6cc)] bg-[var(--a-f4f1ee)] p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map(([v, label, Icon]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={[
            'inline-flex items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-bold transition-colors',
            value === v
              ? 'bg-[var(--a-2e2724)] text-[var(--color-white)]'
              : 'text-[var(--a-6b5d57)] hover:bg-[var(--color-white)]',
          ].join(' ')}
        >
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label}
        </button>
      ))}
    </div>
  )
}
