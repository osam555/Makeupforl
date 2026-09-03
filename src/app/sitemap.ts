import type { MetadataRoute } from 'next'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'
import { SITE_URL } from '@/lib/site'

/**
 * 검색엔진에 알릴 주소 목록.
 *
 * 100문100답 개별 문항(102개)은 아직 넣지 않는다. 유료 판매를 준비 중이라
 * 무료로 열 범위가 정해지지 않았는데, 한 번 색인되면 나중에 잠가도 검색 결과와
 * 캐시에 본문이 남는다. 범위가 정해지면 무료 문항만 여기 추가하면 된다.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const main: { path: string; priority: number; freq: MetadataRoute.Sitemap[number]['changeFrequency'] }[] = [
    { path: '/', priority: 1.0, freq: 'weekly' },
    { path: '/honjoo100', priority: 0.9, freq: 'weekly' },
    { path: '/brand', priority: 0.8, freq: 'monthly' },
    { path: '/services', priority: 0.8, freq: 'monthly' },
    { path: '/consultation', priority: 0.8, freq: 'monthly' },
    { path: '/gallery', priority: 0.7, freq: 'weekly' },
    { path: '/reservation', priority: 0.7, freq: 'monthly' },
    { path: '/reviews', priority: 0.7, freq: 'weekly' },
    { path: '/videos', priority: 0.6, freq: 'weekly' },
  ]

  return [
    ...main.map((m) => ({
      url: `${SITE_URL}${m.path}`,
      lastModified: now,
      changeFrequency: m.freq,
      priority: m.priority,
    })),
    // 업무분야 — 옛 사이트의 gal1.php?b_type=N 이 여기로 온다
    ...GALLERY_CATEGORIES.map((c) => ({
      url: `${SITE_URL}/gallery/${c.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
