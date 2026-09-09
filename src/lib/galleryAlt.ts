import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'
import perPhoto from '@/data/galleryAlt.json'

/**
 * 사진 설명(alt).
 *
 * 저장된 값이 대부분 "메이크업포엘 혼주 메이크업 포트폴리오 1" 처럼 번호뿐이었다.
 * 눈이 불편한 분께는 "포트폴리오 1" 이 아무 말도 아니고, 검색엔진에도 그렇다.
 * 이미지 검색은 혼주 메이크업에서 작은 유입이 아니다.
 *
 * 사진마다 무엇이 찍혔는지는 사진을 봐야 알 수 있어서, 여기서는 지어내지 않는다.
 * 대신 그 분야가 실제로 무엇인지를 자연스러운 말로 바꿔 준다. 헤어 스타일링처럼
 * 이미 사람이 적어 둔 설명이 있는 사진은 그대로 둔다 — 지어낸 말이 사람이 쓴 말을
 * 덮으면 안 된다.
 */
const GENERIC = /포트폴리오\s*\d+\s*$/

const BY_SLUG: Record<string, string> = {
  honju: '혼주 메이크업 — 자녀 결혼식을 맞은 어머니의 헤어와 메이크업',
  'family-guest': '가족·하객 메이크업 — 예식에 함께 서는 분들의 헤어와 메이크업',
  wedding: '웨딩 메이크업 — 신부 본식 헤어와 메이크업',
  'hair-styling': '헤어 스타일링 — 업스타일과 헤어 변형',
  'men-makeup': '남자 메이크업 — 남혼주와 남성 하객의 단정한 메이크업',
  'corporate-video': '기업행사·영상 메이크업',
  'photoshoot-profile': '화보·프로필 메이크업',
}

/**
 * 사진 한 장마다 적어 둔 설명.
 *
 * 사진을 하나씩 보고 실제로 보이는 것만 적은 것이다 — 저고리 색, 머리 모양,
 * 각도 같은 것. 판단이 어려운 사진은 아예 넣지 않았고, 그런 사진은 아래
 * 분야 문장으로 떨어진다. 빈 값을 넣어 두는 것보다 없는 편이 낫다.
 */
const PER_PHOTO = perPhoto as Record<string, string>

/**
 * 순서: 사진마다 적은 설명 → 사람이 적어 둔 옛 설명 → 분야를 말해 주는 문장.
 */
export function galleryAlt(
  altText: string | null | undefined,
  category?: string,
  id?: string,
): string {
  const own = id ? PER_PHOTO[id]?.trim() : ''
  if (own) {
    const label = BY_SLUG[category ?? '']?.split(' — ')[0]
    return label ? `${label} — ${own}` : own
  }

  const cur = (altText ?? '').trim()
  if (cur && !GENERIC.test(cur)) return cur

  const slug = category ?? ''
  const base =
    BY_SLUG[slug] ??
    GALLERY_CATEGORIES.find((c) => c.slug === slug)?.menuName ??
    '메이크업 시술 사진'

  // 같은 문장이 마흔 번 반복되면 그것대로 신호가 나쁘다. 끝의 번호는 남긴다
  const n = cur.match(/(\d+)\s*$/)?.[1]
  return n ? `${base} ${n}` : base
}
