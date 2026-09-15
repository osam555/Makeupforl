import raw from '@/data/columns.json'
import type { Column, ColumnData } from '@/types/column'

const seed = raw as unknown as ColumnData

export const columnsMeta = seed.meta

/** 슬러그 규칙 — URL·문서 ID 로 쓰므로 영/숫자와 하이픈만 허용한다 */
export const COLUMN_SLUG_RE = /^[a-z0-9-]{2,60}$/

function normalize(item: Column): Column {
  return {
    ...item,
    published: item.published ?? true,
  }
}

/** 최신 글이 위로 — 같은 날이면 슬러그로 안정 정렬 */
function byNewest(a: Column, b: Column): number {
  return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || a.slug.localeCompare(b.slug)
}

/**
 * CEO 칼럼 전체 조회.
 *
 * 100문100답(getWed100Items)과 같은 순서를 탄다: Firestore(columns 컬렉션)가
 * 세팅돼 있으면 그쪽을 우선 쓰고, 미설정·비어있음·오류 시 리포 시드 JSON 으로
 * 폴백한다. Firebase 프로젝트가 없어도 칼럼이 그대로 보인다.
 */
export async function getColumns(): Promise<Column[]> {
  // 1) 서버 — Admin SDK 로 먼저 (보안 규칙·클라이언트 상태와 무관)
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection('columns').get()
      if (!snap.empty) {
        return snap.docs.map((d) => normalize(d.data() as Column)).sort(byNewest)
      }
    }
  } catch {
    // Admin SDK 미설정 — 클라이언트 SDK 로 재시도
  }

  // 2) 클라이언트 SDK (브라우저 또는 서비스 계정 미설정 환경)
  try {
    const { getDb } = await import('@/lib/firebase/client')
    const db = getDb()
    if (db) {
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'columns'))
      if (!snap.empty) {
        return snap.docs.map((d) => normalize(d.data() as Column)).sort(byNewest)
      }
    }
  } catch {
    // Firebase 미설정/권한 오류 — 시드로 폴백
  }

  return seed.items.map(normalize).sort(byNewest)
}

export async function getColumn(slug: string): Promise<Column | null> {
  const items = await getColumns()
  return items.find((x) => x.slug === slug) ?? null
}

export async function getPublishedColumns(): Promise<Column[]> {
  const items = await getColumns()
  return items.filter((x) => x.published !== false)
}

/** 목록·상세에서 쓰는 발행일 표기 — "2026년 9월 15일" */
export function columnDateLabel(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}
