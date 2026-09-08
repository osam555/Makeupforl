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
  // 1) 서버에서는 Admin SDK 로 먼저 읽는다 (보안 규칙·클라이언트 SDK 상태와 무관)
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection('wed100_questions').get()
      if (!snap.empty) {
        const items = snap.docs.map((d) => d.data() as Wed100Item)
        items.sort((a, b) => a.part - b.part || a.n - b.n)
        return items.map(normalize)
      }
    }
  } catch {
    // Admin SDK 미설정 — 클라이언트 SDK 로 재시도
  }

  // 2) 클라이언트 SDK (브라우저 또는 서비스 계정 미설정 환경)
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

const norm = (s: string) => s.replace(/\s+/g, '')

/**
 * 자막 큐를 답변 문단에 다시 매핑해 문단이 시작하는 지점을 찾는다.
 * 자막은 문장 단위로 쪼개져 있어서 이대로 이어 붙이면 문단 구분이 사라진다.
 */
export function paragraphStarts(answer: string[], cues: { ko: string }[]): number[] {
  const starts: number[] = []
  let para = 0
  let rest = norm(answer[0] ?? '')

  for (let i = 0; i < cues.length; i++) {
    const c = norm(cues[i].ko)
    if (!c) continue
    if (!rest.includes(c) && para + 1 < answer.length) {
      // 현재 문단에서 더 못 찾으면 다음 문단으로 넘어간 것으로 본다
      for (let j = para + 1; j < answer.length; j++) {
        if (norm(answer[j]).includes(c)) {
          para = j
          rest = norm(answer[j])
          starts.push(i)
          break
        }
      }
    }
    rest = rest.replace(c, '')
  }
  return starts
}

/**
 * 잠긴 문항에 보여 줄 맛보기.
 *
 * 제목만 있으면 무엇이 궁금해질지 알 수 없다. 첫머리 두 줄쯤을 열어
 * "이 답을 읽고 싶다" 는 마음이 들게 한다.
 *
 * 길이를 짧게 묶어 두는 것이 중요하다. 많이 열면 파는 물건이 없어지고,
 * 검색엔진도 유료 표기와 실제 노출이 어긋난 것으로 본다. 문장 중간에서
 * 자르면 읽기 사나우니 문장 끝을 찾아 거기서 끊는다.
 */
export function teaser(answer: string[], max = 95): string {
  const t = answer.join(' ').replace(/\s+/g, ' ').trim()
  if (!t) return ''
  if (t.length <= max) return t

  const cut = t.slice(0, max)
  // 마지막 문장 끝(., !, ?, 다.)에서 끊는다. 너무 앞이면 그냥 글자 수로 자른다
  const dot = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
  if (dot > max * 0.5) return cut.slice(0, dot + 1)
  return cut.trimEnd() + '…'
}
