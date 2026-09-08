import type { MetadataRoute } from 'next'
import { GALLERY_CATEGORIES } from '@/lib/galleryCategories'
import { HUBS } from '@/lib/hubs'
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
  const items = await getPublishedWed100Items()
  const access = await getWed100Access()

  /*
    lastmod 는 실제로 고친 날이어야 한다.

    전에는 모든 주소에 요청 시각을 넣었다. 그러면 사이트맵을 읽을 때마다 100건이
    전부 "방금 바뀜"으로 보이고, 크롤러는 몇 번 확인해 본 뒤 이 값을 믿지 않게 된다.
    문항은 자기 갱신 시각을, 목록 성격의 페이지는 문항 중 가장 최근 값을 쓴다.
    모르는 페이지는 아예 비운다 — 거짓 날짜보다 없는 편이 낫다.
  */
  const latest = items
    .map((x) => x.updatedAt)
    .filter((d): d is string => Boolean(d))
    .sort()
    .at(-1)
  const listUpdated = latest ? new Date(latest) : undefined

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
      // 목록 성격의 두 페이지만 문항 갱신을 따라간다
      ...(m.path === '/' || m.path === '/honjoo100' ? { lastModified: listUpdated } : {}),
      changeFrequency: m.freq,
      priority: m.priority,
    })),
    /*
      검색어 허브. 유료화 이후에는 100문100답 본문이 대부분 닫히므로,
      검색에 걸리는 공개 콘텐츠는 사실상 이쪽이 된다. 우선순위를 높게 준다.
    */
    ...HUBS.map((h) => ({
      url: `${SITE_URL}/${h.slug}`,
      ...(listUpdated ? { lastModified: listUpdated } : {}),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    // 업무분야 — 옛 사이트의 gal1.php?b_type=N 이 여기로 온다
    ...GALLERY_CATEGORIES.map((c) => ({
      url: `${SITE_URL}/gallery/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
    ...items.map((x) => ({
      url: `${SITE_URL}/honjoo100/${x.slug}`,
      ...(x.updatedAt ? { lastModified: new Date(x.updatedAt) } : {}),
      changeFrequency: 'monthly' as const,
      priority: isOpen(access, x.slug) ? 0.7 : 0.5,
    })),
  ]
}
