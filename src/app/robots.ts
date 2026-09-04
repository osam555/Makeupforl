import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * 색인 규칙.
 *
 * 관리자 화면과 API 는 검색 결과에 뜰 이유가 없어 막는다.
 *
 * 100문100답 문항은 연다. 예전에는 유료 전환 준비 중이라 통째로 막아 뒀는데,
 * 그러면 무료로 열 문항까지 검색에 걸리지 않는다. 지금은 잠긴 문항이 본문을
 * 아예 내보내지 않고 유료 콘텐츠 표기(isAccessibleForFree:false)를 달고 있어,
 * 제목만 검색에 남고 본문은 새 나가지 않는다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
