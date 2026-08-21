import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin 은 번들에 넣지 말고 런타임에 그대로 require 하게 둔다.
  // 번들러가 동적 import 를 놓치면 관리자 구글 로그인 검증이 통째로 터진다.
  serverExternalPackages: ['firebase-admin'],
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
    return [{ source: '/education', destination: '/videos', permanent: true }]
  },
};

export default nextConfig;
