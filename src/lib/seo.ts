import { SITE_NAME, SITE_URL } from '@/lib/site'

/**
 * 사업장 정보(NAP — 이름·주소·전화).
 *
 * 푸터에 글자로만 있으면 검색엔진은 "어느 동네 어떤 업체인지" 모른다.
 * 같은 값을 구조화 데이터로도 내보내야 지역 검색과 지식 패널에 잡힌다.
 * 푸터(Footer.tsx)와 값이 어긋나면 오히려 신뢰를 잃으니 함께 고칠 것.
 */
export const BUSINESS = {
  name: SITE_NAME,
  legalName: '메이크업포엘',
  founder: '김성희',
  phone: '02-323-3321',
  email: 'makeupforl@naver.com',
  street: '논현로157길 12 평화빌딩 201호',
  locality: '강남구',
  region: '서울',
  postalCode: '06035',
  country: 'KR',
  // 위도·경도는 지도 등록 좌표가 확정되면 채운다. 틀린 좌표는 없는 것만 못하다.
  /*
    영업시간은 네 군데에 흩어져 있었다 — 푸터·브랜드소개·예약안내, 그리고 여기.
    앞의 셋은 사람이 읽고 이것은 검색엔진이 읽는다. 한 곳만 고치면 채널마다
    다른 말을 하게 되고, 지역 검색은 그 어긋남을 본다.
  */
  hours: [
    { days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], open: '09:00', close: '18:00' },
    // 주말은 예식이 아침에 시작해 여섯 시부터 연다
    { days: ['Saturday', 'Sunday'], open: '06:00', close: '18:00' },
  ],
} as const

/**
 * 같은 업체의 다른 계정들.
 *
 * 인스타·유튜브·블로그·카카오채널·네이버 플레이스가 따로 놀고 있었다 — 사이트 어디에도
 * 인스타 링크가 없었고 구조화 데이터에 sameAs 도 없었다. 묶어 두면 검색엔진이
 * "이 계정들이 한 업체" 라고 알아 각각의 신뢰가 한 곳에 모인다. 푸터 링크도 이 표를 쓴다.
 */
export const PROFILES = [
  { key: 'instagram', label: '인스타그램', url: 'https://www.instagram.com/makeupforl/' },
  { key: 'youtube', label: '유튜브', url: 'https://www.youtube.com/@혼주메이크업전문' },
  { key: 'blog', label: '네이버 블로그', url: 'https://blog.naver.com/makeupstar77' },
  { key: 'kakao', label: '카카오톡 채널', url: 'https://pf.kakao.com/_lXVVxb' },
  { key: 'place', label: '네이버 플레이스', url: 'https://m.place.naver.com/hairshop/1863938818/home' },
] as const

/** 사이트 전체에 한 번만 싣는 업체 정보. 홈이 아니라 루트 레이아웃에 둔다. */
export function businessJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'BeautySalon',
    '@id': `${SITE_URL}/#business`,
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    url: SITE_URL,
    telephone: BUSINESS.phone,
    email: BUSINESS.email,
    founder: { '@type': 'Person', name: BUSINESS.founder },
    address: {
      '@type': 'PostalAddress',
      streetAddress: BUSINESS.street,
      addressLocality: BUSINESS.locality,
      addressRegion: BUSINESS.region,
      postalCode: BUSINESS.postalCode,
      addressCountry: BUSINESS.country,
    },
    openingHoursSpecification: BUSINESS.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: h.days,
      opens: h.open,
      closes: h.close,
    })),
    areaServed: { '@type': 'City', name: '서울' },
    sameAs: PROFILES.map((p) => p.url),
    knowsAbout: ['혼주메이크업', '혼주화장', '혼주헤어', '웨딩 메이크업', '퍼스널컬러', '출장 메이크업'],
  }
}

/**
 * 빵부스러기.
 *
 * 화면에는 이미 있는데 마크업이 없어서 검색 결과에는 주소가 그대로 나온다.
 * 마크업을 달면 "메이크업포엘 › 혼주메이크업 100문100답 › 문항" 으로 표시된다.
 */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: `${SITE_URL}${t.path}`,
    })),
  }
}

/** 여러 덩어리를 한 태그로 묶어 내보낸다. 스크립트가 늘어나면 관리가 어렵다. */
export function jsonLdScript(...blocks: unknown[]) {
  return JSON.stringify(blocks.length === 1 ? blocks[0] : blocks)
}
