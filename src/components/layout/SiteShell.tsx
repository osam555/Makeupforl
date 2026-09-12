'use client'

import { usePathname } from 'next/navigation'

import SiteControls from '@/components/layout/SiteControls'

/**
 * 원본 사이트의 body#main / body#sub 구분을 재현한다.
 * - 메인(/)  : 헤더가 메인 비주얼 위에 투명하게 얹힘 (흰 로고/흰 메뉴)
 * - 서브     : 헤더가 흰 배경 + 진한 글자
 *
 * 관리 화면(/admin)에는 이 껍데기를 씌우지 않는다.
 *
 * 두 가지 이유다. 하나는 자리다 — 휴대전화로 열면 손님용 헤더와 햄버거 메뉴가
 * 화면 위쪽을 먹고, 아래에는 사업자번호와 저작권 표시가 붙는다. 관리하러 들어온
 * 사람에게는 하나도 쓸모가 없는데 첫 숫자를 그만큼 밀어낸다.
 *
 * 다른 하나는 CSS 다. .mfl-site 의 규칙들은 레이어 밖에 있어 명시도가 낮아도
 * 유틸리티 클래스를 이긴다. 관리 화면은 그 규칙과 계속 싸워 왔다. 껍데기를
 * 벗기면 싸울 일이 없어진다 — 대신 껍데기가 해 주던 초기화는 admin-theme.css 가
 * 맡는다.
 */
export default function SiteShell({
  header,
  footer,
  children,
}: {
  header: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  const pathname = usePathname() || '/'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return <>{children}</>

  const isMain = pathname === '/'
  // 100문100답은 자기 글자 크기 단추와 zoom 이 있다 — 겹치면 두 번 커진다
  const ownSize = pathname === '/honjoo100' || pathname.startsWith('/honjoo100/')
  return (
    <div className={ownSize ? 'mfl-site mfl-nosize' : 'mfl-site'}>
      {/* 원본은 body#main / body#sub — 포팅된 CSS 가 후손 셀렉터라 한 단계 더 감싼다 */}
      <div className={isMain ? 'mfl-main' : 'mfl-sub'}>
        <div className="mfl-wrapper">
          {!ownSize && <SiteControls />}
          {header}
          <main>{children}</main>
          {footer}
        </div>
      </div>
    </div>
  )
}
