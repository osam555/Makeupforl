import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SiteShell from "@/components/layout/SiteShell";
import { getSiteImages } from "@/lib/siteImages";
import { Analytics } from "@vercel/analytics/next";
import AdminHome from "@/components/analytics/AdminHome";
import RegisterSW from "@/components/analytics/RegisterSW";
import Track from "@/components/analytics/Track";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/site";
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

    images: [OG_IMAGE],
  },
  // 검색결과에 뜰 사이트 이름을 고정한다. 없으면 도메인이 그대로 노출된다.
  applicationName: SITE_NAME,
  /*
    검색엔진 소유확인.

    네이버 웹마스터도구는 이 태그가 <head> 에 있어야 사이트를 인정한다.
    확인이 끝난 뒤에도 지우면 안 된다 — 주기적으로 다시 확인하고, 사라지면
    등록이 해제된다. 구글은 DNS TXT 레코드로 확인했으므로 여기에는 없다.
  */
  /*
    홈 화면에 담았을 때의 모습.

    manifest 는 src/app/manifest.ts 가 만든다. 여기서는 사파리가 보는 것들만
    따로 적는다 — 아이폰은 아직 manifest 의 아이콘을 다 따르지 않는다.
  */
  appleWebApp: {
    capable: true,
    title: SITE_NAME,
    statusBarStyle: 'default',
  },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  verification: {
    /*
      네이버 인증 태그가 둘인 이유 — 서치어드바이저 계정이 둘이다.
      첫째는 원장님 계정, 둘째(2026-09-11)는 매니저 계정. 수집 요청·사이트맵 제출을
      매니저 쪽에서도 하려면 그 계정에도 사이트가 등록돼 있어야 한다.
      확인이 끝나도 지우면 안 된다 — 네이버가 주기적으로 다시 본다.
    */
    other: {
      'naver-site-verification': [
        'ad1bef12e37799353f437b8223accc310feeab5b',
        'c26591b10a0c4f957b0bfaddf619e53750ac5b3f',
      ],
    },
  },
};

/*
  주소창 색.

  홈 화면에 담아 열면 위쪽 띠가 이 색으로 칠해진다. 브랜드 색을 쓰면 앱처럼
  보이고, 안 쓰면 흰 띠가 남아 웹페이지를 띄운 티가 난다.
*/
export const viewport: Viewport = {
  themeColor: '#A63D5A',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const img = await getSiteImages();
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/*
          글꼴 선언을 화면 그리기 뒤로 미룬다.

          측정해 보니 이 사이트의 LCP 를 늦추는 것은 이미지가 아니라 CSS 한 덩이였다.
          /혼주메이크업 은 LCP 요소가 아예 글자인데도 4.8초였고, 두 페이지 모두
          render delay 가 1.34초로 같았다 — 같은 CSS 를 기다리고 있었다는 뜻이다.

          그 CSS 48.5KB 중 12.9KB 가 글꼴 선언 92줄이었다. 글꼴은 font-display:swap
          이라 어차피 대체 글꼴로 먼저 그려지므로, 선언까지 화면을 막고 기다릴 이유가
          없다. preload 로 받아 두었다가 다 받은 뒤에 적용한다.

          자바스크립트가 없으면 적용되지 않고 대체 글꼴로 남는다. 글을 못 읽게 되는
          것은 아니므로 그편이 화면이 늦게 뜨는 것보다 낫다.
        */}
        {/*
          어두운 테마를 첫 그림 전에 건다. React 가 켜진 뒤에 걸면 밝게 떴다가 어두워지는
          깜빡임이 생긴다. 키는 ThemeToggle 과 같다(mfl:siteTheme). 관리 화면은 자기 테마가
          따로 있어 여기 값을 안 본다.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('mfl:siteTheme')==='dark')document.documentElement.setAttribute('data-theme','dark');var s=localStorage.getItem('mfl:siteSize');if(s==='large'||s==='xlarge')document.documentElement.setAttribute('data-size',s)}catch(e){}",
          }}
        />
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preload" as="style" href="/pretendard.css" id="mfl-font" />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "var l=document.getElementById('mfl-font');if(l){l.rel='stylesheet'}",
          }}
        />
        <noscript>
          {/* 자바스크립트가 없을 때의 마지막 길 — next/font 로는 대신할 수 없다 */}
          {/* eslint-disable-next-line @next/next/no-css-tags */}
          <link rel="stylesheet" href="/pretendard.css" />
        </noscript>
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
        {/* 관리 화면에서는 헤더·푸터가 빠진다 — 판단은 SiteShell 이 한다 */}
        <SiteShell
          header={<Header logo={img["logo"]} logoWhite={img["logo-white"]} />}
          footer={<Footer />}
        >
          {children}
        </SiteShell>
        {/* Vercel 웹 통계 — 쿠키를 쓰지 않고 방문 수만 집계한다 */}
        <Analytics />
        {/*
          우리 쪽 방문 기록.

          Vercel 통계는 Vercel 화면에서만 보인다. 어드민에서 검색어 준비도와 나란히
          놓고 보려면 우리 쪽에도 있어야 한다. 사람을 식별하지 않고, 쿠키도 쓰지 않는다.
        */}
        <Track />
        {/* 홈 화면에 담아 쓸 수 있게. 화면은 언제나 서버를 먼저 본다 */}
        <RegisterSW />
        <AdminHome />
      </body>
    </html>
  );
}
