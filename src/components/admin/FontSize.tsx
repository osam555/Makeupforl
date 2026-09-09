'use client'

import { useEffect, useState } from 'react'
import { Type } from 'lucide-react'

const KEY = 'mfl:adminFont'
export type FontSize = 'normal' | 'large'

/**
 * 어드민 글자 크기.
 *
 * 기본을 '크게' 로 둔다. 이 화면을 매일 보시는 분이 쉰을 넘기셨고, 대개
 * 휴대전화로 여신다. 촘촘한 관리 화면은 만든 사람 눈에나 편하다.
 *
 * 크기를 바꾸는 방법으로 rem 을 쓴다. 화면 곳곳의 글자 크기를 하나씩 고치는 대신
 * 뿌리 글자 크기를 키우면, 그에 맞춰 여백과 아이콘까지 함께 커진다 — 글자만
 * 커지고 칸은 그대로면 오히려 더 답답해진다.
 *
 * 고른 값은 이 기기에 남는다. 서버에 두지 않는 이유는, 큰 화면과 휴대전화에서
 * 원하는 크기가 다르기 때문이다.
 */
export function useFontSize(): [FontSize, (v: FontSize) => void] {
  const [size, setSize] = useState<FontSize>('large')

  useEffect(() => {
    let v: FontSize = 'large'
    try {
      const saved = localStorage.getItem(KEY)
      if (saved === 'normal' || saved === 'large') v = saved
    } catch {
      /* 저장이 막혀 있으면 기본값으로 */
    }
    setSize(v)
  }, [])

  const choose = (v: FontSize) => {
    setSize(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* 못 남겨도 이번 화면에는 적용된다 */
    }
  }

  return [size, choose]
}

/** 크기 고르는 단추 두 개 */
export default function FontSizeToggle({
  size,
  onChange,
}: {
  size: FontSize
  onChange: (v: FontSize) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--a-e0d6cc)] bg-white p-1">
      <Type className="ml-1 h-3.5 w-3.5 text-[var(--a-8a7a72)]" aria-hidden />
      {(
        [
          ['normal', '일반'],
          ['large', '크게'],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={size === v}
          className={[
            'rounded-md px-2.5 py-1 text-xs font-bold transition-colors',
            size === v ? 'bg-[var(--a-2e2724)] text-white' : 'text-[var(--a-6b5d57)] hover:bg-[var(--a-f4f1ee)]',
          ].join(' ')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
