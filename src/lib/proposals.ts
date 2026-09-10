/**
 * 결재 — 매니저가 안을 올리고 원장이 정한다.
 *
 * 이 파일에는 타입과 순수 함수만 둔다. Firestore 를 만지는 쪽은
 * proposals.server.ts 다 (firebase-admin 을 화면 번들에 끌고 들어가면 빌드가 깨진다).
 *
 * 설계에서 가장 중요한 결정 하나 — **제안에는 바꿀 값이 통째로 들어 있다.**
 * "이 문항 제목을 좀 다듬읍시다" 같은 말이 아니라, 승인하는 순간 그대로 쓰이는
 * 최종 문장이 담긴다. 그래야 원장님이 승인 단추를 누르는 것과 결과가 같아진다.
 * 말로 합의한 뒤 매니저가 다시 옮겨 적으면, 옮겨 적는 사이에 달라진 것을
 * 아무도 못 본다.
 */

export type ProposalStatus = 'pending' | 'approved' | 'rejected'

/**
 * 무엇을 바꾸자는 제안인가.
 *
 * 'wed100'·'config' 는 Firestore 에 있는 것이라 승인하면 그 자리에서 반영된다.
 * 'code' 는 허브 본문(hubs.ts)처럼 저장소에 있는 것이라 반영이 배포를 거쳐야 한다 —
 * 승인은 "올려도 좋다" 는 표시로 남고, 실제로 올리는 것은 매니저가 한다.
 * 반영되지 않는 승인을 반영된 척 보이게 하지 않는 것이 이 구분의 목적이다.
 */
export type ProposalKind = 'wed100' | 'config' | 'code'

export const KIND_LABEL: Record<ProposalKind, string> = {
  wed100: '100문100답 문항',
  config: '공개 설정',
  code: '사이트 본문 (배포 필요)',
}

/** 승인하면 시스템이 스스로 반영할 수 있는 종류인가 */
export function canAutoApply(kind: ProposalKind): boolean {
  return kind === 'wed100' || kind === 'config'
}

/**
 * 오가는 의견 한 마디.
 *
 * 결재가 늘 승인/반려로 끝나지는 않는다. "좋은데 이 낱말만 바꿉시다" 가 제일 흔하다.
 * 그때 반려해 버리면 매니저는 처음부터 다시 올려야 하고, 왜 반려됐는지는 제안 밖에
 * 남는다. 그래서 결정하지 않고 말만 남기는 길을 둔다 — 제안은 대기인 채로 있고
 * 의견이 그 밑에 쌓인다.
 */
export interface ProposalNote {
  at: string
  by: string
  text: string
  /** 결재하면서 남긴 말인가 (그냥 의견과 구분해 보여 준다) */
  decision?: Exclude<ProposalStatus, 'pending'>
}

/** 바뀌는 것 한 줄. 전/후를 나란히 보여 주려고 둘 다 문자열로 들고 있는다 */
export interface ProposalChange {
  /** 무엇이 바뀌는지 (예: '제목', '무료 문항 수') */
  label: string
  before: string
  after: string
}

export interface Proposal {
  id: string
  createdAt: string
  createdBy: string
  /** 원장님이 목록에서 읽을 한 줄 */
  title: string
  /** 왜 바꾸는가. 이게 없으면 결재가 아니라 통보다 */
  reason: string
  kind: ProposalKind
  /** kind==='wed100' 일 때 어느 문항인가 */
  slug?: string
  /** kind==='wed100' 일 때 어느 칸인가 */
  field?: 'question' | 'answer'
  /** kind==='config' 일 때 site_config/wed100 에 병합할 값 */
  configPatch?: Record<string, unknown>
  changes: ProposalChange[]
  status: ProposalStatus
  decidedAt?: string
  decidedBy?: string
  /** 오간 의견. 결재하며 남긴 말도 여기에 함께 쌓인다 */
  notes?: ProposalNote[]
  /** 승인 뒤 실제로 반영됐는가 (code 는 늘 false) */
  applied?: boolean
  /** 반영하려다 실패했으면 그 이유. 승인은 됐는데 안 바뀐 상태를 숨기지 않는다 */
  applyError?: string
}

export const STATUS_LABEL: Record<ProposalStatus, string> = {
  pending: '결재 대기',
  approved: '승인됨',
  rejected: '반려됨',
}

/** 새 제안을 만들 때 화면이 보내는 것 */
export interface ProposalDraft {
  title: string
  reason: string
  kind: ProposalKind
  slug?: string
  field?: 'question' | 'answer'
  configPatch?: Record<string, unknown>
  changes: ProposalChange[]
}

/**
 * 제안이 성립하는가.
 *
 * 화면과 서버가 같은 규칙을 봐야 해서 순수 함수로 둔다. 서버에서 반드시 다시
 * 부른다 — 화면의 검사는 안내이지 방어가 아니다.
 */
export function validateDraft(d: Partial<ProposalDraft>): string | null {
  if (!d.title?.trim()) return '제목을 적어 주세요 — 원장님이 목록에서 이것만 보고 고르십니다.'
  if (!d.reason?.trim()) return '왜 바꾸는지 적어 주세요. 사유 없는 제안은 결재가 아니라 통보입니다.'
  if (!d.kind) return '무엇을 바꾸는 제안인지 골라 주세요.'
  if (!d.changes?.length) return '바뀌는 내용이 없습니다.'
  for (const c of d.changes) {
    if (!c.after?.trim()) return `'${c.label}' 의 바꿀 내용이 비어 있습니다.`
    if (c.before === c.after) return `'${c.label}' 이 지금과 같습니다.`
  }
  if (d.kind === 'wed100' && !d.slug) return '어느 문항인지 골라 주세요.'
  if (d.kind === 'wed100' && !d.field) return '문항의 어느 칸을 바꾸는지 골라 주세요.'
  return null
}

/** 대기 중인 것만 (화면 여러 곳에서 센다) */
export function pendingOf(list: Proposal[]): Proposal[] {
  return list.filter((p) => p.status === 'pending')
}
