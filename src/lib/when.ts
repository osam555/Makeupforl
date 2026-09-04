/**
 * 시각을 사람이 읽는 말로 바꾼다.
 *
 * 방금 고친 것인지 한참 전 것인지가 한눈에 들어와야 해서, 가까운 시각은 상대적으로
 * ("10분 전") 오래된 것은 날짜로 보여준다. 정확한 시각은 title 속성에 남긴다.
 */
export function whenText(iso?: string | null): string {
  if (!iso) return '없음'
  const t = Date.parse(iso)
  if (!Number.isFinite(t)) return '없음'

  const min = Math.floor((Date.now() - t) / 60000)
  if (min < 1) return '방금'
  if (min < 60) return `${min}분 전`
  if (min < 24 * 60) return `${Math.floor(min / 60)}시간 전`
  if (min < 7 * 24 * 60) return `${Math.floor(min / (24 * 60))}일 전`

  const d = new Date(t)
  const sameYear = d.getFullYear() === new Date().getFullYear()
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일`
  return sameYear ? md : `${d.getFullYear()}년 ${md}`
}

/** 마우스를 올렸을 때 보여줄 정확한 시각 */
export function whenExact(iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}
