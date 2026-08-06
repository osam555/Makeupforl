import { randomUUID } from 'node:crypto'

import { NextResponse } from 'next/server'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

import { SILENCE_MP3_BASE64 } from '@/lib/tts/silence'
import { getAdminApp, verifyAdmin } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

/** scripts/wed100/3_gen_tts.py 와 동일한 화자 설정 (음성 일관성 유지) */
const VOICE = 'ko-KR-SunHiNeural'
const HOST = { rate: '+6%', pitch: '+18Hz' } // 진행자: 질문
const EXPERT = { rate: '+25%', pitch: '-6Hz' } // 원장님: 답변 (1.25배속)

const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
/** CBR 48kbps → 1초당 6000바이트. ffmpeg 없이 길이를 정확히 계산할 수 있다. */
const BYTES_PER_SEC = 6000
const CONCURRENCY = 6

const SILENCE = Buffer.from(SILENCE_MP3_BASE64, 'base64')
const SILENCE_SEC = SILENCE.length / BYTES_PER_SEC

async function synth(text: string, opt: { rate: string; pitch: string }): Promise<Buffer> {
  const tts = new MsEdgeTTS()
  await tts.setMetadata(VOICE, FORMAT)
  const { audioStream } = await tts.toStream(text, opt)
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    audioStream.on('data', (c: Buffer) => chunks.push(c))
    audioStream.on('end', () => resolve(Buffer.concat(chunks)))
    audioStream.on('error', reject)
  })
}

/** 동시 실행 수를 제한해 순서를 지키면서 병렬 합성 */
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T, i: number) => Promise<R>) {
  const out = new Array<R>(items.length)
  let cursor = 0
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++
        out[i] = await fn(items[i], i)
      }
    }),
  )
  return out
}

/**
 * 어드민 [음성 재생성] — 질문 + 자막 큐를 다시 합성해 MP3와 타임코드를 돌려준다.
 * 업로드(Storage)와 저장(Firestore)은 로그인한 클라이언트가 수행한다.
 *
 * POST { password?|idToken?, question, cues: string[] }
 *  → { audioBase64, duration, questionAudio:{start,end}, cues:[{start,end}] }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ password: body?.password, idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json({ ok: false, error: '관리자만 사용할 수 있습니다.' }, { status: 401 })
  }

  const question: string = typeof body?.question === 'string' ? body.question.trim() : ''
  const cues: string[] = Array.isArray(body?.cues)
    ? body.cues.map((c: unknown) => String(c ?? '').trim()).filter(Boolean)
    : []

  if (!question || cues.length === 0) {
    return NextResponse.json({ ok: false, error: '질문과 자막이 필요합니다.' }, { status: 400 })
  }
  if (cues.length > 40) {
    return NextResponse.json(
      { ok: false, error: `자막이 ${cues.length}개로 너무 많습니다. 40개 이하로 나눠 주세요.` },
      { status: 400 },
    )
  }

  try {
    const [qBuf, cueBufs] = await Promise.all([
      synth(question, HOST),
      mapLimit(cues, CONCURRENCY, (t) => synth(t, EXPERT)),
    ])

    const parts: Buffer[] = [qBuf]
    let t = qBuf.length / BYTES_PER_SEC
    const questionAudio = { start: 0, end: round(t) }
    const timings: { start: number; end: number }[] = []

    for (const buf of cueBufs) {
      parts.push(SILENCE)
      t += SILENCE_SEC
      const start = t
      parts.push(buf)
      t += buf.length / BYTES_PER_SEC
      timings.push({ start: round(start), end: round(t) })
    }

    const audio = Buffer.concat(parts)

    // 서비스 계정이 있으면 서버가 Storage 에 직접 올린다 (비밀번호 로그인도 가능해짐)
    let audioUrl: string | null = null
    const slug = typeof body?.slug === 'string' ? body.slug : ''
    const app = await getAdminApp()
    if (app && slug) {
      try {
        const { getStorage } = await import('firebase-admin/storage')
        const bucketName =
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
          `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
        const path = `wed100/audio/${slug}.mp3`
        const file = getStorage(app).bucket(bucketName).file(path)
        // 다운로드 토큰 방식 — 균일한 버킷 수준 액세스(uniform access)에서도 동작한다
        const token = randomUUID()
        await file.save(audio, {
          contentType: 'audio/mpeg',
          metadata: {
            cacheControl: 'public,max-age=31536000',
            metadata: { firebaseStorageDownloadTokens: token },
          },
        })
        audioUrl =
          `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/` +
          `${encodeURIComponent(path)}?alt=media&token=${token}`
      } catch {
        audioUrl = null // 업로드 실패 시 클라이언트가 base64 로 처리
      }
    }

    return NextResponse.json({
      ok: true,
      audioUrl,
      audioBase64: audioUrl ? null : audio.toString('base64'),
      bytes: audio.length,
      duration: round(audio.length / BYTES_PER_SEC),
      questionAudio,
      cues: timings,
    })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: '음성 합성 실패: ' + (e instanceof Error ? e.message : String(e)) },
      { status: 500 },
    )
  }
}

function round(n: number) {
  return Math.round(n * 1000) / 1000
}
