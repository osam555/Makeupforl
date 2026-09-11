import links from '@/data/internal-links.json'
import { HUBS } from '@/lib/hubs'
import {
  SEO_KEYWORDS,
  type SeoKeyword,
  type SeoConfig,
  type SeoFacts,
  type SeoSnapshot,
  type SeoTodo,
  DEFAULT_RANK,
} from '@/lib/seoKeywords'
import { getPublishedWed100Items } from '@/lib/wed100'
import { isOpen } from '@/lib/wed100Access'
import { getWed100Access } from '@/lib/wed100Access.server'

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

/** 내부 링크를 언제 셌나 — 스크립트가 안 돌면 이 날짜가 낡아서 티가 난다 */
export const LINKS_COUNTED_AT: string = (links as { countedAt: string }).countedAt

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
  const [items, access] = await Promise.all([getPublishedWed100Items(), getWed100Access()])

  // 허브는 제목과 본문 길이를 코드에서 바로 알 수 있다
  const pages = HUBS.map((h) => ({
    path: `/${h.slug}`,
    title: h.title,
    chars:
      h.lead.length +
      h.intro.join('').length +
      h.sections.reduce((a, s) => a + s.h.length + s.body.join('').length, 0),
  }))

  /*
    허브 밖에서 같은 말을 제목에 가진 페이지 — 잠식을 보려면 이쪽도 세어야 한다.

    다섯 개만 적어 두었다가 열여덟 개로 늘렸다. 목록이 코드에 박혀 있을 때는
    다섯이면 됐다 — 노리는 말이 다섯 개로 고정이었고 그 말들이 어디에 있는지
    사람이 알았기 때문이다. 어드민에서 아무 말이나 더할 수 있게 되면서 그 전제가
    깨졌다. 새 검색어가 /brand 나 /gallery/hair-styling 의 제목과 부딪혀도
    화면에는 "다투는 페이지 없음" 으로 나온다.

    2026-09-11 에 운영 페이지에서 그대로 떠 온 제목이다. **페이지 제목을 고치면
    여기도 고쳐야 한다** — 어긋나면 잠식을 못 보거나 없는 잠식을 만든다.
    (제목을 한 곳에서만 정하게 고치는 편이 옳지만, 그건 metadata 전반을 손대는
    일이라 여기서는 범위를 넓히는 데까지만 한다)
  */
  const others = [
    { path: '/', title: '메이크업포엘 | 강남 논현동 혼주 전문 메이크업샵' },
    { path: '/honjoo100', title: '혼주메이크업 100문 100답 | 메이크업포엘' },
    { path: '/brand', title: '브랜드소개 | 메이크업포엘' },
    { path: '/services', title: '혼주 샵 메이크업과 출장 메이크업 | 메이크업포엘' },
    { path: '/consultation', title: '1:1 사전컨설팅 | 메이크업포엘' },
    { path: '/reservation', title: '예약안내 | 메이크업포엘' },
    { path: '/reviews', title: '고객후기 — 혼주님이 보내주신 문자 | 메이크업포엘' },
    { path: '/videos', title: '유튜브 채널 | 메이크업포엘' },
    { path: '/gallery', title: '갤러리 | 메이크업포엘' },
    { path: '/gallery/honju', title: '혼주 헤어·메이크업 사진 | 메이크업포엘' },
    { path: '/gallery/family-guest', title: '가족 · 하객 사진 | 메이크업포엘' },
    { path: '/gallery/wedding', title: '웨딩 (신부) 사진 | 메이크업포엘' },
    { path: '/gallery/hair-styling', title: '헤어 스타일링 사진 | 메이크업포엘' },
    { path: '/gallery/men-makeup', title: '남자 메이크업 사진 | 메이크업포엘' },
    { path: '/gallery/corporate-video', title: '기업행사 · 영상 사진 | 메이크업포엘' },
    { path: '/gallery/photoshoot-profile', title: '화보 · 프로필 사진 | 메이크업포엘' },
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
      openQuestions: items.filter((x) => strip(x.question).includes(key) && isOpen(access, x.slug))
        .length,
      /*
        내부 링크는 이제 실측이다.

        전에는 허브면 무조건 4였다. 실제로 세어 보니 /혼주한복 2, /혼주머리 2,
        /혼주메이크업 6 으로 셋 다 틀렸고, 덕분에 "본문에서 3곳 이상 링크를
        거세요" 라는 할 일이 한 번도 뜬 적이 없었다.

        서버 런타임에서는 src 를 읽을 수 없어서, 빌드 전에 스크립트가 세어 둔
        JSON 을 가져다 쓴다(scripts/count-internal-links.py). 메뉴는 빼고 본문만
        센 값이다 — 한 번 걸면 모든 페이지에 실리는 링크를 본문 링크와 같은
        무게로 볼 수 없다.
      */
      inboundLinks: (links.links as Record<string, number>)[t.owner] ?? 0,
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
        /*
          문자열이 아니면 버린다.

          이 값은 서버에서 읽어 화면 컴포넌트로 넘어간다. Firestore 타임스탬프처럼
          클래스 인스턴스가 들어 있으면 Next 가 직렬화하지 못해 **화면 전체가 죽는다** —
          순위를 스크립트로 넣다가 serverTimestamp() 를 써서 실제로 그렇게 만들었다.
          날짜 하나 때문에 키워드 화면이 통째로 안 뜨는 것은 어느 쪽으로 봐도 손해라,
          모양이 아니면 없는 셈 친다.
        */
        const updatedAt = typeof d.updatedAt === 'string' ? d.updatedAt : undefined
        return { ranks, updatedAt }
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

/** 할 일 목록이 사는 곳. 순위·검색어 목록과 같은 이유로 문서를 따로 둔다 */
export const SEO_TODOS_DOC = { collection: 'site_config', doc: 'seo-todos' }

/**
 * SEO 할 일 읽기. 시드 폴백이 없다 — 손님 화면에 그리지 않는 관리 데이터라
 * 결재함과 같은 규칙이다. 못 읽으면 null 을 돌려주고 화면이 왜 안 되는지 말한다.
 */
export async function getSeoTodos(): Promise<SeoTodo[] | null> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (!adb) return null
    const snap = await adb.collection(SEO_TODOS_DOC.collection).doc(SEO_TODOS_DOC.doc).get()
    const items = snap.exists ? (snap.data()?.items as SeoTodo[] | undefined) : undefined
    return Array.isArray(items) ? items : []
  } catch (e) {
    console.error('[seo] 할 일을 읽지 못했습니다 —', e)
    return null
  }
}
