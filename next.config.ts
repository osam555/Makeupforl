import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
      {
        protocol: 'https',
        hostname: 'makeupforl.co.kr',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '**.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/education', destination: '/videos', permanent: true },
      // 100문100답 주소 변경 (/wed100 → /honjoo100) — 기존 링크·검색 유입 보존
      { source: '/wed100', destination: '/honjoo100', permanent: true },
      { source: '/wed100/:slug', destination: '/honjoo100/:slug', permanent: true },

      /*
        옛 PHP 사이트 주소 → 새 주소.
        도메인을 이 앱으로 옮기면 옛 주소는 전부 404 가 되고 검색엔진에 쌓인
        순위와 유입이 사라진다. 옛 sitemap 에 76건이 올라 있어 301 로 넘긴다.
        (옛 페이지를 하나씩 열어 어떤 화면인지 확인하고 맞춘 표다)
      */
      { source: '/index.php', destination: '/', permanent: true },

      // 브랜드소개 — 회사소개·오시는 길은 같은 페이지 안의 섹션이다
      { source: '/sub/sub01_01.php', destination: '/brand', permanent: true },
      { source: '/sub/sub01_02.php', destination: '/brand#company', permanent: true },
      // CEO컬럼은 옮겨온 페이지가 없어 브랜드소개로 보낸다
      { source: '/sub/sub01_03.php', destination: '/brand', permanent: true },
      { source: '/sub/sub01_04.php', destination: '/brand#location', permanent: true },

      { source: '/sub/sub02_01.php', destination: '/services', permanent: true },
      { source: '/sub/sub03_01.php', destination: '/consultation', permanent: true },

      // 갤러리 7분야 (옛 탭 순서 그대로 확인함)
      { source: '/sub/sub04_01.php', destination: '/gallery/honju', permanent: true },
      { source: '/sub/sub04_02.php', destination: '/gallery/family-guest', permanent: true },
      { source: '/sub/sub04_03.php', destination: '/gallery/wedding', permanent: true },
      { source: '/sub/sub04_04.php', destination: '/gallery/corporate-video', permanent: true },
      { source: '/sub/sub04_05.php', destination: '/gallery/photoshoot-profile', permanent: true },
      // 패션쇼는 사진이 한 장도 없어 전체 갤러리로 보낸다
      { source: '/sub/sub04_06.php', destination: '/gallery', permanent: true },
      { source: '/sub/sub04_07.php', destination: '/gallery/men-makeup', permanent: true },

      { source: '/sub/sub05_01.php', destination: '/reservation', permanent: true },
      { source: '/sub/sub06_01.php', destination: '/reviews', permanent: true },
      { source: '/sub/sub07_01.php', destination: '/reservation', permanent: true },

      // 갤러리 목록 엔드포인트 — b_type 값으로 분야를 나눈다
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '1' }], destination: '/gallery/honju', permanent: true },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '2' }], destination: '/gallery/family-guest', permanent: true },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '3' }], destination: '/gallery/wedding', permanent: true },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '4' }], destination: '/gallery/corporate-video', permanent: true },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '5' }], destination: '/gallery/photoshoot-profile', permanent: true },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '7' }], destination: '/gallery/men-makeup', permanent: true },
      { source: '/gal1.php', destination: '/gallery', permanent: true },

      // 남은 .php 는 홈으로 (게시판 상세 등 개별 주소가 많다)
      { source: '/sub/:path*', destination: '/', permanent: true },
    ]
  },
};

export default nextConfig;
