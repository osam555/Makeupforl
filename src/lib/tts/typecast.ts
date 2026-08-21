import lamejs from '@breezystack/lamejs'

import { normalizeInt16 } from './level'

/**
 * 진행자(MC) 음성 — Typecast.
 *
 * edge-tts 의 한국어 여성 음성은 SunHi 하나뿐이라 MC 와 원장님을 다른 목소리로
 * 나눌 수가 없다. 그래서 MC 질문만 Typecast 로 합성한다.
 *
 * Typecast 는 44.1kHz WAV 로 주는데, 답변 구간(edge-tts)은 24kHz/48kbps mp3 라
 * 그대로 이어붙이면 재생 길이와 자막 타임코드가 어긋난다. 여기서 24kHz/48kbps
 * 모노 mp3 로 다시 인코딩해 규격을 맞춘다 (1초 = 6000바이트, CBR).
 *
 * 음량도 여기서 맞춘다 — Typecast 원본은 답변 구간보다 평균 9dB 조용하다.
 *
 * 환경변수
 *   TYPECAST_API_KEY   필수. 없으면 null 을 돌려주고 호출부가 edge-tts 로 폴백한다
 *   TYPECAST_VOICE_ID  기본값 Jinhee (아나운서 톤 한국어 여성)
 */
const API_URL = 'https://api.typecast.ai/v1/text-to-speech'

export const TYPECAST_ENABLED = !!process.env.TYPECAST_API_KEY
const VOICE_ID = process.env.TYPECAST_VOICE_ID || 'tc_6731b2b2478a48710ecc9158'
const MODEL = process.env.TYPECAST_MODEL || 'ssfm-v30'
const EMOTION = process.env.TYPECAST_EMOTION || 'normal'

const TARGET_RATE = 24000
const TARGET_KBPS = 48

/** WAV(PCM 16bit) 파싱 — 청크를 훑어 fmt/data 를 찾는다 */
function parseWav(buf: Buffer): { rate: number; channels: number; pcm: Int16Array } {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Typecast 응답이 WAV 형식이 아닙니다.')
  }
  let pos = 12
  let rate = 44100
  let channels = 1
  let bits = 16
  let pcm: Int16Array | null = null

  while (pos + 8 <= buf.length) {
    const id = buf.toString('ascii', pos, pos + 4)
    const size = buf.readUInt32LE(pos + 4)
    const body = pos + 8
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(body + 2)
      rate = buf.readUInt32LE(body + 4)
      bits = buf.readUInt16LE(body + 14)
    } else if (id === 'data') {
      const end = Math.min(body + size, buf.length)
      if (bits !== 16) throw new Error(`지원하지 않는 WAV 비트심도: ${bits}`)
      const n = (end - body) >> 1
      pcm = new Int16Array(n)
      for (let i = 0; i < n; i++) pcm[i] = buf.readInt16LE(body + i * 2)
    }
    pos = body + size + (size % 2) // 청크는 짝수 바이트 정렬
  }
  if (!pcm) throw new Error('WAV data 청크를 찾지 못했습니다.')
  return { rate, channels, pcm }
}

/** 스테레오 → 모노 */
function toMono(pcm: Int16Array, channels: number): Int16Array {
  if (channels <= 1) return pcm
  const n = Math.floor(pcm.length / channels)
  const out = new Int16Array(n)
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let c = 0; c < channels; c++) sum += pcm[i * channels + c]
    out[i] = sum / channels
  }
  return out
}

/** 선형 보간 리샘플링 — 음성 대역에서는 충분히 깨끗하다 */
function resample(pcm: Int16Array, from: number, to: number): Int16Array {
  if (from === to) return pcm
  const ratio = from / to
  const n = Math.floor(pcm.length / ratio)
  const out = new Int16Array(n)
  for (let i = 0; i < n; i++) {
    const x = i * ratio
    const i0 = Math.floor(x)
    const i1 = Math.min(i0 + 1, pcm.length - 1)
    const t = x - i0
    out[i] = pcm[i0] * (1 - t) + pcm[i1] * t
  }
  return out
}

function encodeMp3(pcm: Int16Array): Buffer {
  const enc = new lamejs.Mp3Encoder(1, TARGET_RATE, TARGET_KBPS)
  const chunks: Uint8Array[] = []
  const BLOCK = 1152
  for (let i = 0; i < pcm.length; i += BLOCK) {
    const block = pcm.subarray(i, Math.min(i + BLOCK, pcm.length))
    const out = enc.encodeBuffer(block)
    if (out.length) chunks.push(new Uint8Array(out))
  }
  const tail = enc.flush()
  if (tail.length) chunks.push(new Uint8Array(tail))
  return Buffer.concat(chunks.map((c) => Buffer.from(c)))
}

/**
 * MC 질문 합성. 키가 없으면 null → 호출부가 edge-tts 로 폴백한다.
 * 결과는 24kHz / 48kbps CBR / 모노 mp3 로, 답변 구간과 그대로 이어붙일 수 있다.
 */
export async function synthHost(text: string): Promise<Buffer | null> {
  const key = process.env.TYPECAST_API_KEY
  if (!key) return null

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      model: MODEL,
      voice_id: VOICE_ID,
      language: 'kor',
      prompt: { emotion_type: 'preset', emotion_preset: EMOTION },
      output: { audio_format: 'wav' },
    }),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Typecast ${res.status} — ${detail.slice(0, 200)}`)
  }

  const wav = Buffer.from(await res.arrayBuffer())
  const { rate, channels, pcm } = parseWav(wav)
  const mono = resample(toMono(pcm, channels), rate, TARGET_RATE)
  // Typecast 는 edge-tts 보다 9dB 쯤 조용하다. 답변 구간과 음량을 맞춘다.
  return encodeMp3(normalizeInt16(mono, TARGET_RATE))
}
