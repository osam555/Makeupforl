/** 클라이언트/서버 공용 — Firebase Admin 을 끌어오지 않는 순수 헬퍼 */
export type VideoCategory = 'featured' | 'recent' | 'popular'

export interface VideoItem {
  /** 문서 id (= 유튜브 영상 ID) */
  id: string
  youtubeId: string
  title: string
  /** 한 줄 설명 (선택) */
  summary?: string | null
  /** 업로드일 YYYY-MM-DD (선택) */
  publishedAt?: string | null
  category: VideoCategory
  order: number
  published: boolean
  /** 채널 RSS 에서 자동으로 가져온 항목인지 */
  auto?: boolean
}

export interface VideoChannel {
  url: string
  name: string
  handle?: string | null
  channelId?: string | null
}

export const videoCategories: { key: VideoCategory; name: string; desc: string }[] = [
  { key: 'featured', name: '대표 영상', desc: '처음이라면 이것부터' },
  { key: 'recent', name: '최신 영상', desc: '채널에 새로 올라온 영상' },
  { key: 'popular', name: '인기 영상', desc: '혼주님들이 많이 보신 영상' },
]

/** 유튜브 URL / 공유링크 / ID 어느 쪽이 들어와도 영상 ID 만 뽑아낸다 */
export function parseYoutubeId(input: string): string | null {
  const s = (input || '').trim()
  if (!s) return null
  if (/^[\w-]{11}$/.test(s)) return s
  const patterns = [
    /[?&]v=([\w-]{11})/,
    /youtu\.be\/([\w-]{11})/,
    /youtube\.com\/embed\/([\w-]{11})/,
    /youtube\.com\/shorts\/([\w-]{11})/,
    /youtube\.com\/live\/([\w-]{11})/,
  ]
  for (const re of patterns) {
    const m = s.match(re)
    if (m) return m[1]
  }
  return null
}

export const youtubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
export const youtubeWatch = (id: string) => `https://www.youtube.com/watch?v=${id}`
export const youtubeEmbed = (id: string) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`

export function sortItems(rows: VideoItem[]): VideoItem[] {
  return rows
    .slice()
    .sort(
      (a, b) =>
        a.order - b.order ||
        (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') ||
        a.title.localeCompare(b.title),
    )
}


/**
 * 유튜브 제목에서 해시태그 꼬리를 떼어 읽기 좋게 만든다.
 * "혼주메이크업, 당의한복은 어때요?#short#혼주 한복#혼주메이크업전문" → "혼주메이크업, 당의한복은 어때요?"
 * 앞부분이 너무 짧으면(해시태그가 제목의 전부인 경우) 원문을 그대로 둔다.
 */
export function cleanTitle(title: string): string {
  const i = title.indexOf('#')
  if (i < 0) return title.trim()
  const head = title.slice(0, i).trim().replace(/[·,\-|]+$/, '').trim()
  return head.length >= 6 ? head : title.replace(/#/g, ' #').replace(/\s+/g, ' ').trim()
}
