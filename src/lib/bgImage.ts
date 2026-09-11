/**
 * CSS 배경으로 쓰는 이미지를 최적화 경유로 바꾼다.
 *
 * <Image> 를 쓰는 자리는 Next 가 알아서 줄이고 WebP 로 바꿔 주지만,
 * background-image 로 부르는 자리는 그 길을 타지 않는다. 그래서 홈의 두 배경이
 * 각각 964KB·276KB 로 나가고 있었다 — 한 페이지 전송량 2.3MB 중 1.2MB 다.
 *
 * 게다가 둘 다 PNG 를 .jpg 이름으로 올린 것이었다. 확장자만 보고는 알 수 없고,
 * PNG 는 사진에 쓰면 몇 배로 커진다.
 *
 * 주소를 최적화 엔드포인트로 감싸면 브라우저가 보내는 Accept 에 맞춰 WebP/AVIF
 * 로 내려온다. 배경이라 화면 폭보다 클 이유도 없어 폭을 함께 지정한다.
 *
 * 품질은 75 로 고정한다. Next 16 은 images.qualities 에 없는 값(기본 [75])을
 * 400 INVALID_IMAGE_OPTIMIZE_REQUEST 로 거절한다. 70 을 넘기고 있어서 홈의 서비스
 * 두 상자와 아래 배경이 통째로 비어 나갔다 — 글자가 흰색이라 빈 자리로만 보였다.
 * 폭(w)도 같다: deviceSizes·imageSizes 에 있는 값만 받는다(828·1920 은 기본값에 있다).
 */
export function bgImage(url: string | undefined, width = 1920, quality = 75): string {
  if (!url) return ''
  // 이미 최적화를 거친 주소는 두 번 감싸지 않는다
  if (url.startsWith('/_next/image')) return url
  return `/_next/image?url=${encodeURIComponent(url)}&w=${width}&q=${quality}`
}
