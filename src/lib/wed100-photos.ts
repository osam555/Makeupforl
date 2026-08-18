import catalog from '@/data/wed100-photos.json'

export interface Wed100Photo {
  /** 사진 식별자 — 파일명이 바뀌어도 유지된다 (예: portrait-03) */
  name: string
  /** 원본 파일명 */
  src: string
  /** portrait | hair | hanbok */
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
}

export const PHOTO_CATS = ['portrait', 'hair', 'hanbok']

export function findPhoto(name?: string | null): Wed100Photo | undefined {
  if (!name) return undefined
  return WED100_PHOTOS.find((p) => p.name === name)
}

export function photosByCat(): { cat: string; label: string; photos: Wed100Photo[] }[] {
  return PHOTO_CATS.map((cat) => ({
    cat,
    label: PHOTO_CAT_LABEL[cat] ?? cat,
    photos: WED100_PHOTOS.filter((p) => p.cat === cat),
  })).filter((g) => g.photos.length > 0)
}
