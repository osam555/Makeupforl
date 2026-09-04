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

const DEFAULTS: Wed100Access = {
  paywall: false,
  freeQna: [],
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
