import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SiteShell from "@/components/layout/SiteShell";
import { getSiteImages } from "@/lib/siteImages";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  // OG 이미지 등 상대 주소를 절대 주소로 만들 기준. 없으면 localhost 로 만들어져
  // 카카오톡·페이스북 공유 시 썸네일이 뜨지 않는다.
  metadataBase: new URL(SITE_URL),
  title: "메이크업포엘 | 강남 메이크업샵",
  description: "전문가의 1:1 사전 컨설팅을 통한 퍼스널컬러 진단, 프라이빗 헤어 메이크업 서비스. 샵서비스와 출장메이크업 제공.",
  keywords: "강남 메이크업, 웨딩 메이크업, 출장 메이크업, 헤어 메이크업, 퍼스널컬러, 메이크업샵",
  openGraph: {
    title: "메이크업포엘 | 강남 메이크업샵",
    description: "전문가의 1:1 사전 컨설팅을 통한 퍼스널컬러 진단, 프라이빗 헤어 메이크업 서비스",
    siteName: SITE_NAME,
    url: SITE_URL,
    locale: "ko_KR",
    type: "website",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const img = await getSiteImages();
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
      </head>
      <body className="antialiased">
        <SiteShell>
          <Header logo={img["logo"]} logoWhite={img["logo-white"]} />
          <main>{children}</main>
          <Footer />
        </SiteShell>
        {/* Vercel 웹 통계 — 쿠키를 쓰지 않고 방문 수만 집계한다 */}
        <Analytics />
      </body>
    </html>
  );
}
