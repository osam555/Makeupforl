import { HUBS } from '@/lib/hubs'
import {
  SEO_KEYWORDS,
  type SeoKeyword,
  type SeoConfig,
  type SeoFacts,
  type SeoSnapshot,
  DEFAULT_RANK,
} from '@/lib/seoKeywords'
import { getPublishedWed100Items } from '@/lib/wed100'

/** 순위(사람이 적는 값)가 사는 곳 — 예전부터 여기 있었다 */
export const SEO_CONFIG_DOC = { collection: 'site_config', doc: 'seo' }

/**
 * 목표 검색어 목록이 사는 곳.
 *
 * 순위와 한 문서에 넣지 않았다. 목록은 가끔 통째로 갈아 끼우고 순위는 자주 조금씩
 * 고치는데, 한 문서에 두면 목록을 저장할 때 순위를, 순위를 저장할 때 목록을
 * 실수로 덮어쓸 길이 생긴다. 바뀌는 리듬이 다른 것은 따로 둔다.
 */
export const SEO_KEYWORDS_DOC = { collection: 'site_config', doc: 'seo-keywords' }

/**
 * 목표 검색어 목록 — Firestore 우선, 코드 배열은 시드 폴백.
 *
 * 전에는 목록이 코드에만 있어서 검색어 하나를 더하려면 배포를 해야 했다. 노릴 말을
 * 정하는 것은 코드를 고치는 일이 아니라 장사 판단이라, 그때마다 개발자를 거치게
 * 되면 목록이 안 바뀌고 결국 안 쓰이는 표가 된다.
 *
 * 폴백 규칙은 이 저장소의 다른 데이터와 같다(wed100 이 표준 구현) — 저장된 것이
 * 없거나 읽다 실패하면 시드를 쓴다. 검색어 목표는 어드민 화면 하나가 통째로
 * 여기에 달려 있어서, 빈 목록을 돌려주면 화면이 "목표가 없다" 로 보인다.
 * 그건 사실이 아니라 장애다.
 */
export async function getSeoKeywords(): Promise<SeoKeyword[]> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb
        .collection(SEO_KEYWORDS_DOC.collection)
        .doc(SEO_KEYWORDS_DOC.doc)
        .get()
      const rows = snap.exists ? (snap.data()?.items as SeoKeyword[] | undefined) : undefined
      if (Array.isArray(rows) && rows.length) return rows
    }
  } catch (e) {
    console.error('[seo] 목표 검색어를 읽지 못해 시드로 폴백합니다 —', e)
  }
  return SEO_KEYWORDS
}

/**
 * 사이트를 읽어 검색어별 사실을 모은다 (서버 전용).
 *
 * 밖에 나가서 재지 않는다. 우리가 쓴 것만 센다 — 어느 페이지가 제목에 이 말을
 * 갖고 있는지, 본문이 얼마나 되는지, 뒷받침하는 문항이 몇 개인지.
 * 순위처럼 밖에서 재야 아는 값은 사람이 적어 넣는다.
 */
const strip = (s: string) => s.replace(/\s+/g, '')

export async function collectSeoFacts(
  keywords: SeoKeyword[] = SEO_KEYWORDS,
): Promise<Record<string, SeoFacts>> {
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
  for (const t of keywords) {
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
export async function getSeoConfig(keywords: SeoKeyword[] = SEO_KEYWORDS): Promise<SeoConfig> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection(SEO_CONFIG_DOC.collection).doc(SEO_CONFIG_DOC.doc).get()
      if (snap.exists) {
        const d = snap.data() as Partial<SeoConfig>
        const ranks: SeoConfig['ranks'] = {}
        for (const t of keywords) {
          ranks[t.term] = { ...DEFAULT_RANK, ...(d.ranks?.[t.term] ?? {}) }
        }
        return { ranks, updatedAt: d.updatedAt }
      }
    }
  } catch {
    /* 설정이 없어도 화면은 떠야 한다 */
  }
  const ranks: SeoConfig['ranks'] = {}
  for (const t of keywords) ranks[t.term] = { ...DEFAULT_RANK }
  return { ranks }
}

/**
 * 준비도 기록 읽기.
 *
 * 어드민을 안 연 날은 기록이 없다. 없는 날을 앞뒤 값으로 메우지 않는다 —
 * 그러면 실제로 잰 날과 지어낸 날을 구분할 수 없게 되고, 그래프가 매끄러워 보이는
 * 만큼 덜 정직해진다.
 *
 * 문서 이름 **내림차순**으로 읽고 있었다. Firestore 가 저절로 갖고 있는 것은
 * 오름차순뿐이라 내림차순은 색인을 따로 요구한다(FAILED_PRECONDITION).
 * `limitToLast` 도 같다 — 정렬을 뒤집어 실행하는 방식이라 속으로는 내림차순이다.
 *
 * 그런데 이 함수는 통째로 try/catch 안이라 그 오류가 밖으로 나오지 않고 빈 배열이
 * 됐다 — 기록이 아직 없는 것과 질의가 막힌 것이 화면에서 똑같아 보였다. 폴백은
 * 장애 때 화면이 비지 않게 하려는 것이지 고장을 감추라는 것이 아니다.
 *
 * 정렬은 자바스크립트가 한다. 문서 이름이 YYYY-MM-DD 라 글자 순서가 곧 날짜
 * 순서고, 하루에 한 건이라 몇 해가 쌓여도 통째로 읽을 만하다.
 */
export async function getSeoHistory(limit = 60): Promise<SeoSnapshot[]> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const db = await getAdminDb()
    if (!db) return []
    const snap = await db.collection('seo_snapshots').get()
    return snap.docs
      .map((d) => d.data() as SeoSnapshot)
      .filter((x) => x?.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-limit)
  } catch (e) {
    console.error('[seo] 준비도 기록을 읽지 못했습니다 —', e)
    return []
  }
}
