import lamejs from '@breezystack/lamejs'

import { gainToTarget, HOST_TARGET_DBFS } from '@/lib/tts/level'

/**
 * 이미 만들어 둔 음성의 MC(진행자) 구간만 음량을 올린다.
 *
 * 왜 통째로 다시 인코딩하지 않는가 —
 * 이 mp3 는 MC 구간과 원장님 구간을 따로 인코딩해 이어 붙인 것이라, 두 구간의
 * 경계가 정확히 mp3 프레임 경계에 놓여 있다. 그래서 앞쪽 MC 프레임만 떼어
 * 손보고 원장님 프레임은 **바이트 그대로** 붙이면, 분량이 훨씬 많은 답변 쪽은
 * 음질 손실이 전혀 없다.
 *
 * 규격: 24kHz / 48kbps CBR 모노 = MPEG-2 Layer III, 프레임당 144바이트 · 24ms.
 */
const SAMPLE_RATE = 24000
const KBPS = 48
const BYTES_PER_SEC = (KBPS * 1000) / 8 // 6000
const FRAME_BYTES = 144
const FRAME_MS = (FRAME_BYTES / BYTES_PER_SEC) * 1000 // 24ms

export interface McLevelResult {
  blob: Blob
  /** 손보기 전 MC 유성 RMS (dBFS) */
  beforeDb: number
  /** 손본 뒤 MC 유성 RMS (dBFS) */
  afterDb: number
  gainDb: number
  /** 원장님 구간을 그대로 둔 바이트 수 */
  keptBytes: number
}

/**
 * 실제 소리가 시작되는 위치를 찾는다.
 * 앞에는 ID3v2 태그와 Xing/Info 프레임(재생 길이를 적어 둔 메타 프레임)이 올 수 있는데,
 * 둘 다 소리가 아니라서 손대지 않고 그대로 앞에 다시 붙인다.
 */
function audioStart(bytes: Uint8Array): number {
  let p = 0
  if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    p =
      10 +
      (((bytes[6] & 0x7f) << 21) |
        ((bytes[7] & 0x7f) << 14) |
        ((bytes[8] & 0x7f) << 7) |
        (bytes[9] & 0x7f))
  }
  // 첫 프레임 안에 'Xing' 또는 'Info' 가 있으면 소리가 아니라 메타 프레임이다
  const len = frameLength(bytes, p)
  if (len > 0) {
    let tag = ''
    for (let i = p + 4; i < Math.min(p + len, bytes.length); i++) tag += String.fromCharCode(bytes[i])
    if (tag.includes('Xing') || tag.includes('Info')) p += len
  }
  return p
}

/** 이 위치에 있는 mp3 프레임의 바이트 길이 (프레임이 아니면 0) */
function frameLength(b: Uint8Array, p: number): number {
  if (p + 4 > b.length || b[p] !== 0xff || (b[p + 1] & 0xe0) !== 0xe0) return 0
  const ver = (b[p + 1] >> 3) & 3 // 2 = MPEG-2
  const layer = (b[p + 1] >> 1) & 3 // 1 = Layer III
  const brIdx = (b[p + 2] >> 4) & 15
  const srIdx = (b[p + 2] >> 2) & 3
  const pad = (b[p + 2] >> 1) & 1
  const BR2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]
  const SR2 = [22050, 24000, 16000, 0]
  if (ver !== 2 || layer !== 1 || !BR2[brIdx] || !SR2[srIdx]) return 0
  return Math.floor((72 * BR2[brIdx] * 1000) / SR2[srIdx]) + pad
}

function encodeMp3(pcm: Int16Array): Uint8Array {
  const enc = new lamejs.Mp3Encoder(1, SAMPLE_RATE, KBPS)
  const chunks: Uint8Array[] = []
  const BLOCK = 1152
  for (let i = 0; i < pcm.length; i += BLOCK) {
    const out = enc.encodeBuffer(pcm.subarray(i, Math.min(i + BLOCK, pcm.length)))
    if (out.length) chunks.push(new Uint8Array(out))
  }
  const tail = enc.flush()
  if (tail.length) chunks.push(new Uint8Array(tail))
  const total = chunks.reduce((a, c) => a + c.length, 0)
  const buf = new Uint8Array(total)
  let p = 0
  for (const c of chunks) {
    buf.set(c, p)
    p += c.length
  }
  return buf
}

/**
 * @param mp3      원본 음성 전체
 * @param mcEndSec 질문(MC) 구간이 끝나는 시각 — Firestore 의 questionAudio.end
 */
export async function raiseMcLevel(
  mp3: ArrayBuffer,
  mcEndSec: number,
  ctx: AudioContext,
): Promise<McLevelResult | null> {
  const bytes = new Uint8Array(mp3)
  const head = audioStart(bytes)

  // MC 구간을 프레임 단위로 끊는다 (원래 두 구간을 따로 인코딩해 이어 붙였기
  // 때문에 경계가 프레임에 딱 맞아떨어진다)
  const frames = Math.max(1, Math.round((mcEndSec * 1000) / FRAME_MS))
  const cut = head + frames * FRAME_BYTES
  if (cut >= bytes.length) return null

  const headBytes = bytes.slice(0, head) // ID3 · Xing — 그대로 둔다
  const mcBytes = bytes.slice(head, cut)
  const restBytes = bytes.slice(cut) // 원장님 구간 — 손대지 않는다

  // 메타 프레임을 뺀 순수 프레임 묶음도 그대로 디코딩된다
  const decoded = await ctx.decodeAudioData(mcBytes.buffer.slice(0) as ArrayBuffer)
  const src = decoded.getChannelData(0)

  const gain = gainToTarget(src, decoded.sampleRate, HOST_TARGET_DBFS)
  const before = 20 * Math.log10(rms(src) + 1e-12)
  if (Math.abs(gain - 1) < 0.05) return null // 이미 맞으면 건드리지 않는다

  const pcm = new Int16Array(src.length)
  for (let i = 0; i < src.length; i++) {
    const v = Math.max(-1, Math.min(1, src[i] * gain))
    pcm[i] = Math.round(v * 32767)
  }

  const encoded = encodeMp3(pcm)
  const out = new Uint8Array(headBytes.length + encoded.length + restBytes.length)
  out.set(headBytes, 0)
  out.set(encoded, headBytes.length)
  out.set(restBytes, headBytes.length + encoded.length)

  const after = new Float32Array(src.length)
  for (let i = 0; i < src.length; i++) after[i] = src[i] * gain

  return {
    blob: new Blob([out.buffer as ArrayBuffer], { type: 'audio/mpeg' }),
    beforeDb: before,
    afterDb: 20 * Math.log10(rms(after) + 1e-12),
    gainDb: 20 * Math.log10(gain),
    keptBytes: restBytes.length,
  }
}

/** 유성 구간 RMS — 보고용 (판단은 gainToTarget 안에서 한다) */
function rms(x: Float32Array): number {
  const frame = Math.round(SAMPLE_RATE * 0.05)
  const n = Math.floor(x.length / frame)
  if (n < 2) return 0
  const r: number[] = []
  let peak = 0
  for (let i = 0; i < n; i++) {
    let s = 0
    for (let j = 0; j < frame; j++) {
      const v = x[i * frame + j]
      s += v * v
    }
    const v = Math.sqrt(s / frame)
    r.push(v)
    if (v > peak) peak = v
  }
  const voiced = r.filter((v) => v > peak * 0.15)
  return voiced.length ? voiced.reduce((a, b) => a + b, 0) / voiced.length : 0
}
