import { MEMBER_MONTHS, todayKST, type Wed100Member } from '@/lib/wed100Access'

/**
 * 100문100답 이용권 회원 — 원장이 어드민에서 한 명씩 등록한다.
 *
 * 이름·전화는 공개 읽기인 site_config/wed100 에 둘 수 없어(누구나 읽힌다)
 * 관리자만 읽는 wed100_members 컬렉션에 둔다. 문서 ID 는 소문자 이메일 —
 * 같은 사람을 다시 등록하면 새 줄이 아니라 기한 연장이 된다.
 */
export const MEMBERS_COLLECTION = 'wed100_members'

/**
 * 등록 화면의 기본 기간 — 손님 화면에 적힌 이용권 기간(MEMBER_MONTHS)과 같은 값을 쓴다.
 * 2026-10-31 6개월로 했다가 같은 날 3개월로 되돌렸다: 파는 것과 등록하는 것이 다르면 안 된다.
 * 날짜 칸에서 사람마다 고칠 수 있다.
 */
export const REGISTER_MONTHS = MEMBER_MONTHS

export interface Wed100MemberRecord extends Wed100Member {
  name: string
  phone: string
  createdAt: string
  updatedAt: string
}

/** from 부터 months 개월 뒤 (YYYY-MM-DD) */
export function addMonths(months: number, from = todayKST()): string {
  const [y, m, d] = from.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1 + months, d)).toISOString().slice(0, 10)
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^01[016789]-?\d{3,4}-?\d{4}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/** 등록 입력을 검사하고 저장 형태로 맞춘다. 틀리면 이유를 돌려준다 */
export function parseMemberInput(
  v: { name?: unknown; email?: unknown; phone?: unknown; until?: unknown },
): { ok: true; name: string; email: string; phone: string; until: string } | { ok: false; error: string } {
  const name = String(v.name ?? '').trim().slice(0, 40)
  const email = String(v.email ?? '').trim().toLowerCase()
  const phone = String(v.phone ?? '').replace(/\s/g, '')
  const until = String(v.until ?? '').trim()
  if (!name) return { ok: false, error: '이름을 적어 주세요.' }
  if (!EMAIL.test(email)) return { ok: false, error: '지메일 주소 형식이 아닙니다.' }
  if (phone && !PHONE.test(phone)) return { ok: false, error: '휴대전화 번호 형식이 아닙니다 (010-1234-5678).' }
  if (!DATE.test(until)) return { ok: false, error: '기한은 2027-04-30 형식이어야 합니다.' }
  return {
    ok: true,
    name,
    email,
    phone: phone ? phone.replace(/^(\d{3})-?(\d{3,4})-?(\d{4})$/, '$1-$2-$3') : '',
    until,
  }
}

/** 옛 명단(site_config)과 새 명단을 합친다. 같은 이메일이면 새 명단이 이긴다 */
export function mergeMembers(legacy: Wed100Member[], records: Wed100Member[]): Wed100Member[] {
  const map = new Map<string, Wed100Member>()
  for (const m of legacy) map.set(m.email, m)
  for (const m of records) map.set(m.email, { email: m.email, until: m.until })
  return [...map.values()]
}
