/**
 * 주소에 붙인 출처 꼬리표(?from=…) → 방문 출처 (2026-11-14).
 *
 * 유튜브 앱에서 채널 프로필 링크를 누르면 인앱 브라우저가 referrer 를 붙이지 않아
 * 쇼츠를 보고 온 사람이 전부 "직접 방문" 에 묻혔다 — 쇼츠가 100문100답 구매로
 * 이어지는지 잴 수가 없었다. 그래서 프로필 링크를 /honjoo100?from=yt 로 두고
 * /api/track 이 referrer 보다 이 꼬리표를 먼저 본다.
 * 아무 문자열이나 출처 칸이 되면 문서가 부풀므로 아는 값만 받는다.
 * 사람을 식별하는 값이 아니다(어디서 왔는지만 센다).
 */
const FROM_TAGS: Readonly<Record<string, string>> = { yt: 'youtube-shorts' }

export function fromTag(from: string): string | null {
  return Object.hasOwn(FROM_TAGS, from) ? FROM_TAGS[from] : null
}
