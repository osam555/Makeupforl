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

const supabaseConfigured =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * 100문100답 전체를 가져온다.
 * Supabase 테이블(wed100_questions)이 준비돼 있으면 그쪽을 우선 사용하고,
 * 아직 없거나 조회에 실패하면 리포에 포함된 시드 JSON으로 폴백한다.
 * 덕분에 DB 세팅 전에도 사이트가 정상 동작한다.
 */
export async function getWed100Items(): Promise<Wed100Item[]> {
  if (supabaseConfigured) {
    try {
      const { createClient } = await import('@/lib/supabase/server')
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('wed100_questions')
        .select('*')
        .order('part', { ascending: true })
        .order('n', { ascending: true })
      if (!error && data && data.length > 0) {
        return (data as Wed100Item[]).map(normalize)
      }
    } catch {
      // 테이블 미생성 등 — 시드로 폴백
    }
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
