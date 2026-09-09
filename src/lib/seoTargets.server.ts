import { HUBS } from '@/lib/hubs'
import {
  SEO_TARGETS,
  type SeoConfig,
  type SeoFacts,
  type SeoSnapshot,
  DEFAULT_RANK,
} from '@/lib/seoTargets'
import { getPublishedWed100Items } from '@/lib/wed100'

export const SEO_CONFIG_DOC = { collection: 'site_config', doc: 'seo' }

/**
 * 사이트를 읽어 검색어별 사실을 모은다 (서버 전용).
 *
 * 밖에 나가서 재지 않는다. 우리가 쓴 것만 센다 — 어느 페이지가 제목에 이 말을
 * 갖고 있는지, 본문이 얼마나 되는지, 뒷받침하는 문항이 몇 개인지.
 * 순위처럼 밖에서 재야 아는 값은 사람이 적어 넣는다.
 */
const strip = (s: string) => s.replace(/\s+/g, '')

export async function collectSeoFacts(): Promise<Record<string, SeoFacts>> {
  const items = await getPublishedWed100Items()

  // 허브는 제목과 본문 길이를 코드에서 바로 알 수 있다
  const pages = HUBS.map((h) => ({
    path: `/${h.slug}`,
    title: h.title,
    chars:
      h.lead.length +
      h.intro.join('').length +
      h.sections.reduce((a, s) => a + s.h.length + s.body.join('').length, 0),
  }))

  // 허브 밖에서 같은 말을 제목에 가진 페이지 — 잠식을 보려면 이쪽도 세어야 한다
  const others = [
    { path: '/', title: '메이크업포엘 | 강남 논현동 혼주 전문 메이크업샵' },
    { path: '/honjoo100', title: '혼주메이크업 100문 100답 | 메이크업포엘' },
    { path: '/reviews', title: '고객후기 — 혼주님이 보내주신 문자 | 메이크업포엘' },
    { path: '/services', title: '혼주 샵 메이크업과 출장 메이크업 | 메이크업포엘' },
    { path: '/gallery/honju', title: '혼주 메이크업 사진 | 메이크업포엘' },
  ]

  const out: Record<string, SeoFacts> = {}
  for (const t of SEO_TARGETS) {
    const key = strip(t.term)
    const owner = pages.find((p) => p.path === t.owner)
    const titlePages = [
      ...pages.filter((p) => strip(p.title).includes(key)).map((p) => p.path),
      ...others.filter((p) => strip(p.title).includes(key)).map((p) => p.path),
    ]
    out[t.term] = {
      ownerChars: owner?.chars ?? 0,
      titlePages,
      questions: items.filter((x) => strip(x.question).includes(key)).length,
      // 허브로 들어오는 링크는 지금 홈·후기·갤러리·서비스 네 곳에서 건다
      inboundLinks: HUBS.some((h) => `/${h.slug}` === t.owner) ? 4 : 0,
    }
  }
  return out
}

/** 사람이 적어 넣은 순위. 없으면 빈 값으로 시작한다 */
export async function getSeoConfig(): Promise<SeoConfig> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection(SEO_CONFIG_DOC.collection).doc(SEO_CONFIG_DOC.doc).get()
      if (snap.exists) {
        const d = snap.data() as Partial<SeoConfig>
        const ranks: SeoConfig['ranks'] = {}
        for (const t of SEO_TARGETS) {
          ranks[t.term] = { ...DEFAULT_RANK, ...(d.ranks?.[t.term] ?? {}) }
        }
        return { ranks, updatedAt: d.updatedAt }
      }
    }
  } catch {
    /* 설정이 없어도 화면은 떠야 한다 */
  }
  const ranks: SeoConfig['ranks'] = {}
  for (const t of SEO_TARGETS) ranks[t.term] = { ...DEFAULT_RANK }
  return { ranks }
}

/**
 * 준비도 기록 읽기.
 *
 * 어드민을 안 연 날은 기록이 없다. 없는 날을 앞뒤 값으로 메우지 않는다 —
 * 그러면 실제로 잰 날과 지어낸 날을 구분할 수 없게 되고, 그래프가 매끄러워 보이는
 * 만큼 덜 정직해진다.
 */
export async function getSeoHistory(limit = 60): Promise<SeoSnapshot[]> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const db = await getAdminDb()
    if (!db) return []
    const snap = await db
      .collection('seo_snapshots')
      .orderBy('__name__', 'desc')
      .limit(limit)
      .get()
    return snap.docs
      .map((d) => d.data() as SeoSnapshot)
      .filter((x) => x?.date)
      .reverse()
  } catch {
    return []
  }
}
