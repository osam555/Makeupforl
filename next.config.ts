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
      { source: '/education', destination: '/videos', statusCode: 301 },
      // 100문100답 주소 변경 (/wed100 → /honjoo100) — 기존 링크·검색 유입 보존
      { source: '/wed100', destination: '/honjoo100', statusCode: 301 },
      { source: '/wed100/:slug', destination: '/honjoo100/:slug', statusCode: 301 },

      /*
        옛 PHP 사이트 주소 → 새 주소.
        도메인을 이 앱으로 옮기면 옛 주소는 전부 404 가 되고 검색엔진에 쌓인
        순위와 유입이 사라진다. 옛 sitemap 에 76건이 올라 있어 301 로 넘긴다.
        (옛 페이지를 하나씩 열어 어떤 화면인지 확인하고 맞춘 표다)

        `permanent: true` 가 아니라 `statusCode: 301` 인 이유 — permanent 는 308 을 내는데,
        네이버는 308 을 영구 이동으로 안 본다. 2026-09-11 에 재 보니 네이버가 새 사이트의
        제목·파비콘·사진까지 다 긁어 가고도 주소는 옛 /sub/sub04_01.php 로 두고 있었다
        (혼주메이크업 2위, 혼주머리 5위가 전부 옛 주소). 구글은 308 을 잘 따라간다.
      */
      { source: '/index.php', destination: '/', statusCode: 301 },

      // 브랜드소개 — 회사소개·오시는 길은 같은 페이지 안의 섹션이다
      { source: '/sub/sub01_01.php', destination: '/brand', statusCode: 301 },
      { source: '/sub/sub01_02.php', destination: '/brand#company', statusCode: 301 },
      // CEO컬럼은 옮겨온 페이지가 없어 브랜드소개로 보낸다
      { source: '/sub/sub01_03.php', destination: '/brand', statusCode: 301 },
      { source: '/sub/sub01_04.php', destination: '/brand#location', statusCode: 301 },

      { source: '/sub/sub02_01.php', destination: '/services', statusCode: 301 },
      { source: '/sub/sub03_01.php', destination: '/consultation', statusCode: 301 },

      // 갤러리 7분야 (옛 탭 순서 그대로 확인함)
      { source: '/sub/sub04_01.php', destination: '/gallery/honju', statusCode: 301 },
      { source: '/sub/sub04_02.php', destination: '/gallery/family-guest', statusCode: 301 },
      { source: '/sub/sub04_03.php', destination: '/gallery/wedding', statusCode: 301 },
      { source: '/sub/sub04_04.php', destination: '/gallery/corporate-video', statusCode: 301 },
      { source: '/sub/sub04_05.php', destination: '/gallery/photoshoot-profile', statusCode: 301 },
      // 패션쇼는 사진이 한 장도 없어 전체 갤러리로 보낸다
      { source: '/sub/sub04_06.php', destination: '/gallery', statusCode: 301 },
      { source: '/sub/sub04_07.php', destination: '/gallery/men-makeup', statusCode: 301 },

      { source: '/sub/sub05_01.php', destination: '/reservation', statusCode: 301 },
      { source: '/sub/sub06_01.php', destination: '/reviews', statusCode: 301 },
      { source: '/sub/sub07_01.php', destination: '/reservation', statusCode: 301 },

      // 갤러리 목록 엔드포인트 — b_type 값으로 분야를 나눈다
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '1' }], destination: '/gallery/honju', statusCode: 301 },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '2' }], destination: '/gallery/family-guest', statusCode: 301 },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '3' }], destination: '/gallery/wedding', statusCode: 301 },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '4' }], destination: '/gallery/corporate-video', statusCode: 301 },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '5' }], destination: '/gallery/photoshoot-profile', statusCode: 301 },
      { source: '/gal1.php', has: [{ type: 'query', key: 'b_type', value: '7' }], destination: '/gallery/men-makeup', statusCode: 301 },
      { source: '/gal1.php', destination: '/gallery', statusCode: 301 },

      // 개인정보처리방침·이메일무단수집거부 팝업
      { source: '/sub/pop_privacy.html', destination: '/privacy', statusCode: 301 },
      { source: '/sub/pop_email.html', destination: '/privacy#email', statusCode: 301 },

      // 남은 .php 는 홈으로 (게시판 상세 등 개별 주소가 많다)
      { source: '/sub/:path*', destination: '/', statusCode: 301 },
    ]
  },
};

export default nextConfig;
