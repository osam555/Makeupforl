import seed from '@/data/instagram.json'

export type InstagramImage = { src: string; width: number; height: number }
export type InstagramPost = {
  id: string
  url: string
  date: string
  text: string
  tags: string[]
  images: InstagramImage[]
  likes: number
  pinned: boolean
}
export type InstagramProfile = {
  username: string
  url: string
  name: string
  bio: string
  posts: number
  followers: number
}

/**
 * 인스타그램 게시물 사본.
 *
 * Firestore 우선·시드 폴백을 타지 않는 유일한 목록이다 — 인스타그램은 로그인 없이는
 * 읽을 수 없고 API 는 비즈니스 계정 연동이 필요해서, 서버가 그때그때 가져올 길이 없다.
 * 대신 사람이 로그인한 브라우저로 모아 scripts/instagram/build.py 로 시드와 사진을
 * 만든다. 사진은 public/instagram/ 에 있다 — cdninstagram 주소는 며칠이면 만료된다.
 *
 * 같은 글을 사진만 바꿔 서너 개로 나눠 올린 게시물이 많다(인스타의 3열 격자를 한 줄로
 * 채우려고). 사이트에서는 그것을 한 묶음으로 보여 준다 — 같은 글이 세 번 이어지면
 * 검색엔진에는 중복이고 사람에게는 지루하다.
 */
const SEED = seed as { profile: InstagramProfile; fetchedAt: string; posts: InstagramPost[] }

export type InstagramGroup = {
  id: string
  url: string
  date: string
  text: string
  tags: string[]
  images: InstagramImage[]
  likes: number
  pinned: boolean
  /** 묶인 원본 게시물 수 */
  count: number
}

export function getInstagram(): {
  profile: InstagramProfile
  fetchedAt: string
  groups: InstagramGroup[]
  total: number
} {
  const groups: InstagramGroup[] = []
  const byText = new Map<string, InstagramGroup>()
  for (const p of SEED.posts) {
    const key = p.text.replace(/\s+/g, ' ').trim()
    const g = key ? byText.get(key) : undefined
    if (g) {
      g.images.push(...p.images)
      g.likes += p.likes
      g.count += 1
      // 묶음의 대표 링크는 가장 먼저 올린 것 — 인스타에서 그 글을 열면 이어진 것이 보인다
      if (p.date < g.date) {
        g.date = p.date
        g.url = p.url
        g.id = p.id
      }
      continue
    }
    const ng: InstagramGroup = { ...p, images: [...p.images], count: 1 }
    groups.push(ng)
    if (key) byText.set(key, ng)
  }
  return { profile: SEED.profile, fetchedAt: SEED.fetchedAt, groups, total: SEED.posts.length }
}
