export const WED100_CONFIG_DOC = { collection: 'site_config', doc: 'wed100' }

export interface Wed100Access {
  /** 켜면 무료 문항 외에는 본문·음성을 잠근다 */
  paywall: boolean
  /** 무료로 여는 문항 slug */
  freeQna: string[]
  /** 구매 안내가 가리킬 곳 (스마트스토어 등). 비면 전화·카톡 안내만 보인다 */
  storeUrl: string
  /** 잠긴 문항에 보여 줄 안내 문구 */
  notice: string
  /**
   * 전체 열람이 허용된 구글 계정과 각자의 기한.
   *
   * 값을 산 사람의 이메일을 원장이 관리자 화면에서 넣는다. 소문자로 맞춰
   * 저장한다 — 구글은 대소문자를 가리지 않는데 목록만 가리면 억울한 차단이 난다.
   * until 은 YYYY-MM-DD, 그날까지 열린다. 비어 있으면 기한 없음(관리자용).
   */
  members: Wed100Member[]
}

export interface Wed100Member {
  email: string
  /** 이 날짜까지 열린다 (포함). null 이면 기한 없음 */
  until: string | null
}

/** 구매 후 열람 기간 */
export const MEMBER_MONTHS = 3

/** 오늘 (한국 시각). 서버가 어디서 돌든 기준이 흔들리면 안 된다 */
export function todayKST(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** 오늘부터 MEMBER_MONTHS 개월 뒤 (YYYY-MM-DD) */
export function defaultUntil(from = todayKST()): string {
  const [y, m, d] = from.split('-').map(Number)
  // Date 는 달을 넘길 때 자동으로 넘겨 준다 — 11/30 + 3개월 = 다음 해 2/28 같은 경우도 알아서 맞는다
  const t = new Date(Date.UTC(y, m - 1 + MEMBER_MONTHS, d))
  return t.toISOString().slice(0, 10)
}

/**
 * 값을 내지 않아도 볼 수 있는 문항.
 *
 * 실제로 쓰이는 값은 Firestore 설정이다. 여기 적은 것은 설정이 없거나 읽히지
 * 않을 때의 기본값이자, "왜 이 다섯인가"를 저장소에 남겨 두는 기록이다.
 * 관리자 화면에서 바꿀 때도 이 기준으로 판단할 것.
 *
 * 고른 기준 두 가지.
 *
 * 1) 잠금이 켜지면 본문이 검색에 걸리는 문항은 이 다섯뿐이다. 그러니
 *    제목에 사람들이 실제로 치는 말이 들어 있어야 한다.
 *    (네이버 검색량 2026-09-08: 혼주한복 16,450 · 혼주머리 5,790 ·
 *     혼주메이크업 5,060 · 혼주올림머리 1,750)
 * 2) 맛보기가 자사 서비스 소개면 나머지 97개도 광고일 거라 짐작하게 된다.
 *    "우리 컨설팅이 왜 필요한가" 류는 넣지 않는다.
 *
 * 프롤로그와 에필로그는 파는 대상이 아니라 이 묶음이 무엇인지 알리는 글이라
 * 함께 연다. 나머지 다섯은 파트 1~5 에 하나씩이다.
 */
export const FREE_QNA_DEFAULT = [
  'prologue', // 프롤로그 — 이 답들을 왜 만들었는지. 문 앞에서 읽는 글
  'epilogue', // 에필로그 — 끝맺음
  'p1-06', // '1:1 사전 컨설팅'은 왜 필수인가요? — 영업 문항
  'p4-07', // 둥근 얼굴형에 맞는 혼주 머리는? — '혼주머리'
  'p5-11', // 혼주 한복에 어울리는 안경테 선택법 — '혼주한복'
  /*
    2026-09-11 립스틱(p3-14)·시연 만족도(p2-05)와 바꿨다. 잠긴 문항은 검색에 제목과
    미리보기만 나가서, 목표 검색어를 본문까지 검색에 내보내는 것은 무료 문항뿐이다.
    무료 7개 중 검색어를 가진 것이 둘뿐이었다.
  */
  'p4-02', // 짧은 커트 머리도 혼주 올림머리가 가능한가요? — '혼주올림머리'
  'p4-25', // 혼주 헤어 컬러, 어떤 색이 세련돼 보여요? — '혼주헤어'
]

/**
 * 저장된 명단을 읽어 들인다.
 *
 * 기한을 붙이기 전에는 이메일 문자열만 담겨 있었다. 그때 넣어 둔 사람이
 * 갑자기 막히면 안 되므로, 문자열은 기한 없음으로 받아 준다.
 */
export function normalizeMembers(v: unknown): Wed100Member[] {
  if (!Array.isArray(v)) return []
  const out: Wed100Member[] = []
  for (const raw of v) {
    if (typeof raw === 'string') {
      const email = raw.trim().toLowerCase()
      if (email) out.push({ email, until: null })
      continue
    }
    if (raw && typeof raw === 'object') {
      const o = raw as { email?: unknown; until?: unknown }
      const email = String(o.email ?? '').trim().toLowerCase()
      if (!email) continue
      const until = typeof o.until === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.until) ? o.until : null
      out.push({ email, until })
    }
  }
  return out
}

export const DEFAULT_ACCESS: Wed100Access = {
  paywall: false,
  freeQna: FREE_QNA_DEFAULT,
  storeUrl: '',
  notice: '',
  members: [],
}

/**
 * 이 문항을 로그인 없이 다 볼 수 있는가.
 *
 * 여기서 회원 여부는 보지 않는다 — 이 값이 페이지를 정적으로 굽는 기준이라,
 * 사람마다 달라지면 102개를 미리 만들어 둘 수 없게 된다. 회원에게는 잠긴
 * 페이지를 그대로 내려보내고 본문만 따로 받아 채운다(/api/wed100/answer).
 */
export function isOpen(access: Wed100Access, slug: string): boolean {
  return !access.paywall || access.freeQna.includes(slug)
}

/**
 * 전체 열람 권한이 있는 계정인가.
 *
 * 기한이 지났으면 명단에 있어도 아니다. 지운 것과 지난 것은 다르게 다뤄야
 * 하므로(안내 문구가 달라진다) 목록에서 빼지는 않는다.
 */
export function findMember(access: Wed100Access, email?: string | null): Wed100Member | null {
  if (!email) return null
  const e = email.trim().toLowerCase()
  return access.members.find((m) => m.email === e) ?? null
}

export function isMember(access: Wed100Access, email?: string | null): boolean {
  const m = findMember(access, email)
  if (!m) return false
  return !m.until || m.until >= todayKST()
}
