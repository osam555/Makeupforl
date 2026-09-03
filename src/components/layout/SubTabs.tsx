'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { findNavGroup, navHash, subsOnCurrentPage } from '@/lib/navigation'

/**
 * 서브페이지 상단 탭(원본 #lnb). 헤더 메뉴에서 지금 경로가 속한 그룹을 찾아 자동으로 그린다.
 * 예전에는 브랜드소개만 탭을 직접 넘겨 썼고 활성 항목이 문자열로 고정돼 있어서,
 * 회사소개를 눌러도 알약이 대표인사말에 그대로 있었다.
 *
 * 활성 판정
 *   지금 경로에 걸린 항목이 하나면  → 그 항목
 *   둘 이상이면(같은 페이지의 앵커) → 화면에 보이는 섹션을 따라 움직인다
 */
export default function SubTabs() {
  const pathname = usePathname() || '/'
  const group = findNavGroup(pathname)
  const here = group ? subsOnCurrentPage(group, pathname) : []
  const anchorMode = here.length > 1
  const [activeHash, setActiveHash] = useState<string>('')

  useEffect(() => {
    if (!anchorMode) return

    const targets = here
      .map((s) => navHash(s.href).slice(1))
      .filter(Boolean)
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el))
    if (targets.length === 0) return

    // 화면 위쪽 판정선을 지난 마지막 섹션을 활성으로 본다
    const pick = () => {
      const line = 160 // 헤더 + 탭 높이
      let current = ''
      for (const el of targets) {
        if (el.getBoundingClientRect().top <= line) current = `#${el.id}`
      }
      setActiveHash(current)
    }
    pick()
    window.addEventListener('scroll', pick, { passive: true })
    window.addEventListener('resize', pick)
    return () => {
      window.removeEventListener('scroll', pick)
      window.removeEventListener('resize', pick)
    }
    // here 는 매 렌더 새 배열이라 의존성에 넣으면 계속 재등록된다. 경로가 바뀌면 다시 잡는다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorMode, pathname])

  if (!group?.sub || group.sub.length === 0) return null

  // 앵커 그룹에서 아직 아무 섹션도 안 지났으면 첫 항목을 활성으로 둔다
  const activeHref = anchorMode
    ? (here.find((s) => navHash(s.href) === activeHash) ?? here[0]).href
    : here[0]?.href

  // 항목이 많으면 꽉 채우지 않고 가로로 넘긴다 (업무분야 7개)
  const scroll = group.sub.length >= 5

  return (
    <div className="mfl-lnb">
      <div className={scroll ? 'lnb lnb-scroll' : 'lnb'}>
        <ul>
          {group.sub.map((s) => {
            const active = s.href === activeHref
            return (
              <li key={s.href} className={active ? 'active' : undefined}>
                <Link href={s.href} aria-current={active ? 'page' : undefined}>
                  {s.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
