import gallerySeed from '@/data/gallery.json'

export type GalleryItem = {
  id: string
  url: string
  alt_text: string
  category: string
  order_position?: number
}

const SEED = gallerySeed as GalleryItem[]

/**
 * 갤러리 사진 목록. Firestore `gallery_images` 에 옮겨진 Storage 사본을 우선 쓰고,
 * 없으면 시드(원본 홈페이지 주소)로 떨어진다. siteImages 와 같은 방식이다.
 *
 * 홈의 GALLERY 섹션이 이걸 쓰지 않고 시드를 그대로 넘겨서, 옛 서버
 * makeupforl.co.kr 주소로 사진을 불러오고 있었다. 도메인을 새 사이트로 옮기면
 * 그 주소가 더 이상 옛 서버를 가리키지 않아 홈 사진이 깨진다.
 * (서버 컴포넌트에서 호출)
 */
export async function getGalleryImages(): Promise<GalleryItem[]> {
  const byId = new Map(SEED.map((g) => [g.id, { ...g }]))

  const apply = (id: string, url?: string) => {
    if (!url) return
    const cur = byId.get(id)
    if (cur) cur.url = url
  }

  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection('gallery_images').get()
      snap.docs.forEach((d) => apply(d.id, (d.data() as { url?: string }).url))
      return [...byId.values()]
    }
  } catch {
    /* 클라이언트 SDK 로 재시도 */
  }

  try {
    const { getDb } = await import('@/lib/firebase/client')
    const db = getDb()
    if (db) {
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'gallery_images'))
      snap.docs.forEach((d) => apply(d.id, (d.data() as { url?: string }).url))
    }
  } catch {
    /* 원본 주소 폴백 */
  }

  return [...byId.values()]
}
