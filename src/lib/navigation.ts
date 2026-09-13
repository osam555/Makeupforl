import { GALLERY_CATEGORIES } from './galleryCategories'
import { HUBS } from './hubs'

export type NavSub = { name: string; href: string }
export type NavItem = {
  name: string
  href: string
  sub?: NavSub[]
  /** 활성 판정 경로. 없으면 href 로 판단한다 ('/gallery' 와 '/gallery/혼주' 를 갈라야 해서 둔다) */
  match?: { prefix?: string; exact?: string }
}

/**
 * 사이트 전체 메뉴. 헤더 GNB·모바일 드로어·서브페이지 탭이 모두 이 하나를 본다.
 *
 * 최상위 항목마다 축을 하나씩만 둔다.
 *   업무분야   = 누구를 위한 것인가 (예전엔 갤러리 서브메뉴에만 있었다)
 *   서비스·예약 = 어디서 어떻게 받나 (샵/출장 + 컨설팅 + 예약을 한 흐름으로 묶었다)
 *   갤러리     = 분야 구분 없이 사진을 몰아 보는 곳
 * 사진이 한 장도 없던 [패션쇼] 는 뺐다. 사진이 생기면 galleryCategories 에 추가하면
 * 이 메뉴와 갤러리 탭에 함께 들어온다.
 */
export const navigation: NavItem[] = [
  {
    name: '브랜드소개',
    href: '/brand',
    sub: [
      { name: '대표인사말', href: '/brand' },
      { name: '회사소개', href: '/brand#company' },
      { name: '오시는 길', href: '/brand#location' },
    ],
  },
  /*
    검색어 허브를 100문100답 아래에 단다.

    허브는 값을 내지 않아도 다 읽히는 글이고, 지금 사이트에서 검색으로 사람을
    데려올 수 있는 거의 유일한 자산이다. 그런데 메뉴에 없으면 아무 데서도
    링크가 걸리지 않는다 — 사람도 못 찾고, 검색엔진도 중요하지 않은 페이지로 본다.
  */
  {
    name: '혼주메이크업 100문100답',
    href: '/honjoo100',
    match: { prefix: '/honjoo100' },
    sub: [
      { name: '전체 문항 보기', href: '/honjoo100' },
      ...HUBS.map((h) => ({ name: h.slug, href: `/${h.slug}` })),
    ],
  },
  {
    name: '업무분야',
    href: `/gallery/${GALLERY_CATEGORIES[0].slug}`,
    match: { prefix: '/gallery/' },
    sub: GALLERY_CATEGORIES.map((c) => ({ name: c.menuName, href: `/gallery/${c.slug}` })),
  },
  {
    name: '서비스 · 예약',
    href: '/services',
    sub: [
      { name: '샵 메이크업', href: '/services#shop' },
      { name: '출장 메이크업', href: '/services#visit' },
      { name: '1:1 사전컨설팅', href: '/consultation' },
      { name: '예약안내', href: '/reservation' },
    ],
  },
  { name: '갤러리', href: '/gallery', match: { exact: '/gallery' } },
  { name: '고객후기', href: '/reviews' },
  /*
    유튜브와 인스타를 한 항목으로 묶는다. 인스타는 검색엔진에 닫힌 곳이라 사이트에
    사본(/instagram)을 두었는데, 메뉴에 없으면 그 사본에도 링크가 하나도 안 걸린다.
  */
  {
    name: '유튜브 · 인스타',
    href: '/videos',
    sub: [
      { name: '유튜브 채널', href: '/videos' },
      { name: '인스타그램', href: '/instagram' },
    ],
  },
]

export function isNavActive(item: NavItem, pathname: string) {
  if (item.match?.exact) return pathname === item.match.exact
  if (item.match?.prefix) return pathname.startsWith(item.match.prefix)
  if (item.href !== '/' && pathname.startsWith(item.href.split('#')[0])) return true
  // 하위 항목 경로도 본다 — /consultation, /instagram, 허브(/혼주머리)는 최상위 href 와 다르다
  return item.sub?.some((s) => navPath(s.href) !== '/' && pathname.startsWith(navPath(s.href))) ?? false
}

export function navPath(href: string) {
  return href.split('#')[0]
}

export function navHash(href: string) {
  const i = href.indexOf('#')
  return i === -1 ? '' : href.slice(i)
}

/**
 * 지금 경로가 속한 메뉴 그룹 — 서브페이지 탭을 이걸로 자동 생성한다.
 * 최상위 href 로만 찾으면 [서비스 · 예약](href=/services) 그룹에 속한 /consultation,
 * /reservation 에서 탭이 안 나온다. 하위 항목 경로까지 본다.
 */
export function findNavGroup(pathname: string): NavItem | undefined {
  return navigation.find(
    (item) =>
      item.sub &&
      item.sub.length > 0 &&
      (isNavActive(item, pathname) || item.sub.some((s) => navPath(s.href) === pathname)),
  )
}

/**
 * 그룹 안에서 '지금 이 페이지에 있는' 항목들.
 * 둘 이상이면 그것들은 같은 페이지의 앵커라는 뜻이라 활성 표시를 스크롤로 따라가야 한다.
 * (브랜드소개 3개 전부 /brand, 서비스·예약의 샵·출장 2개가 /services)
 */
export function subsOnCurrentPage(item: NavItem, pathname: string): NavSub[] {
  if (!item.sub) return []
  return item.sub.filter((s) => navPath(s.href) === pathname)
}
