import type { Role } from '@/lib/roles'

/**
 * 결재함 — 두 사람이 일을 주고받는 곳.
 *
 * 이 파일에는 타입과 순수 함수만 둔다. Firestore 를 만지는 쪽은
 * proposals.server.ts 다 (firebase-admin 을 화면 번들에 끌고 들어가면 빌드가 깨진다).
 *
 * 처음에는 한 방향이었다 — 매니저가 올리고 원장이 정한다. 그런데 무엇을 고쳐야
 * 하는지 아는 쪽은 대개 원장이다. 한 방향만 두면 원장이 시작하는 일은 카톡과
 * 전화로 와서 시스템 밖에 남는다. 결재는 기록되는데 요청은 안 되니, 나중에
 * "그때 그거 말했잖아" 가 어디에도 없다.
 *
 * 그래서 두 가지를 담는다.
 *
 *  - **요청**: 하고 싶은 말. 최종 문장이 없어도 된다. 올리면 상대편 앞으로 간다.
 *  - **제안**: 승인하는 순간 그대로 쓰일 최종 문장. 요청에서 나왔으면 서로 붙어 있다.
 *
 * 둘을 나눈 이유가 여기 있다. 원장에게 최종 문장을 쓰게 하면 요청 자체를 안 하시게
 * 된다. 다듬는 일은 매니저와 에이전트가 하고, 다듬은 결과가 결재로 돌아온다.
 *
 * 설계에서 가장 중요한 결정 하나 — **제안에는 바꿀 값이 통째로 들어 있다.**
 * "이 문항 제목을 좀 다듬읍시다" 같은 말이 아니라, 승인하는 순간 그대로 쓰이는
 * 최종 문장이 담긴다. 그래야 원장님이 승인 단추를 누르는 것과 결과가 같아진다.
 * 말로 합의한 뒤 매니저가 다시 옮겨 적으면, 옮겨 적는 사이에 달라진 것을
 * 아무도 못 본다.
 */

export type ItemType = 'request' | 'proposal'

export const TYPE_LABEL: Record<ItemType, string> = {
  request: '요청',
  proposal: '제안',
}

export type ProposalStatus = 'pending' | 'approved' | 'rejected'

/**
 * 무엇을 바꾸자는 제안인가. (요청에는 없다 — 무엇을 건드릴지가 아직 안 정해졌다)
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
export function canAutoApply(kind: ProposalKind | undefined): boolean {
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
  /** 없으면 제안 — 요청이 생기기 전에 쓰인 문서를 위한 기본값이다 */
  type?: ItemType
  createdAt: string
  createdBy: string
  /** 상대가 목록에서 읽을 한 줄 */
  title: string
  /** 제안이면 '왜 바꾸는가', 요청이면 하고 싶은 말 그 자체 */
  reason: string
  /** 요청이 향하는 쪽. 올린 사람의 반대편으로 저절로 정해진다 */
  toRole?: Role
  /** 이 제안이 나온 요청. 승인되면 그 요청도 함께 닫힌다 */
  fromRequest?: string
  /** 제안일 때만 */
  kind?: ProposalKind
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
  /** 승인 뒤 실제로 반영됐는가 (code 는 사람이 배포한 뒤 표시한다) */
  applied?: boolean
  /**
   * 반영한 뒤 Firestore 에서 **다시 읽은** 값.
   *
   * 쓴 값을 그대로 되돌려 주면 확인이 아니라 메아리다. 다시 읽어야 정말로 그
   * 문서에 그 문장이 들어갔는지 알 수 있다 — merge 규칙이나 필드 이름이 틀려서
   * 엉뚱한 칸에 들어가도 쓰기 자체는 성공으로 끝난다.
   */
  appliedValue?: string
  /** 반영하려다 실패했으면 그 이유. 승인은 됐는데 안 바뀐 상태를 숨기지 않는다 */
  applyError?: string
  /** 'code' 제안을 사람이 배포하고 표시한 시각 */
  deployedAt?: string
  deployedBy?: string
  /** 결재 결과를 제안자가 확인했는가 */
  ackedAt?: string
  ackedBy?: string
}

export const typeOf = (p: Proposal): ItemType => p.type ?? 'proposal'

/**
 * 상태 이름은 종류마다 다르다.
 *
 * 같은 'approved' 라도 제안에서는 "승인됨" 이고 요청에서는 "처리됨" 이다.
 * 요청을 결재하듯 승인/반려로 부르면, 원장이 요청을 올릴 때마다 심사받는 기분이 든다.
 */
export function statusLabel(p: Proposal): string {
  const req = typeOf(p) === 'request'
  if (p.status === 'pending') return req ? '처리 대기' : '결재 대기'
  if (p.status === 'approved') return req ? '처리됨' : '승인됨'
  return req ? '안 하기로' : '반려됨'
}

/** 새 제안을 만들 때 화면이 보내는 것 */
export interface ProposalDraft {
  type: ItemType
  title: string
  reason: string
  kind?: ProposalKind
  slug?: string
  field?: 'question' | 'answer'
  configPatch?: Record<string, unknown>
  changes?: ProposalChange[]
  fromRequest?: string
}

/**
 * 제안이 성립하는가.
 *
 * 화면과 서버가 같은 규칙을 봐야 해서 순수 함수로 둔다. 서버에서 반드시 다시
 * 부른다 — 화면의 검사는 안내이지 방어가 아니다.
 */
export function validateDraft(d: Partial<ProposalDraft>): string | null {
  if (!d.title?.trim()) return '한 줄 제목을 적어 주세요 — 상대가 목록에서 이것만 보고 고릅니다.'
  if (!d.reason?.trim()) {
    return d.type === 'request'
      ? '무엇이 필요하신지 적어 주세요.'
      : '왜 바꾸는지 적어 주세요. 사유 없는 제안은 결재가 아니라 통보입니다.'
  }

  /* 요청은 여기까지다. 문턱을 낮게 두는 것이 요청의 존재 이유다 */
  if (d.type === 'request') return null

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

/** 결재를 기다리는 제안 */
export function pendingOf(list: Proposal[]): Proposal[] {
  return list.filter((p) => typeOf(p) === 'proposal' && p.status === 'pending')
}

/**
 * 나에게 온 요청 중 아직 안 끝난 것.
 *
 * 내가 올린 요청은 세지 않는다. 내가 올린 것이 내 할 일 목록에 뜨면 그 숫자는
 * 영영 0 이 되지 않고, 0 이 안 되는 숫자는 아무도 안 보게 된다.
 */
export function inboxOf(list: Proposal[], role: Role | null): Proposal[] {
  if (!role) return []
  return list.filter((p) => typeOf(p) === 'request' && p.status === 'pending' && p.toRole === role)
}

/**
 * 결재는 끝났는데 올린 사람이 아직 확인하지 않은 것.
 *
 * 원장님이 승인하셔도 매니저가 모르면 결재는 절반만 끝난 것이다. 반려는 더하다 —
 * 왜 안 됐는지 모른 채 기다리게 된다. 확인 단추를 누르기 전까지 띠에 남긴다.
 */
export function unseenOf(list: Proposal[], me: string): Proposal[] {
  return list.filter((p) => p.status !== 'pending' && !p.ackedAt && p.createdBy === me)
}

/**
 * 사이트에서 눈으로 확인할 주소.
 *
 * 승인됐다는 표시를 믿는 것과 바뀐 문장을 직접 보는 것은 다르다. 문항은 주소가
 * 정해져 있으니 바로 열어 준다. 설정·본문은 어디를 봐야 하는지가 제안마다 달라
 * 링크를 만들지 않는다 — 아무 데나 걸어 두면 열어 보고도 확인이 안 된다.
 */
export function viewHref(p: Proposal): string | null {
  return typeOf(p) === 'proposal' && p.kind === 'wed100' && p.slug
    ? `/honjoo100/${p.slug}`
    : null
}

/** 반영된 값이 승인한 값과 같은가 (다르면 그 사이 누가 또 고친 것이다) */
export function appliedMatches(p: Proposal): boolean | null {
  if (!p.applied || p.appliedValue == null) return null
  return p.appliedValue.trim() === (p.changes[0]?.after ?? '').trim()
}
