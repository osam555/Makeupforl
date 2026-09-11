/**
 * 사이트 기준 주소. 메타데이터·사이트맵·robots 가 모두 이 값을 본다.
 *
 * metadataBase 가 없으면 Next 가 http://localhost:3000 으로 OG 이미지 주소를 만든다.
 * 그러면 카카오톡·페이스북에 링크를 공유해도 썸네일이 뜨지 않는다.
 *
 * 도메인 전환 전에는 Vercel 주소, 전환 후에는 makeupforl.co.kr 을 쓴다.
 * 환경변수 NEXT_PUBLIC_SITE_URL 로 덮어쓸 수 있으므로 코드 수정 없이 바꿀 수 있다.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || 'https://makeupforl.co.kr'

export const SITE_NAME = '메이크업포엘'

/**
 * 공유 썸네일 기본값.
 *
 * 문항 페이지만 og:image 가 있고 홈·허브·서비스·갤러리는 없었다. 혼주 손님은 자녀가
 * 카카오톡으로 보내 준 링크로 오는데, 그림 없는 링크는 눌리지 않는다.
 * Next 의 openGraph 는 자식 페이지가 정의하면 통째로 바뀌므로(깊은 병합 아님)
 * openGraph 를 쓰는 페이지마다 이 값을 images 에 넣어야 한다.
 */
export const OG_IMAGE = {
  url: '/mfl/images/main/main_vis1.jpg',
  width: 1920,
  height: 980,
  alt: '메이크업포엘 — 강남 혼주 전문 메이크업샵',
}
