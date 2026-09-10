'use client'

import { createContext, useContext } from 'react'

import { useFontSize, type FontSize } from '@/components/admin/FontSize'
import { useStoredChoice } from '@/lib/stored'

const THEME_KEY = 'mfl:adminTheme'
export type Theme = 'light' | 'dark'
const THEMES: readonly Theme[] = ['light', 'dark']

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
  return useStoredChoice(THEME_KEY, 'light', THEMES)
}

type Prefs = {
  font: FontSize
  setFont: (v: FontSize) => void
  theme: Theme
  setTheme: (v: Theme) => void
}

const Ctx = createContext<Prefs | null>(null)

/** 뿌리 글자 크기. 나머지 크기는 admin-theme.css 가 이 값에 맞춰 따라온다 */
const ROOT: Record<FontSize, string> = { normal: '16px', large: '20px', xlarge: '24px' }

export function useAdminPrefs(): Prefs {
  const v = useContext(Ctx)
  if (!v) throw new Error('AdminTheme 안에서만 쓸 수 있습니다')
  return v
}

/**
 * 관리 화면 전체의 색과 글자 크기.
 *
 * 처음에는 로그인 게이트 안쪽에만 걸었는데, 화면마다 제목과 탭이 게이트 바깥에
 * 있어 위쪽만 밝은 채로 남았다. 그래서 /admin 아래 전부를 감싸는 자리로 옮긴다.
 *
 * 색을 뿌리(html)가 아니라 이 칸에 거는 이유는 사이트 쪽으로 새지 않게 하기
 * 위해서다. 손님이 보는 화면까지 어두워지면 안 된다.
 *
 * 글자 크기는 이 칸의 기준 크기를 올리는 방식이다. 곳곳의 글자를 하나씩 고치는
 * 대신 뿌리를 키우면 rem 으로 잡힌 글자와 여백·아이콘이 함께 커진다 — 글자만
 * 커지고 칸이 그대로면 오히려 더 답답해진다.
 */
export default function AdminTheme({ children }: { children: React.ReactNode }) {
  const [font, setFont] = useFontSize()
  const [theme, setTheme] = useTheme()

  return (
    <Ctx.Provider value={{ font, setFont, theme, setTheme }}>
      <div
        className="admin-theme min-h-screen"
        data-theme={theme}
        data-size={font}
        style={{ fontSize: ROOT[font] }}
      >
        {children}
      </div>
    </Ctx.Provider>
  )
}
