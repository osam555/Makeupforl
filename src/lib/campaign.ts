/**
 * 캠페인 꼬리표(`?from=yt-shorts-01`) — 화면과 서버가 함께 보는 순수 함수.
 *
 * 왜 따로 다나: 쇼츠·광고 링크는 대부분 유튜브·인스타 앱, 카톡·문자 안에서 눌린다.
 * 인앱 브라우저가 referrer 를 안 붙여 전부 「직접 방문」에 섞이고, 상담 신청은 늘
 * `honjoo100-chat` 이라 어느 쇼츠·광고가 신청과 예약을 냈는지 알 수 없었다.
 * 1월부터 소액 광고를 「신청 1건당·예약 1건당 비용」으로 판단하기로 해서 이 둘이 이어져야 한다.
 *
 * 꼬리표는 **우리가 지어 링크에 붙인 캠페인 이름 하나**라 사람을 식별하지 않는다. 그래서 받는
 * 글자를 영소문자·숫자·하이픈 40자로 묶는다 — 이메일·이름·한글 문장 같은 것이 주소에 실려
 * 와도 통계 문서와 상담 신청에 남지 않게. 숫자만 이어 붙인 값은 막지 못하지만, 그건 우리가
 * 만든 링크가 아니라 누가 손으로 고친 주소이고 함께 남는 다른 값이 없어 사람과 이어지지 않는다.
 */
const FROM = /^[a-z0-9-]{1,40}$/

/** 허용하지 않는 값은 고치지 않고 버린다 — 고쳐 쓰면 다른 캠페인과 섞일 수 있다 */
export function cleanFrom(v: unknown): string | null {
  return typeof v === 'string' && FROM.test(v) ? v : null
}

/**
 * 방문 기록의 출처 열쇠. referrer 출처(`naver-m`·`direct` …)와 한 칸(sources)에 같이 쌓되
 * 앞에 `from:` 을 붙여 가른다. 따로 맵을 두면 출처 합계가 방문 수와 안 맞게 된다 —
 * 꼬리표가 있는 방문은 referrer 출처로 세지 않고 꼬리표로만 센다.
 */
export const SOURCE_PREFIX = 'from:'
export const campaignSourceKey = (c: string) => `${SOURCE_PREFIX}${c}`
export const campaignOfSource = (k: string) => (k.startsWith(SOURCE_PREFIX) ? k.slice(SOURCE_PREFIX.length) : null)

/** 상담 신청의 source. 꼬리표가 없으면 예전 값 그대로 — 이미 쌓인 접수와 같은 이름이어야 한다 */
export const LEAD_SOURCE = 'honjoo100-chat'
export const leadSource = (c: string | null) => (c ? `${LEAD_SOURCE}:${c}` : LEAD_SOURCE)
export function campaignOfLead(source: string): string | null {
  const p = `${LEAD_SOURCE}:`
  return source.startsWith(p) ? cleanFrom(source.slice(p.length)) : null
}

/**
 * 탭 세션 동안 **첫 랜딩의 꼬리표**를 붙들어 둔다.
 *
 * 쇼츠에서 들어와 다른 쪽을 둘러본 뒤 설문을 내면 그때 주소에는 from 이 없다. 첫 랜딩 것을
 * 쥐고 있어야 신청이 쇼츠로 돌아간다. sessionStorage 라 탭을 닫으면 사라진다 — 방문 기록의
 * 세션 구분(`mfl:sid`)과 같은 수명이고, 쿠키처럼 다음 방문까지 따라가지 않는다.
 * 세션 중간에 다른 꼬리표 링크로 다시 들어와도 덮지 않는다 — 처음 데려온 쪽의 공으로 센다.
 */
const KEY = 'mfl:from'

export function rememberFrom(search: string): string | null {
  try {
    const kept = cleanFrom(sessionStorage.getItem(KEY))
    if (kept) return kept
    const c = cleanFrom(new URLSearchParams(search).get('from'))
    if (c) sessionStorage.setItem(KEY, c)
    return c
  } catch {
    // 저장이 막힌 브라우저 — 이번 쪽 주소의 것만 쓴다
    return cleanFrom(new URLSearchParams(search).get('from'))
  }
}

export function readFrom(): string | null {
  try {
    return cleanFrom(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}

export interface CampaignRow {
  campaign: string
  /** 그 꼬리표로 들어온 첫 방문 수 */
  arrivals: number
  leads: number
  booked: number
}

/**
 * 캠페인별 도착·신청·예약함.
 *
 * 순서는 예약 → 신청 → 도착. 광고를 끄고 켜는 기준이 「예약 1건당 비용」이라 그 숫자가 먼저다.
 * 도착만 많고 신청이 없는 쇼츠는 아래로 간다 — 조회수 좋은 영상이 늘 돈 되는 영상은 아니다.
 */
export function campaignRows(
  sources: Record<string, number>,
  leads: { source?: string; status: string }[],
): CampaignRow[] {
  const m = new Map<string, CampaignRow>()
  const row = (c: string) =>
    m.get(c) ?? m.set(c, { campaign: c, arrivals: 0, leads: 0, booked: 0 }).get(c)!
  for (const [k, n] of Object.entries(sources)) {
    const c = campaignOfSource(k)
    if (c) row(c).arrivals += n
  }
  for (const l of leads) {
    const c = campaignOfLead(l.source ?? '')
    if (!c) continue
    const r = row(c)
    r.leads += 1
    if (l.status === 'booked') r.booked += 1
  }
  return [...m.values()].sort(
    (a, b) => b.booked - a.booked || b.leads - a.leads || b.arrivals - a.arrivals || a.campaign.localeCompare(b.campaign),
  )
}
