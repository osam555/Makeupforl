import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

/**
 * 색인 규칙.
 *
 * 관리자 화면과 API 는 검색 결과에 뜰 이유가 없어 막는다.
 *
 * 100문100답 개별 문항(/honjoo100/xxx)도 당분간 막는다. 유료 판매를 준비 중인데
 * 지금은 본문 46,931자와 음성 99분이 전부 공개라, 색인되면 나중에 잠가도
 * 검색 결과와 캐시에 남는다. 무료 범위가 정해지면 그 문항들만 풀면 된다.
 * 목록·소개 페이지(/honjoo100)는 열어 두므로 홍보에는 지장이 없다.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/honjoo100/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
