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
}

/**
 * 무료로 여는 문항 다섯 개.
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
 * 파트 1·3·4·5·6 에 하나씩 두어 여섯 갈래마다 검색에 설 발판을 남긴다.
 */
export const FREE_QNA_DEFAULT = [
  'p1-09', // 혼주 메이크업 비용, 적정 가격은?           — 구매 직전 검색
  'p3-01', // 평소 화장을 안 하는데 진해 보이지 않을까요?  — 가장 흔한 첫 걱정
  'p4-01', // 한복에는 반드시 올림머리를 해야 하나요?      — 검색 가중 전 문항 1위
  'p5-09', // 저고리 색상이 치마보다 얼굴빛에 더 중요한 이유 — 읽으면 내 색이 궁금해진다
  'p6-01', // 예식 당일 샵에 갈 때 입는 옷은?             — 파트 6 의 유일한 발판
]

const DEFAULTS: Wed100Access = {
  paywall: false,
  freeQna: FREE_QNA_DEFAULT,
  storeUrl: '',
  notice: '',
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
        }
      }
    }
  } catch {
    /* 설정을 못 읽어도 문항은 떠야 한다 */
  }
  return DEFAULTS
}

/** 이 문항을 지금 다 볼 수 있는가 */
export function isOpen(access: Wed100Access, slug: string): boolean {
  return !access.paywall || access.freeQna.includes(slug)
}
