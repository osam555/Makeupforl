/** 한국어 문장 분리 — 파서 스크립트/어드민과 동일 규칙 */
export function splitSentences(text: string, maxLen = 90): string[] {
  const raw = text
    .split(/(?<=[.!?…])\s+|(?<=[.!?…]["”’])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const s of raw) {
    if (s.length <= maxLen) {
      out.push(s)
      continue
    }
    let buf = ''
    for (const piece of s.split(/(?<=,)\s*/)) {
      if (buf.length + piece.length <= maxLen || buf.length < 20) buf += piece
      else {
        out.push(buf.trim())
        buf = piece
      }
    }
    if (buf.trim()) out.push(buf.trim())
  }
  return out
}

/**
 * 본문(answer)만 고친 경우 자막 큐도 같은 문장으로 따라가게 한다.
 *
 * - 이전 본문에서 나온 문장과 **정확히 일치하던** 큐만 새 문장으로 바꾼다.
 *   → 관리자가 손으로 다듬어 둔 큐는 건드리지 않는다.
 * - 타임코드·영문 자막·오디오는 그대로 유지하므로 TTS 재생성이 필요 없다.
 *   (문장 길이가 크게 달라지면 싱크가 약간 어긋날 수 있어, 그럴 땐 [큐 재생성]을 쓴다)
 */
export function syncCuesWithAnswer<T extends { ko: string }>(
  prevAnswer: string[] | undefined,
  nextAnswer: string[] | undefined,
  cues: T[] | undefined,
): { cues: T[]; changed: number } {
  const list = cues ?? []
  if (!prevAnswer?.length || !nextAnswer?.length || !list.length) return { cues: list, changed: 0 }

  const prev = prevAnswer.flatMap((p) => splitSentences(p))
  const next = nextAnswer.flatMap((p) => splitSentences(p))
  if (prev.length !== next.length) return { cues: list, changed: 0 }

  const map = new Map<string, string>()
  prev.forEach((s, i) => {
    if (s !== next[i]) map.set(s, next[i])
  })
  if (!map.size) return { cues: list, changed: 0 }

  let changed = 0
  const out = list.map((c) => {
    const to = map.get(c.ko)
    if (!to) return c
    changed++
    return { ...c, ko: to }
  })
  return { cues: out, changed }
}
