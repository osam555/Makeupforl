import type { MetadataRoute } from 'next'

import { SITE_NAME } from '@/lib/site'

/**
 * 홈 화면에 담을 수 있게 한다.
 *
 * 이 사이트에서 앱처럼 쓰는 사람은 둘이다. 하나는 원장님 — 관리 화면을 휴대전화로
 * 열어 보신다. 다른 하나는 값을 낸 혼주님 — 100문100답을 예식 전까지 두세 달에
 * 걸쳐 조금씩 듣는다. 그때마다 주소를 치는 것보다 아이콘을 누르는 편이 낫다.
 *
 * 시작 주소를 100문100답으로 두지 않고 홈으로 둔 이유: 담는 사람이 원장님일 수도
 * 손님일 수도 있어, 어느 한쪽을 미리 정하면 다른 쪽이 매번 되돌아 나와야 한다.
 * 대신 관리자로 로그인돼 있으면 앱이 열린 뒤 관리 화면으로 옮긴다 — AdminHome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} · 혼주메이크업`,
    short_name: SITE_NAME,
    description:
      '강남 논현동 혼주 전문 메이크업샵. 25년간 1만 명의 혼주님을 만난 대표원장이 직접 담당합니다.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#FBF7F3',
    theme_color: '#A63D5A',
    lang: 'ko',
    categories: ['beauty', 'lifestyle'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: '혼주메이크업 안내', url: '/혼주메이크업' },
      { name: '100문 100답', url: '/honjoo100' },
      { name: '예약 문의', url: '/reservation' },
      { name: '관리 화면', url: '/admin' },
    ],
  }
}
