import raw from '@/data/wed100.json'
import type { Wed100Data, Wed100Item } from '@/types/wed100'

const seed = raw as unknown as Wed100Data

export const wed100Meta = seed.meta
export const wed100Parts = seed.parts

function normalize(item: Wed100Item): Wed100Item {
  return {
    ...item,
    heroImage: item.heroImage ?? `/wed100/img/${item.slug}-hero.svg`,
    thumbImage: item.thumbImage ?? `/wed100/img/${item.slug}-thumb.svg`,
    published: item.published ?? true,
  }
}

/**
 * 100문100답 전체 조회.
 * Firestore(wed100_questions 컬렉션)가 세팅돼 있으면 그쪽을 우선 사용하고,
 * 미설정·비어있음·오류 시 리포에 포함된 시드 JSON으로 폴백한다.
 * 덕분에 Firebase 프로젝트 생성 전에도 사이트 전체가 정상 동작한다.
 */
export async function getWed100Items(): Promise<Wed100Item[]> {
  try {
    const { getDb } = await import('@/lib/firebase/client')
    const db = getDb()
    if (db) {
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'wed100_questions'))
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as Wed100Item)
        items.sort((a, b) => a.part - b.part || a.n - b.n)
        return items.map(normalize)
      }
    }
  } catch {
    // Firebase 미설정/권한 오류 — 시드로 폴백
  }
  return seed.items.map(normalize)
}

export async function getWed100Item(slug: string): Promise<Wed100Item | null> {
  const items = await getWed100Items()
  return items.find((x) => x.slug === slug) ?? null
}

export async function getPublishedWed100Items(): Promise<Wed100Item[]> {
  const items = await getWed100Items()
  return items.filter((x) => x.published !== false)
}

/** 같은 파트의 앞뒤 문항 */
export async function getWed100Neighbors(slug: string) {
  const items = await getPublishedWed100Items()
  const i = items.findIndex((x) => x.slug === slug)
  return {
    prev: i > 0 ? items[i - 1] : null,
    next: i >= 0 && i < items.length - 1 ? items[i + 1] : null,
    index: i,
    total: items.length,
  }
}

/** 자막 큐 글자수로 재생시간 추정 (음성 미생성 항목용) */
export function estimateDuration(item: Wed100Item): number {
  if (item.duration) return item.duration
  const chars = item.cues.reduce((a, c) => a + c.ko.length, 0)
  return Math.round(chars / 5.2 + 6)
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
