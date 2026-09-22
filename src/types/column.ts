/**
 * CEO 칼럼 — 대표원장이 쓰는 무료 정보성 글.
 *
 * 100문100답(Wed100Item)과 형제 모양을 일부러 맞췄다: 시드 JSON + Firestore 폴백,
 * 문단 배열(body), 키워드, 수정 시각. 다만 칼럼은 유료가 아니라 전부 열려 있고,
 * 음성·자막·파트 구조가 없다 — 검색 유입을 받아 허브·문항·상담으로 보내는 글이다.
 */
export interface Column {
  /** URL 조각. 읽기 좋은 영/숫자 슬러그로 둔다 (예: 'sanggyeonrye-makeup') */
  slug: string
  title: string
  /** meta description 이자 목록 카드 요약 */
  description: string
  /** 히어로 아래 한두 줄 */
  lead: string
  /** 본문 문단 — 문항 answer[] 와 같은 모양이라 렌더러를 나눠 쓸 수 있다 */
  body: string[]
  keywords: string[]
  /**
   * 대표 이미지 — 100문100답과 같은 사진 창고(`wed100-photos`)를 쓴다.
   *
   * 칼럼용 사진을 따로 찍지 않았고, 찍더라도 두 곳이 서로 다른 얼굴을 보이면
   * 같은 샵으로 읽히지 않는다. `photo` 는 사진 이름(예: salon-08)이고 나머지 둘은
   * 그때 정해진 주소다 — 문항(Wed100Item)과 같은 세 칸이라 어드민 고르개를 나눠 쓴다.
   */
  photo?: string
  /** 1600x900. 없으면 공유 기본 OG 이미지를 쓴다 */
  heroImage?: string
  /** 800x800. 목록 카드가 쓴다 */
  thumbImage?: string
  /** 필자. 기본은 대표원장 */
  author: string
  /** 발행일 (BlogPosting datePublished). 지어낸 날짜 금지 */
  publishedAt: string
  /** 수정일 (dateModified). 고쳤을 때만 채운다 */
  updatedAt?: string
  updatedBy?: string
  /** 본문에서 이어 주는 검색어 허브 slug (예: '혼주메이크업') */
  relatedHubs?: string[]
  /** 본문에서 이어 주는 100문100답 문항 slug (예: 'p3-05') */
  relatedQna?: string[]
  /** false 면 목록·색인에서 숨긴다 (초안). 기본 true */
  published?: boolean
}

export interface ColumnData {
  meta: {
    title: string
    subtitle: string
    author: string
  }
  items: Column[]
}
