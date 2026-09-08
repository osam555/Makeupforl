import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SiteShell from "@/components/layout/SiteShell";
import { getSiteImages } from "@/lib/siteImages";
import { Analytics } from "@vercel/analytics/next";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { businessJsonLd, jsonLdScript } from "@/lib/seo";

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
  // 검색결과에 뜰 사이트 이름을 고정한다. 없으면 도메인이 그대로 노출된다.
  applicationName: SITE_NAME,
  /*
    검색엔진 소유확인.

    네이버 웹마스터도구는 이 태그가 <head> 에 있어야 사이트를 인정한다.
    확인이 끝난 뒤에도 지우면 안 된다 — 주기적으로 다시 확인하고, 사라지면
    등록이 해제된다. 구글은 DNS TXT 레코드로 확인했으므로 여기에는 없다.
  */
  verification: {
    other: { 'naver-site-verification': 'ad1bef12e37799353f437b8223accc310feeab5b' },
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
        {/*
          Pretendard 를 가변 서브셋판으로 받는다.

          정적판은 굵기마다 별도 파일이고 한 개가 765KB 다. 이 사이트는 300~900 을
          모두 쓰므로 다 받으면 5.3MB 가 폰트로만 나간다 — 이미지보다 무거웠다.
          가변 서브셋판은 굵기 45~920 을 한 파일로 담고, 그 파일을 유니코드 구간별
          92조각으로 쪼개 둔다. 브라우저는 화면에 실제로 쓰인 글자가 든 조각만
          받는다(조각당 약 35KB). 한글 페이지 기준 5~15조각이면 충분하다.

          preconnect 를 함께 두는 이유: 이 스타일시트는 화면 그리기를 막는다.
          연결을 미리 열어 두면 그만큼 먼저 시작된다.
        */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/*
          업체 정보. 푸터에 글자로만 있던 상호·주소·전화를 검색엔진이 읽을 수 있는
          형태로 한 번 더 내보낸다. 지역 검색("강남 혼주메이크업")에서 이 표기가 없으면
          같은 조건의 업체에 밀린다.
        */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(businessJsonLd()) }}
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
