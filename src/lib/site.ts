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
