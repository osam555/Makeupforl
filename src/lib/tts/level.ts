/**
 * MC 음성 음량 맞추기.
 *
 * Typecast(MC)는 edge-tts(원장님)보다 훨씬 조용하게 나온다. 실측하니
 * 원장님은 −17.8 LUFS 로 아주 일정한데(표준편차 0.2dB) MC 는 −24 ~ −30 LUFS 로
 * 문장마다 들쭉날쭉해서, 고정 이득으로는 맞출 수 없고 매번 재서 맞춰야 한다.
 *
 * 잣대는 LUFS 대신 **유성 구간 RMS** 를 쓴다. 두 방식을 23개 문항에서 대조해 보니
 * 차이가 평균 0.22dB, 최대 0.86dB 로 사실상 같았다. RMS 는 K-weighting 필터와
 * 게이팅이 필요 없어 서버와 브라우저 양쪽에서 똑같이 돌릴 수 있다.
 */

/** 원장님(edge-tts SunHi) 답변 구간의 유성 RMS — 23개 문항 실측 평균 */
export const HOST_TARGET_DBFS = -16.74
/** 이득을 올릴 때 이 피크를 넘지 않게 제한한다 */
export const PEAK_LIMIT_DBFS = -1.5
/** 이 이상은 올리지 않는다 — 무음에 가까운 입력에서 잡음까지 키우는 걸 막는다 */
const MAX_GAIN_DB = 18

/**
 * 유성 구간 RMS (dBFS). 50ms 프레임으로 나눠 가장 큰 프레임의 15% 를 넘는
 * 프레임만 평균한다 — 말 사이의 무음이 값을 끌어내리지 않게 하려는 것이다.
 */
export function voicedRmsDb(x: Float32Array, sampleRate: number): number {
  const frame = Math.max(1, Math.round(sampleRate * 0.05))
  const n = Math.floor(x.length / frame)
  if (n < 2) return -Infinity
  const rms = new Float64Array(n)
  let peak = 0
  for (let i = 0; i < n; i++) {
    let sum = 0
    for (let j = 0; j < frame; j++) {
      const v = x[i * frame + j]
      sum += v * v
    }
    rms[i] = Math.sqrt(sum / frame)
    if (rms[i] > peak) peak = rms[i]
  }
  const floor = peak * 0.15
  let acc = 0
  let cnt = 0
  for (let i = 0; i < n; i++) {
    if (rms[i] > floor) {
      acc += rms[i]
      cnt++
    }
  }
  if (!cnt) return -Infinity
  return 20 * Math.log10(acc / cnt + 1e-12)
}

/** 목표 음량에 맞추는 이득(배율). 피크 제한과 상한을 함께 건다. */
export function gainToTarget(
  x: Float32Array,
  sampleRate: number,
  targetDbfs = HOST_TARGET_DBFS,
): number {
  const cur = voicedRmsDb(x, sampleRate)
  if (!Number.isFinite(cur)) return 1
  const gainDb = Math.min(targetDbfs - cur, MAX_GAIN_DB)
  let gain = 10 ** (gainDb / 20)

  let peak = 0
  for (let i = 0; i < x.length; i++) {
    const v = Math.abs(x[i])
    if (v > peak) peak = v
  }
  const limit = 10 ** (PEAK_LIMIT_DBFS / 20)
  if (peak * gain > limit) gain = limit / Math.max(peak, 1e-12)
  return gain
}

/** Int16 PCM 을 목표 음량에 맞춘다 (제자리 수정 없이 새 배열을 돌려준다) */
export function normalizeInt16(pcm: Int16Array, sampleRate: number, targetDbfs?: number): Int16Array {
  const f = new Float32Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) f[i] = pcm[i] / 32768
  const gain = gainToTarget(f, sampleRate, targetDbfs)
  if (Math.abs(gain - 1) < 0.01) return pcm
  const out = new Int16Array(pcm.length)
  for (let i = 0; i < pcm.length; i++) {
    out[i] = Math.max(-32768, Math.min(32767, Math.round(pcm[i] * gain)))
  }
  return out
}
