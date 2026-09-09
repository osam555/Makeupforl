import siteImages from '@/data/site-images.json'

type Asset = { id: string; url: string; alt: string }

/**
 * 옛 서버에만 있던 주소.
 *
 * 도메인을 새 사이트로 옮기면서 makeupforl.co.kr/uploaded/ 아래 파일은 전부
 * 사라졌다. 그런데 시드에는 그 주소가 그대로 남아 있어, "이미지가 있다" 고
 * 판단되고 폴백이 작동하지 않았다. 결과는 404 — 배너 자리에 빈 띠만 남는다.
 * CSS 배경으로 깔린 자리라 깨진 그림 표시조차 안 떠서 눈에 잘 띄지 않았다.
 *
 * 없는 것은 없다고 해야 폴백이 제 일을 한다.
 */
const isDeadLegacy = (url: string) => /makeupforl\.co\.kr\/uploaded\//.test(url)

const ASSETS = (siteImages as { assets: Asset[] }).assets.map((a) =>
  isDeadLegacy(a.url) ? { ...a, url: '' } : a,
)

/** 원본 주소 (Storage 이전 전 폴백) */
export function sourceImage(id: string): string {
  return ASSETS.find((x) => x.id === id)?.url ?? ''
}

export function siteImageAlt(id: string): string {
  return ASSETS.find((x) => x.id === id)?.alt ?? ''
}

/**
 * 사이트 UI 이미지 URL 맵.
 * Firestore `site_images` 에 이전된 Storage 사본을 우선 사용하고,
 * 아직 없거나 조회에 실패하면 원본 홈페이지 주소로 폴백한다.
 * (서버 컴포넌트에서 호출)
 */
export async function getSiteImages(): Promise<Record<string, string>> {
  const map: Record<string, string> = {}
  for (const a of ASSETS) if (a.url) map[a.id] = a.url

  // 서버(Admin SDK)로 읽으면 보안 규칙과 무관하게 조회된다
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection('site_images').get()
      snap.docs.forEach((d) => {
        const u = (d.data() as { url?: string }).url
        if (u && !isDeadLegacy(u)) map[d.id] = u
      })
      return map
    }
  } catch {
    /* 클라이언트 SDK 로 재시도 */
  }

  try {
    const { getDb } = await import('@/lib/firebase/client')
    const db = getDb()
    if (db) {
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'site_images'))
      snap.docs.forEach((d) => {
        const u = (d.data() as { url?: string }).url
        if (u) map[d.id] = u
      })
    }
  } catch {
    /* 원본 주소 폴백 */
  }
  return map
}
