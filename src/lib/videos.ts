import seed from '@/data/videos.json'

import {
  sortItems,
  youtubeWatch,
  type VideoCategory,
  type VideoChannel,
  type VideoItem,
} from '@/lib/videos-shared'

export * from '@/lib/videos-shared'

const SEED = seed as { channel: VideoChannel; items: VideoItem[] }

/**
 * 채널 공개 RSS 에서 최신 영상을 읽는다 (API 키 불필요, 최근 15개).
 * 실패하면 빈 배열 — 어드민 등록분만 노출된다.
 */
export async function fetchChannelFeed(channelId?: string | null): Promise<VideoItem[]> {
  if (!channelId) return []
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channelId)}`,
      { next: { revalidate: 3600 } },
    )
    if (!res.ok) return []
    const xml = await res.text()
    const entries = xml.split('<entry>').slice(1)
    return entries.map((e, i) => {
      const pick = (tag: string) => {
        const m = e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
        return m ? m[1].trim() : ''
      }
      const id = pick('yt:videoId')
      const title = pick('title')
        .replace(/<!\[CDATA\[|\]\]>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
      return {
        id,
        youtubeId: id,
        title,
        summary: null,
        publishedAt: pick('published').slice(0, 10) || null,
        category: 'recent' as const,
        order: i,
        published: true,
        auto: true,
      }
    })
  } catch {
    return []
  }
}

/** 제목이 비어 있는 항목은 유튜브 oEmbed 로 채운다 (API 키 불필요) */
export async function resolveTitle(id: string): Promise<{ title: string; author?: string } | null> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(youtubeWatch(id))}&format=json`,
      { next: { revalidate: 86400 } },
    )
    if (!res.ok) return null
    const j = (await res.json()) as { title?: string; author_name?: string }
    return j.title ? { title: j.title, author: j.author_name } : null
  } catch {
    return null
  }
}

async function fillTitles(rows: VideoItem[]): Promise<VideoItem[]> {
  const need = rows.filter((x) => !x.title)
  if (!need.length) return rows
  const found = new Map<string, string>()
  await Promise.all(
    need.map(async (x) => {
      const r = await resolveTitle(x.youtubeId)
      if (r) found.set(x.youtubeId, r.title)
    }),
  )
  return rows.map((x) =>
    x.title ? x : { ...x, title: found.get(x.youtubeId) ?? '메이크업포엘 영상' },
  )
}

async function loadCurated(): Promise<{ items: VideoItem[]; channel: VideoChannel }> {
  let items = SEED.items.slice()
  let channel: VideoChannel = { ...SEED.channel }

  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const db = await getAdminDb()
    if (db) {
      const [snap, cfg] = await Promise.all([
        db.collection('videos').get(),
        db.collection('site_config').doc('videos').get(),
      ])
      if (!snap.empty) {
        items = snap.docs.map((d) => {
          const v = d.data() as Partial<VideoItem>
          return {
            id: d.id,
            youtubeId: v.youtubeId ?? d.id,
            title: v.title ?? '',
            summary: v.summary ?? null,
            publishedAt: v.publishedAt ?? null,
            category: (v.category as VideoCategory) ?? 'recent',
            order: typeof v.order === 'number' ? v.order : 999,
            published: v.published !== false,
          }
        })
      }
      const c = cfg.exists ? (cfg.data() as Partial<VideoChannel>) : null
      if (c?.url) channel = { ...channel, ...c } as VideoChannel
    }
  } catch {
    /* 시드 폴백 */
  }
  return { items, channel }
}

/**
 * 화면용 목록.
 * - 최신: 채널 RSS 자동 수집 (어드민 등록분이 있으면 앞에 붙는다)
 * - 대표/인기: 어드민 등록분
 * 어드민에서 숨김 처리한 영상 ID 는 자동 수집분에서도 제외된다.
 */
export async function getVideos(): Promise<{
  featured: VideoItem[]
  recent: VideoItem[]
  popular: VideoItem[]
  channel: VideoChannel
  total: number
}> {
  const { items, channel } = await loadCurated()
  const feed = await fetchChannelFeed(channel.channelId)

  const hidden = new Set(items.filter((x) => x.published === false).map((x) => x.youtubeId))
  const curated = items.filter((x) => x.published !== false)
  const curatedIds = new Set(curated.map((x) => x.youtubeId))

  const featured = await fillTitles(sortItems(curated.filter((x) => x.category === 'featured')))
  const popular = await fillTitles(sortItems(curated.filter((x) => x.category === 'popular')))
  const recent = await fillTitles([
    ...sortItems(curated.filter((x) => x.category === 'recent')),
    ...feed.filter((x) => !hidden.has(x.youtubeId) && !curatedIds.has(x.youtubeId)),
  ])

  const total = new Set([...featured, ...recent, ...popular].map((x) => x.youtubeId)).size
  return { featured, recent, popular, channel, total }
}

/** 어드민용 — 숨김 포함 등록분 전체 + 자동 수집분(등록 후보) */
export async function getVideosForAdmin(): Promise<{
  items: VideoItem[]
  feed: VideoItem[]
  channel: VideoChannel
}> {
  const { items, channel } = await loadCurated()
  const feed = await fetchChannelFeed(channel.channelId)
  return { items: await fillTitles(sortItems(items)), feed, channel }
}
