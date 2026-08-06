import siteImages from '@/data/site-images.json'

type Asset = { id: string; url: string; alt: string }
const ASSETS = (siteImages as { assets: Asset[] }).assets

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
  for (const a of ASSETS) map[a.id] = a.url

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
