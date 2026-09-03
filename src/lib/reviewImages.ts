import reviewsSeed from '@/data/reviews.json'

export type ReviewItem = { id: string; title: string; date: string; url: string }

const SEED = (reviewsSeed as { items: ReviewItem[] }).items

/**
 * 고객후기 사진. Firestore `reviews` 에 옮겨진 Storage 사본을 우선 쓰고,
 * 없으면 시드(원본 홈페이지 주소)로 떨어진다. siteImages 와 같은 방식이다.
 *
 * 고객후기 페이지는 브라우저에서 이 컬렉션을 읽어 이미 옮겨진 사진을 쓰는데,
 * 홈의 후기 슬라이드만 시드를 그대로 넘겨 옛 서버 makeupforl.co.kr 주소로
 * 불러오고 있었다. 도메인을 새 사이트로 옮기면 그 사진들이 깨진다.
 * (서버 컴포넌트에서 호출)
 */
export async function getReviews(limit = 10): Promise<ReviewItem[]> {
  const byId = new Map(SEED.map((r) => [r.id, { ...r }]))

  const apply = (id: string, url?: string, published?: boolean) => {
    const cur = byId.get(id)
    if (!cur) return
    if (published === false) byId.delete(id)
    else if (url) cur.url = url
  }

  const readAdmin = async () => {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (!adb) return false
    const snap = await adb.collection('reviews').get()
    snap.docs.forEach((d) => {
      const v = d.data() as { imageUrl?: string; url?: string; published?: boolean }
      apply(d.id, v.imageUrl ?? v.url, v.published)
    })
    return true
  }

  try {
    if (await readAdmin()) return [...byId.values()].slice(0, limit)
  } catch {
    /* 클라이언트 SDK 로 재시도 */
  }

  try {
    const { getDb } = await import('@/lib/firebase/client')
    const db = getDb()
    if (db) {
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'reviews'))
      snap.docs.forEach((d) => {
        const v = d.data() as { imageUrl?: string; url?: string; published?: boolean }
        apply(d.id, v.imageUrl ?? v.url, v.published)
      })
    }
  } catch {
    /* 원본 주소 폴백 */
  }

  return [...byId.values()].slice(0, limit)
}
