/**
 * 한국어 문장 분리.
 * 줄바꿈은 무조건 끊는다 — 본문에서 줄을 나눈 그대로 자막 한 줄이 된다.
 * 그 안에서 다시 문장부호 기준으로 나누고, 너무 길면 쉼표에서 접는다.
 */
export function splitSentences(text: string, maxLen = 90): string[] {
  const raw = text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+|(?<=[.!?…]["”’])\s+/))
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

/** 편집 거리 (짧은 문장 대상이라 단순 DP 로 충분) */
function editDistance(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length
  const n = b.length
  if (!m) return n
  if (!n) return m
  let prev = Array.from({ length: n + 1 }, (_, j) => j)
  const cur = new Array<number>(n + 1)
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      )
    }
    prev = cur.slice()
  }
  return prev[n]
}

/** 0~1 유사도 */
function similarity(a: string, b: string): number {
  const len = Math.max(a.length, b.length)
  if (!len) return 1
  return 1 - editDistance(a, b) / len
}

/**
 * 본문(answer)을 고쳤을 때 자막 큐도 같은 문장으로 따라가게 한다.
 *
 * 두 단계로 판단한다.
 *  1) 이전 본문의 문장과 **정확히 일치**하던 큐 → 새 문장으로 교체 (가장 안전)
 *  2) 문장 수가 같을 때, 같은 자리의 큐가 새 문장과 **거의 같으면**(유사도 0.7 이상) 교체
 *     → 단어 몇 개 고친 경우를 잡아준다. 완전히 다르게 손봐 둔 큐는 그대로 둔다.
 *
 * 타임코드·영문 자막·오디오는 유지하므로 TTS 재생성이 필요 없다.
 * (문장 자체를 새로 쓰거나 개수가 달라지면 어드민의 [큐 재생성]을 쓴다)
 */
export function syncCuesWithAnswer<T extends { ko: string }>(
  prevAnswer: string[] | undefined,
  nextAnswer: string[] | undefined,
  cues: T[] | undefined,
  minSimilarity = 0.7,
): { cues: T[]; changed: number } {
  const list = cues ?? []
  if (!nextAnswer?.length || !list.length) return { cues: list, changed: 0 }

  const next = nextAnswer.flatMap((p) => splitSentences(p))
  if (!next.length) return { cues: list, changed: 0 }

  const prev = (prevAnswer ?? []).flatMap((p) => splitSentences(p))
  const exact = new Map<string, string>()
  if (prev.length === next.length) {
    prev.forEach((s, i) => {
      if (s !== next[i]) exact.set(s, next[i])
    })
  }

  const byPosition = next.length === list.length

  let changed = 0
  const out = list.map((c, i) => {
    const hit = exact.get(c.ko)
    if (hit) {
      changed++
      return { ...c, ko: hit }
    }
    if (byPosition) {
      const target = next[i]
      if (c.ko !== target && similarity(c.ko, target) >= minSimilarity) {
        changed++
        return { ...c, ko: target }
      }
    }
    return c
  })

  return { cues: out, changed }
}
