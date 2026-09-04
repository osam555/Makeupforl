import { randomUUID } from 'node:crypto'

import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts'

import { SILENCE_MP3_BASE64 } from '@/lib/tts/silence'
import { TYPECAST_ENABLED, synthHost as synthHostTypecast } from '@/lib/tts/typecast'
import { getAdminApp, getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

/** scripts/wed100/3_gen_tts.py 와 동일한 화자 설정 (음성 일관성 유지) */
const VOICE = 'ko-KR-SunHiNeural'
/** 진행자(질문) — TYPECAST_API_KEY 가 없을 때만 쓰는 폴백 */
const HOST = { rate: '+6%', pitch: '+18Hz' }
const EXPERT = { rate: '+25%', pitch: '-6Hz' } // 원장님: 답변 (1.25배속)

const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3
/** CBR 48kbps → 1초당 6000바이트. ffmpeg 없이 길이를 정확히 계산할 수 있다. */
const BYTES_PER_SEC = 6000
const CONCURRENCY = 6

const SILENCE = Buffer.from(SILENCE_MP3_BASE64, 'base64')
const SILENCE_SEC = SILENCE.length / BYTES_PER_SEC

const BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
const audioPath = (slug: string) => `wed100/audio/${slug}.mp3`

/**
 * 이미 만들어 둔 음성에서 질문 구간만 잘라 낸다.
 *
 * 답변만 고쳤을 때 질문까지 다시 만들 이유가 없다. Typecast 사용량이 들고,
 * 같은 문장이라도 합성할 때마다 억양이 조금씩 달라져 앞뒤가 어긋나 들린다.
 * 48kbps 고정 비트레이트라 초당 바이트 수가 일정해서 자를 지점을 정확히 계산할 수 있다.
 * 잘라 쓸 수 없으면 null 을 돌려주고 부르는 쪽이 새로 합성한다.
 */
async function sliceStoredQuestion(slug: string): Promise<Buffer | null> {
  try {
    const db = await getAdminDb()
    const app = await getAdminApp()
    if (!db || !app) return null

    const snap = await db.collection('wed100_questions').doc(slug).get()
    const end = snap.exists ? (snap.data() as { questionAudio?: { end?: number } }).questionAudio?.end : undefined
    if (typeof end !== 'number' || end <= 0) return null

    const { getStorage } = await import('firebase-admin/storage')
    const [buf] = await getStorage(app).bucket(BUCKET).file(audioPath(slug)).download()
    const bytes = Math.round(end * BYTES_PER_SEC)
    if (bytes <= 0 || bytes > buf.length) return null
    return buf.subarray(0, bytes)
  } catch {
    return null
  }
}

/** 어드민 [문장 재분할]과 같은 기준으로 문단을 문장 단위로 나눈다 */
function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((x) => x.trim())
    .filter(Boolean)
}

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
 * POST { password?|idToken?, slug?, question, cues: string[], reuseQuestion?, commit? }
 *  → { audioBase64, duration, questionAudio:{start,end}, cues:[{start,end}] }
 *
 * reuseQuestion — 질문은 새로 만들지 않고 기존 음성에서 잘라 쓴다. 원장 답변만 고쳤을 때
 *   질문까지 다시 만들면 Typecast 사용량이 들고 억양도 미묘하게 달라지기 때문이다.
 *   음성은 48kbps 고정 비트레이트라 questionAudio.end × 6000 바이트가 질문 구간과 정확히 맞는다.
 * commit — 결과를 Firestore 에 바로 반영한다. 여러 문항을 한 번에 돌릴 때
 *   문항마다 저장 요청을 따로 보내지 않아도 된다.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ password: body?.password, idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json({ ok: false, error: '관리자만 사용할 수 있습니다.' }, { status: 401 })
  }

  const slug: string = typeof body?.slug === 'string' ? body.slug : ''
  const reuseQuestion: boolean = body?.reuseQuestion === true && !!slug
  const commit: boolean = body?.commit === true && !!slug
  let question: string = typeof body?.question === 'string' ? body.question.trim() : ''
  let cues: string[] = Array.isArray(body?.cues)
    ? body.cues.map((c: unknown) => String(c ?? '').trim()).filter(Boolean)
    : []

  // fromAnswer — 자막 대신 지금 저장된 본문에서 문장을 나눠 쓴다.
  // 본문을 고치고 [문장 재분할]을 누르지 않은 문항이 있어서, 자막을 그대로 읽으면
  // 옛 글을 다시 녹음하게 된다. 일괄 재생성은 항상 본문을 기준으로 삼는다.
  if (body?.fromAnswer === true && slug) {
    const db = await getAdminDb()
    const snap = await db?.collection('wed100_questions').doc(slug).get()
    if (!snap?.exists) {
      return NextResponse.json({ ok: false, error: '없는 문항입니다.' }, { status: 404 })
    }
    const it = snap.data() as { question?: string; answer?: string[] }
    question = (it.question ?? '').trim()
    cues = (it.answer ?? []).flatMap(splitSentences)
  }

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
    // 질문(MC)은 Typecast, 답변은 edge-tts. 키가 없으면 질문도 edge-tts 로 폴백한다.
    const host = async () => {
      if (reuseQuestion) {
        const kept = await sliceStoredQuestion(slug)
        if (kept) return kept
      }
      if (TYPECAST_ENABLED) {
        const buf = await synthHostTypecast(question)
        if (buf) return buf
      }
      return synth(question, HOST)
    }
    const [qBuf, cueBufs] = await Promise.all([
      host(),
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
    const app = await getAdminApp()
    if (app && slug) {
      try {
        const { getStorage } = await import('firebase-admin/storage')
        const path = audioPath(slug)
        const file = getStorage(app).bucket(BUCKET).file(path)
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
          `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/` +
          `${encodeURIComponent(path)}?alt=media&token=${token}`
      } catch {
        audioUrl = null // 업로드 실패 시 클라이언트가 base64 로 처리
      }
    }

    // commit — 여러 문항을 한 번에 돌릴 때 저장 요청을 따로 보내지 않아도 되게 한다.
    // 음성 주소·길이·타임코드만 손대고 본문은 건드리지 않으므로 충돌 검사도 필요 없다.
    let saved = false
    if (commit && audioUrl) {
      const db = await getAdminDb()
      const ref = db?.collection('wed100_questions').doc(slug)
      const snap = await ref?.get()
      if (ref && snap?.exists) {
        const prev = (snap.data() as { cues?: { ko?: string; en?: string }[] }).cues ?? []
        await ref.update({
          audio: audioUrl,
          duration: round(audio.length / BYTES_PER_SEC),
          questionAudio,
          // 자막 글은 요청에 담긴 것을 기준으로 삼는다. 본문을 고치고 재분할하지 않은 문항이
          // 있어서, 부르는 쪽이 다시 나눈 결과가 Firestore 의 옛 자막보다 정확하다.
          // 영어 자막은 한국어가 그대로인 줄에서만 이어받는다 (문장이 갈라지면 짝이 어긋난다).
          // Firestore 는 undefined 를 거부하므로 값이 있을 때만 넣는다.
          cues: cues.map((ko, i) => {
            const en = prev[i]?.ko === ko ? prev[i]?.en : undefined
            return { i, ko, ...timings[i], ...(en ? { en } : {}) }
          }),
          // 본문이 아니라 음성을 바꾼 것이므로 updatedAt 이 아니라 audioAt 을 남긴다
          audioAt: new Date().toISOString(),
          audioBy: editor,
        })
        revalidatePath('/honjoo100')
        revalidatePath(`/honjoo100/${slug}`)
        saved = true
      }
    }

    return NextResponse.json({
      ok: true,
      saved,
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
