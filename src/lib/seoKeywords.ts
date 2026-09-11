import seed from '@/data/seo-keywords.json'

/**
 * 검색어 목표와 달성도.
 *
 * 순위는 밖에서 재야 아는 값이고, 매일 자동으로 가져올 방법도 마땅치 않다.
 * 그래서 두 가지를 나눈다.
 *
 *  - 우리가 아는 것: 이 말을 맡은 페이지가 있는가, 본문이 두꺼운가, 여러 페이지가
 *    같은 말을 다투고 있지는 않은가, 뒷받침하는 문항과 내부 링크가 있는가.
 *    이건 사이트를 읽어 그때그때 계산한다.
 *  - 밖에서 재야 아는 것: 네이버·구글에서 지금 몇 위인가. 이건 사람이 검색해 보고
 *    적는다. 적힌 날짜를 함께 남겨, 언제 잰 값인지 모르는 채로 믿지 않게 한다.
 *
 * 준비도(readiness)는 "우리가 할 수 있는 것을 얼마나 했는가" 다. 순위가 아니다.
 * 준비도가 100이어도 순위는 시간이 걸리고, 준비도가 낮으면 순위를 기대할 수 없다.
 */

export interface SeoKeyword {
  /** 사람들이 실제로 치는 말 */
  term: string
  /** 월간 검색량 (네이버 검색광고 키워드도구, 잰 날짜는 VOLUME_MEASURED_AT) */
  volume: number
  /** 이 말을 맡기로 한 페이지 */
  owner: string
  /** 왜 이 페이지가 맡는가 */
  why: string
  /**
   * 무엇부터 할 것인가. 1 높음 · 2 보통 · 3 낮음. 없으면 보통으로 본다.
   *
   * 검색량으로 대신할 수 없어서 따로 둔다. 검색량이 큰 말이 늘 먼저는 아니다 —
   * '혼주한복' 은 가장 크지만 아직 업체를 고르기 전 단계이고, '혼주메이크업' 은
   * 3위지만 맡길 곳을 찾는 사람이 치는 말이라 매출로 바로 이어진다. 경쟁이 센
   * 정도와 지금 준비도도 검색량과 따로 논다. 그 판단을 적어 두는 자리다.
   */
  priority?: SeoPriority
  /**
   * 이 검색어의 검색량을 잰 날. 없으면 VOLUME_MEASURED_AT 를 쓴다.
   *
   * 전에는 잰 날이 전역으로 하나뿐이었다. 목록이 코드에 박혀 있어 다 같은 날
   * 쟀기 때문이다. 어드민에서 아무 때나 검색어를 더할 수 있게 되면서 그게
   * 틀린 표시가 됐다 — 오늘 잰 값에 한 달 전 날짜가 붙는다.
   */
  measuredAt?: string
}

export type SeoPriority = 1 | 2 | 3

export const PRIORITY_LABEL: Record<SeoPriority, string> = {
  1: '높음',
  2: '보통',
  3: '낮음',
}

export const priorityOf = (t: SeoKeyword): SeoPriority => t.priority ?? 2

/** 이 검색어의 검색량을 언제 쟀나 */
export const measuredAtOf = (t: SeoKeyword): string => t.measuredAt || VOLUME_MEASURED_AT

/**
 * 높은 것부터, 같으면 검색량이 큰 것부터.
 *
 * 화면에 뜨는 순서가 곧 "무엇부터 할까" 의 답이 되게 한다. 전에는 배열에 적은
 * 순서 그대로였고 그게 우연히 검색량 내림차순이라, 검색량 말고 다른 이유로
 * 먼저 해야 하는 말을 앞으로 끌어올 방법이 없었다.
 */
export function sortKeywords(list: SeoKeyword[]): SeoKeyword[] {
  return [...list].sort((a, b) => priorityOf(a) - priorityOf(b) || b.volume - a.volume)
}

/** 검색량을 잰 날. 오래되면 다시 재야 한다 */
export const VOLUME_MEASURED_AT = '2026-09-08'

/**
 * 목표 검색어 — **시드**다.
 *
 * 이 목록은 어드민에서 고칠 수 있고 진짜 값은 Firestore(`site_config/seo-keywords`
 * 의 `items`)에 있다. 여기 있는 것은 Firebase 가 하나도 세팅되지 않았거나 아직
 * 한 번도 저장한 적이 없을 때 쓰이는 폴백이다 — 이 저장소의 다른 데이터와 같은
 * 규칙이다(wed100 이 표준 구현).
 *
 * 값은 `src/data/seo-keywords.json` 에 있다. 코드 안 배열이 아니라 JSON 으로 뺀 이유는
 * 되돌림 스크립트 때문이다 — 어드민에서 고친 것을 시드에 되돌려 넣으려면 무언가가
 * 이 목록을 다시 써야 하는데, TypeScript 배열을 글자로 고쳐 쓰는 것보다 JSON 을
 * 통째로 바꾸는 편이 훨씬 안전하다. wed100.json 과 같은 모양이다.
 *
 *   GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/sync-seo-keywords.py
 *
 * 이걸 안 돌리면 어드민에서 고친 목록과 여기가 어긋난 채로 남고, Firestore 가
 * 잠깐이라도 안 되는 순간 사이트는 옛 목록으로 조용히 되돌아간다.
 */
export const SEO_KEYWORDS = seed as SeoKeyword[]

/** 사람이 적어 넣는 값 */
export interface SeoRank {
  /** 네이버에서 본 순위. 못 찾았으면 null */
  naver: number | null
  /** 구글에서 본 순위 */
  google: number | null
  /** 언제 재 봤나 (YYYY-MM-DD) */
  checkedAt: string
  /** 목표 순위 */
  goal: number
  note: string
}

export interface SeoConfig {
  ranks: Record<string, SeoRank>
  updatedAt?: string
}

export const DEFAULT_RANK: SeoRank = {
  naver: null,
  google: null,
  checkedAt: '',
  goal: 10,
  note: '',
}

/** 사이트에서 읽어 계산하는 값 */
export interface SeoFacts {
  /** 이 말을 맡은 페이지의 본문 길이 */
  ownerChars: number
  /** 제목에 이 말이 든 페이지 (둘 이상이면 서로 다툰다) */
  titlePages: string[]
  /** 제목에 이 말이 든 100문100답 문항 수 */
  questions: number
  /**
   * 그중 무료로 열린 문항 수.
   *
   * 잠긴 문항은 크롤러에게 제목과 미리보기 한두 줄만 보여 준다. 그래서 제목에
   * 말을 넣어도 검색에는 거의 안 잡힌다(2026-09-11 실측: 문항 102개 중 구글 색인
   * 15개, 네이버 0개). 본문까지 검색에 나가는 것은 무료 문항뿐이라 따로 센다.
   */
  openQuestions: number
  /** 맡은 페이지로 들어오는 내부 링크 수 */
  inboundLinks: number
}

export interface Readiness {
  score: number
  /** 아직 못 채운 것 — 그대로 할 일 목록이 된다 */
  todo: string[]
}

/**
 * 준비도.
 *
 * 다섯 가지를 본다. 하나하나가 "이걸 안 하면 순위를 기대할 수 없다" 는 것들이다.
 * 점수를 올리려고 억지로 채우라는 뜻이 아니라, 빠진 것이 무엇인지 보이게 하는 표다.
 */
export function readiness(f: SeoFacts): Readiness {
  const todo: string[] = []
  let score = 0

  if (f.titlePages.length > 0) score += 30
  else todo.push('이 말을 제목에 가진 페이지가 없습니다 — 전용 페이지를 만드세요')

  /*
    본문 0자는 "짧다" 가 아니라 "그 페이지를 못 찾았다" 는 뜻이다.

    전에는 0일 때 점수도 안 주고 할 일도 안 띄웠다. 어드민에서 검색어를 더할 수
    있게 되면서 이게 실제 문제가 됐다 — owner 를 오타로 적거나 허브가 아닌 주소를
    적으면 준비도가 80에 갇히는데 화면은 왜인지 말하지 않는다. 침묵하는 감점이
    제일 나쁘다.
  */
  if (f.ownerChars >= 1500) score += 20
  else if (f.ownerChars > 0)
    todo.push(`맡은 페이지 본문이 ${f.ownerChars}자입니다 — 1,500자 이상으로 채우세요`)
  else
    todo.push(
      '맡은 페이지를 찾지 못했습니다 — 주소가 맞는지 확인하세요. 본문 길이를 잴 수 있는 것은 검색어 허브(/혼주한복 같은 한 칸짜리 주소)뿐입니다',
    )

  if (f.titlePages.length <= 1) score += 20
  else
    todo.push(
      `${f.titlePages.length}개 페이지가 제목에 이 말을 갖고 있습니다 (${f.titlePages.join(', ')}) — 하나만 남기고 나머지는 역할을 가르세요`,
    )

  /*
    뒷받침 문항은 셋 이상이되 **하나는 열려 있어야** 한다.

    전에는 제목에 든 개수만 봤다. 그랬더니 혼주올림머리·혼주헤어가 셋씩 채워
    만점인데 그 여섯 문항이 전부 잠겨 있어 검색엔진에는 하나도 안 보였다 —
    잣대는 찼는데 뒷받침은 0 인 상태를 잣대가 못 봤다.
  */
  if (f.questions >= 3 && f.openQuestions >= 1) score += 15
  else if (f.questions < 3)
    todo.push(`뒷받침하는 문항이 ${f.questions}개입니다 — 제목에 이 말이 든 문항을 3개 이상으로`)
  else
    todo.push(
      `제목에 이 말이 든 문항 ${f.questions}개가 전부 잠겨 있습니다 — 하나는 무료로 열어야 본문이 검색에 나갑니다`,
    )

  if (f.inboundLinks >= 3) score += 15
  else todo.push(`내부 링크가 ${f.inboundLinks}개입니다 — 다른 페이지에서 3곳 이상 걸어 주세요`)

  return { score, todo }
}

/** 순위가 적혀 있을 때의 달성도. 목표에 닿았으면 100 */
export function rankAchievement(r: SeoRank): number | null {
  const best = [r.naver, r.google].filter((x): x is number => typeof x === 'number')
  if (best.length === 0) return null
  const rank = Math.min(...best)
  if (rank <= r.goal) return 100
  // 목표의 열 배까지를 0~100 으로 편다. 100위 밖은 사실상 0이다
  const span = Math.max(1, r.goal * 10 - r.goal)
  return Math.max(0, Math.round((1 - (rank - r.goal) / span) * 100))
}

/** 잰 지 오래된 값인가 — 오래된 숫자를 지금 값처럼 보면 안 된다 */
export function isStale(checkedAt: string, days = 30): boolean {
  if (!checkedAt) return true
  const t = new Date(checkedAt).getTime()
  if (Number.isNaN(t)) return true
  return Date.now() - t > days * 86400_000
}

/**
 * 준비도를 재는 자의 판.
 *
 * 1 — 내부 링크를 허브면 무조건 4로 놓던 때(~2026-09-10)
 * 2 — 본문 링크를 실제로 세기 시작한 때(2026-09-11)
 * 3 — 뒷받침 문항에 "하나는 무료" 조건을 더한 때(2026-09-11 저녁~).
 *     혼주올림머리·혼주헤어가 이날 100 → 85 로 떨어지는데 사이트가 나빠진 게 아니다
 *
 * 기록에 함께 남긴다. 자를 바꾼 날 그래프가 꺾이는데, 그게 사이트가 나빠져서가
 * 아니라 자가 바뀌어서라는 것을 나중에 알 방법이 이것뿐이다. 판이 다른 값끼리
 * 견주면 "9월 11일에 무슨 일이 있었나" 를 영영 잘못 짚게 된다.
 */
export const READINESS_FORMULA = 3

/** 하루치 기록 — 그날의 준비도와 순위를 그대로 떠 둔다 */
export interface SeoSnapshot {
  /** YYYY-MM-DD (한국 시각) */
  date: string
  /** 그날 쓰인 자의 판. 없으면 1 (실측 전) */
  formula?: number
  /** 검색어별 준비도 */
  readiness: Record<string, number>
  /** 그날 적혀 있던 순위 (없으면 null) */
  naver: Record<string, number | null>
  google: Record<string, number | null>
}

/** 오늘 (한국 시각). 기록의 하루 경계를 서버 위치에 맡기지 않는다 */
export function todayKST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * 준비도를 올리는 방법.
 *
 * 빠진 항목을 그냥 늘어놓으면 무엇부터 할지 알 수 없다. 점수가 큰 것부터,
 * 그리고 "몇 점이 오르는지" 를 함께 보여 준다. 손이 덜 가는 것을 먼저 하는 게
 * 아니라 효과가 큰 것을 먼저 하는 게 맞다.
 */
export interface Upgrade {
  gain: number
  what: string
  how: string
}

export function upgrades(f: SeoFacts): Upgrade[] {
  const out: Upgrade[] = []

  if (f.titlePages.length === 0)
    out.push({
      gain: 30,
      what: '이 말을 맡을 페이지가 없습니다',
      how: '전용 페이지를 만들고 제목을 이 말로 시작하세요. 허브 세 장(/혼주한복·/혼주머리·/혼주메이크업)이 본보기입니다.',
    })

  if (f.titlePages.length > 1)
    out.push({
      gain: 20,
      what: `${f.titlePages.length}개 페이지가 같은 말을 다툽니다`,
      how: `${f.titlePages.join(', ')} 중 하나만 남기고 나머지 제목은 다른 말로 바꾸세요. 대신 그 페이지들에서 남긴 한 장으로 링크를 거세요 — 제목에서 빼기만 하면 그 힘이 사라집니다.`,
    })

  if (f.ownerChars === 0)
    out.push({
      gain: 20,
      what: '맡은 페이지를 찾지 못했습니다',
      how: '검색어 관리에서 이 말의 「맡은 페이지」 주소를 확인하세요. 본문 길이를 잴 수 있는 것은 검색어 허브(/혼주한복 처럼 한 칸짜리 주소)뿐입니다 — 다른 주소를 적으면 본문 점수를 영영 못 받습니다.',
    })
  else if (f.ownerChars < 1500)
    out.push({
      gain: 20,
      what: `맡은 페이지 본문이 ${f.ownerChars.toLocaleString()}자입니다`,
      how: '1,500자를 넘기세요. 말을 불리는 게 아니라, 그 페이지에 있어야 하는데 없는 것을 적는 편이 낫습니다 — 가격에 무엇이 포함되는지, 언제 정해야 하는지, 무엇을 미리 말해야 하는지.',
    })

  if (f.questions < 3)
    out.push({
      gain: 15,
      what: `뒷받침하는 문항이 ${f.questions}개입니다`,
      how: '100문100답에서 이 주제를 다루는 문항의 제목에 이 말을 넣으세요. 원고를 새로 쓸 필요 없이 제목만 고치면 됩니다.',
    })
  else if (f.openQuestions === 0)
    out.push({
      gain: 15,
      what: `제목에 이 말이 든 문항 ${f.questions}개가 전부 잠겨 있습니다`,
      how: '그중 하나를 무료 문항(site_config/wed100 의 freeQna)으로 여세요. 잠긴 문항은 제목과 미리보기만 검색에 나가서, 제목에 말을 넣어도 거의 안 잡힙니다. 무료 문항 수를 늘리기 싫으면 이 말이 없는 무료 문항과 바꾸세요.',
    })

  if (f.inboundLinks < 3)
    out.push({
      gain: 15,
      what: `내부 링크가 ${f.inboundLinks}개입니다`,
      how: '홈·후기·갤러리·서비스처럼 관련 있는 페이지에서 본문 안에 링크를 거세요. 메뉴에만 있는 것과 본문에서 걸리는 것은 무게가 다릅니다.',
    })

  return out.sort((a, b) => b.gain - a.gain)
}
