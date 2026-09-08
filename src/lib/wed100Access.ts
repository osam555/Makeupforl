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
   * 전체 열람이 허용된 구글 계정.
   *
   * 값을 산 사람의 이메일을 원장이 관리자 화면에서 넣는다. 소문자로 맞춰
   * 저장한다 — 구글은 대소문자를 가리지 않는데 목록만 가리면 억울한 차단이 난다.
   */
  members: string[]
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
  'p1-06', // '1:1 사전 컨설팅'은 왜 필수인가요?
  'p2-05', // 미리 헤어스타일링을 시연해 보는 안심 서비스의 만족도는?
  'p3-14', // 립스틱 색, 평소 사용하던 립스틱 가져가도 되나요?
  'p4-07', // 둥근 얼굴형에 맞는 헤어스타일은?
  'p5-11', // 한복에 어울리는 안경테 선택법
]

const DEFAULTS: Wed100Access = {
  paywall: false,
  freeQna: FREE_QNA_DEFAULT,
  storeUrl: '',
  notice: '',
  members: [],
}

/**
 * 100문100답 공개 범위.
 *
 * 유료 전환은 되돌릴 여지를 두고 켜고 끌 수 있어야 해서 Firestore 에 둔다.
 * 설정을 읽지 못하면 잠그지 않는다 — 장애 때 멀쩡한 문항까지 막히는 쪽이
 * 잠깐 더 열려 있는 쪽보다 손해가 크다.
 */
export async function getWed100Access(): Promise<Wed100Access> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection(WED100_CONFIG_DOC.collection).doc(WED100_CONFIG_DOC.doc).get()
      if (snap.exists) {
        const d = snap.data() as Partial<Wed100Access>
        return {
          paywall: d.paywall === true,
          freeQna: Array.isArray(d.freeQna) ? d.freeQna.map(String) : [],
          storeUrl: typeof d.storeUrl === 'string' ? d.storeUrl : '',
          notice: typeof d.notice === 'string' ? d.notice : '',
          members: Array.isArray(d.members)
            ? d.members.map((x) => String(x).trim().toLowerCase()).filter(Boolean)
            : [],
        }
      }
    }
  } catch {
    /* 설정을 못 읽어도 문항은 떠야 한다 */
  }
  return DEFAULTS
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

/** 전체 열람 권한이 있는 계정인가 */
export function isMember(access: Wed100Access, email?: string | null): boolean {
  if (!email) return false
  return access.members.includes(email.trim().toLowerCase())
}
