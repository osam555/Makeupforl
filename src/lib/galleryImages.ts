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
  /*
    Firestore 에 사진이 있으면 그 목록을 그대로 쓴다.

    전에는 시드를 바탕으로 놓고 Firestore 문서를 id 로 맞춰 주소만 갈아 끼웠다.
    그런데 두 쪽의 id 가 어긋나면 아무것도 안 바뀌고, 그 사실이 조용히 지나간다.
    실제로 그랬다 — 서버가 그린 화면에는 옛 서버 주소(/uploaded/…)가 그대로
    남아 사진 오백여 장이 전부 404 였다. 브라우저는 Firestore 를 따로 읽어
    제대로 보여 주고 있어서 눈으로는 멀쩡해 보였다.

    화면(GalleryGrid)이 하는 것과 같게 맞춘다. Firestore 에 사진이 있으면 그것을
    쓰고, 없거나 못 읽을 때만 시드로 떨어진다.
  */
  const bySeedId = new Map(SEED.map((g) => [g.id, g]))

  /*
    Firestore 문서를 바탕으로 삼되, 비어 있는 칸은 시드에서 메운다.

    Firestore 에는 주소만 있고 분야(category)가 없는 문서가 있을 수 있다. 그것을
    그대로 쓰면 분야별 페이지가 통째로 비어 버린다. 주소는 Firestore 가, 나머지는
    시드가 더 정확하다고 보고 그렇게 맞춘다.
  */
  const fromRows = (rows: { id: string; data: Record<string, unknown> }[]): GalleryItem[] =>
    rows
      .map(({ id, data }) => {
        const seed = bySeedId.get(id)
        return {
          id,
          url: String(data.url ?? data.imageUrl ?? seed?.url ?? ''),
          alt_text: String(data.alt_text ?? seed?.alt_text ?? ''),
          category: String(data.category ?? seed?.category ?? ''),
          order_position:
            typeof data.order_position === 'number' ? data.order_position : seed?.order_position,
        }
      })
      .filter((x) => x.url && x.category)
      .sort((a, b) => (a.order_position ?? 0) - (b.order_position ?? 0))

  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection('gallery_images').get()
      const rows = fromRows(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
      if (rows.length > 0) return rows
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
      const rows = fromRows(snap.docs.map((d) => ({ id: d.id, data: d.data() })))
      if (rows.length > 0) return rows
    }
  } catch {
    /* 시드로 폴백 */
  }

  return SEED.map((g) => ({ ...g }))
}
