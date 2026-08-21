import catalog from '@/data/wed100-photos.json'

export interface Wed100Photo {
  /** 사진 식별자 — 파일명이 바뀌어도 유지된다 (예: portrait-03) */
  name: string
  /** 원본 파일명 */
  src: string
  /** PHOTO_CATS 중 하나 */
  cat: string
  /** 크롭 기준점 [x, y] (0~1) */
  focus: number[]
  enabled?: boolean
  note?: string
  hero: string
  thumb: string
  w?: number
  h?: number
}

export const WED100_PHOTOS = (catalog.photos as unknown as Wed100Photo[]).filter(
  (p) => p.enabled !== false,
)

export const PHOTO_CAT_LABEL: Record<string, string> = {
  portrait: '인물 완성컷',
  hair: '헤어',
  hanbok: '한복·소품',
  salon: '시술 현장',
  accessory: '장신구',
  banner: '배너·안내',
}

export const PHOTO_CATS = ['portrait', 'hair', 'hanbok', 'salon', 'accessory', 'banner']

export function findPhoto(name?: string | null): Wed100Photo | undefined {
  if (!name) return undefined
  return WED100_PHOTOS.find((p) => p.name === name)
}

/**
 * 어드민에서 올린 사진까지 합쳐 분류별로 묶는다.
 * 저장소 카탈로그(스크립트로 만든 사진)가 앞, 올린 사진이 뒤에 온다.
 * 같은 이름이면 나중에 올린 쪽이 이긴다.
 */
export function photosByCat(
  uploaded: Wed100Photo[] = [],
): { cat: string; label: string; photos: Wed100Photo[] }[] {
  const merged = new Map<string, Wed100Photo>()
  for (const p of WED100_PHOTOS) merged.set(p.name, p)
  for (const p of uploaded) if (p.enabled !== false) merged.set(p.name, p)
  const all = [...merged.values()]
  const known = new Set(PHOTO_CATS)
  const cats = [...PHOTO_CATS, ...new Set(all.map((p) => p.cat).filter((c) => !known.has(c)))]
  return cats
    .map((cat) => ({
      cat,
      label: PHOTO_CAT_LABEL[cat] ?? cat,
      photos: all.filter((p) => p.cat === cat),
    }))
    .filter((g) => g.photos.length > 0)
}

/** 다음에 쓸 사진 이름을 만든다 (예: portrait-34) */
export function nextPhotoName(cat: string, existing: Wed100Photo[]): string {
  const used = new Set([...WED100_PHOTOS, ...existing].map((p) => p.name))
  for (let i = 1; i < 1000; i++) {
    const name = `${cat}-${String(i).padStart(2, '0')}`
    if (!used.has(name)) return name
  }
  throw new Error('이름을 더 만들 수 없습니다.')
}
