import { HOME_HERO_QNA_SLUGS, HOME_QNA_SLUGS } from '@/lib/brandPoints'

export const HOME_CONFIG_DOC = { collection: 'site_config', doc: 'home' }

/** 히어로 슬라이드에 넣을 수 있는 최대 개수 — 너무 많으면 한 바퀴 도는 데 오래 걸린다 */
export const HERO_QNA_MAX = 8

export interface HomeConfig {
  /** 히어로 좌측 카드에서 회전할 문항 */
  heroQna: string[]
  /** 아래 100문100답 섹션에 펼쳐 둘 문항 */
  sectionQna: string[]
}

const FALLBACK: HomeConfig = {
  heroQna: HOME_HERO_QNA_SLUGS,
  sectionQna: HOME_QNA_SLUGS,
}

const clean = (v: unknown, fallback: string[]) => {
  if (!Array.isArray(v)) return fallback
  const out = v.map((x) => String(x ?? '').trim()).filter((x) => /^[a-z0-9-]{2,40}$/.test(x))
  return out.length > 0 ? out : fallback
}

/**
 * 홈에 노출할 문항 설정.
 *
 * 어느 문항을 앞에 세울지는 계절과 상담 흐름에 따라 바뀐다. 코드에 박아 두면
 * 그때마다 배포해야 해서 Firestore 에 둔다. 설정이 없거나 읽지 못하면
 * 코드의 기본값을 쓰므로 홈이 비는 일은 없다.
 *
 * (서버 컴포넌트에서 호출)
 */
export async function getHomeConfig(): Promise<HomeConfig> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection(HOME_CONFIG_DOC.collection).doc(HOME_CONFIG_DOC.doc).get()
      if (snap.exists) {
        const d = snap.data() as Partial<HomeConfig>
        return {
          heroQna: clean(d.heroQna, FALLBACK.heroQna),
          sectionQna: clean(d.sectionQna, FALLBACK.sectionQna),
        }
      }
    }
  } catch {
    /* 설정을 못 읽어도 홈은 떠야 한다 */
  }
  return FALLBACK
}
