import type { MetadataRoute } from 'next'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'
import { SITE_URL } from '@/lib/site'
import { getPublishedWed100Items } from '@/lib/wed100'
import { getWed100Access, isOpen } from '@/lib/wed100Access'

/**
 * 검색엔진에 알릴 주소 목록.
 *
 * 100문100답 개별 문항도 넣는다. 잠긴 문항은 본문을 내보내지 않고 유료 콘텐츠로
 * 표기하므로, 색인되는 것은 제목뿐이다. 제목이 검색에 걸려야 사람이 찾아온다.
 * 무료로 연 문항은 본문까지 색인되도록 우선순위를 조금 높인다.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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

  const items = await getPublishedWed100Items()
  const access = await getWed100Access()

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
    ...items.map((x) => ({
      url: `${SITE_URL}/honjoo100/${x.slug}`,
      lastModified: x.updatedAt ? new Date(x.updatedAt) : now,
      changeFrequency: 'monthly' as const,
      priority: isOpen(access, x.slug) ? 0.7 : 0.5,
    })),
  ]
}
