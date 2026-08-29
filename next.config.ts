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
    ]
  },
};

export default nextConfig;
