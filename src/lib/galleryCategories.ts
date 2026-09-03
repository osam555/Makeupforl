/**
 * 갤러리 = 업무분야. 헤더 메뉴·갤러리 탭·분야 페이지가 모두 이 목록 하나를 본다.
 *
 * slug 는 URL 경로(/gallery/honju)이자 gallery.json 의 category 값이다.
 * desc 는 분야 페이지 상단 문구와 검색결과 설명에 함께 쓴다.
 */
export type GalleryCategory = {
  slug: string
  /** 갤러리 탭에 쓰는 짧은 이름 */
  name: string
  /** 헤더 업무분야 메뉴에 쓰는 이름 — 메뉴에서는 분야가 드러나야 해서 조금 길다 */
  menuName: string
  desc: string
}

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    slug: 'honju',
    name: '혼주',
    menuName: '혼주 메이크업',
    desc: '자녀의 결혼식을 맞은 어머니·아버지를 위한 혼주 메이크업과 헤어입니다.',
  },
  {
    slug: 'family-guest',
    name: '가족 및 하객',
    menuName: '가족 · 하객',
    desc: '형제자매·친척·하객 등 예식에 함께하시는 분들의 메이크업입니다.',
  },
  {
    slug: 'wedding',
    name: '웨딩',
    menuName: '웨딩 (신부)',
    desc: '본식·촬영·리허설까지, 신부님을 위한 웨딩 메이크업입니다.',
  },
  {
    slug: 'hair-styling',
    name: '헤어변형',
    menuName: '헤어 스타일링',
    desc: '업스타일·반묶음·브레이드 등 얼굴형과 예복에 맞춘 헤어 연출입니다.',
  },
  {
    slug: 'men-makeup',
    name: '남자 메이크업',
    menuName: '남자 메이크업',
    desc: '혼주 아버지·신랑·하객 남성을 위한 자연스러운 그루밍 메이크업입니다.',
  },
  {
    slug: 'corporate-video',
    name: '기업행사&영상메이크업',
    menuName: '기업행사 · 영상',
    desc: '기업 행사, 방송·유튜브 촬영 현장을 위한 메이크업입니다.',
  },
  {
    slug: 'photoshoot-profile',
    name: '화보 & 프로필',
    menuName: '화보 · 프로필',
    desc: '프로필 촬영과 화보를 위한 콘셉트 메이크업입니다.',
  },
]

/** 갤러리 탭에 쓰는 목록 — 맨 앞에 '전체' */
export const GALLERY_TABS = [{ slug: 'all', name: '전체' }, ...GALLERY_CATEGORIES]

export function findCategory(slug: string | null | undefined) {
  if (!slug) return undefined
  return GALLERY_CATEGORIES.find((c) => c.slug === slug)
}

/** 예전 링크가 넘기던 한글 이름(?cat=혼주)도 슬러그로 받아준다 */
export function toSlug(cat: string | null | undefined) {
  if (!cat) return 'all'
  if (cat === 'all') return 'all'
  const hit = GALLERY_CATEGORIES.find((c) => c.slug === cat || c.name === cat || c.menuName === cat)
  return hit ? hit.slug : 'all'
}

export function categoryHref(slug: string) {
  return slug === 'all' ? '/gallery' : `/gallery/${slug}`
}
