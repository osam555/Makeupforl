import { NextResponse } from 'next/server'

import { getAdminApp, getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import type { Wed100Item } from '@/types/wed100'

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * 음성이 본문보다 오래된 문항을 찾아 준다.
 *
 * 관리자에서 본문을 고쳐도 음성은 그대로 남는다. 그렇게 쌓이면 화면에는 새 글이,
 * 소리로는 옛 글이 나가는 문항이 생기는데 눈으로는 구분되지 않는다.
 * 그래서 두 가지를 본다.
 *
 *  - 자막이 본문과 다르면 → 본문을 고치고 [문장 재분할]을 안 한 것
 *  - Storage 의 음성 파일이 Firestore 의 updatedAt 보다 오래됐으면 → 음성만 안 만든 것
 *
 * 저장 직후에도 파일 기록 시각이 몇 초 어긋나므로 10분 여유를 둔다.
 *
 * POST { password?|idToken? } → { ok, rows:[{slug, question, reasons[], cues, sentences}] }
 */
const SLACK_MS = 10 * 60 * 1000

const norm = (s: string) => s.replace(/\s+/g, '')

/** 관리자 [문장 재분할]과 같은 기준 */
function splitSentences(text: string) {
  return text
    .split(/(?<=[.!?。！？])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ password: body?.password, idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json({ ok: false, error: '관리자만 사용할 수 있습니다.' }, { status: 401 })
  }

  const db = await getAdminDb()
  const app = await getAdminApp()
  if (!db || !app) {
    return NextResponse.json({ ok: false, error: '서버에서 Firebase 를 쓸 수 없습니다.' }, { status: 503 })
  }

  const { getStorage } = await import('firebase-admin/storage')
  const bucketName =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.appspot.com`
  const bucket = getStorage(app).bucket(bucketName)

  const snap = await db.collection('wed100_questions').get()
  const items = snap.docs.map((d) => ({ ...(d.data() as Wed100Item), slug: d.id }))

  // 음성 파일 시각은 목록 조회 한 번으로 모은다 (문항마다 조회하면 100번이 넘는다)
  const stamps = new Map<string, number>()
  try {
    const [files] = await bucket.getFiles({ prefix: 'wed100/audio/' })
    for (const f of files) {
      const updated = f.metadata?.updated
      if (typeof updated === 'string') {
        stamps.set(f.name.replace(/^wed100\/audio\//, '').replace(/\.mp3$/, ''), Date.parse(updated))
      }
    }
  } catch {
    // 목록을 못 읽어도 자막 불일치는 잡을 수 있으므로 계속 진행한다
  }

  const rows = items
    .map((it) => {
      const reasons: string[] = []
      const sentences = (it.answer ?? []).flatMap(splitSentences)
      const cueText = norm((it.cues ?? []).map((c) => c.ko ?? '').join(' '))

      if (cueText !== norm((it.answer ?? []).join(' '))) reasons.push('자막이 본문과 다름')

      if (!it.audio) {
        reasons.push('음성 없음')
      } else {
        // audioAt 이 정확하지만, 그 값을 쓰기 전에 만든 음성에는 없다.
        // 없으면 Storage 파일 기록 시각으로 대신한다.
        const made = it.audioAt ? Date.parse(it.audioAt) : (stamps.get(it.slug) ?? NaN)
        const edited = it.updatedAt ? Date.parse(it.updatedAt) : NaN
        if (Number.isFinite(made) && Number.isFinite(edited) && edited - made > SLACK_MS) {
          reasons.push('음성이 본문보다 오래됨')
        }
      }

      return {
        slug: it.slug,
        part: it.part ?? 0,
        question: it.question ?? '',
        cues: (it.cues ?? []).length,
        sentences: sentences.length,
        updatedAt: it.updatedAt ?? null,
        audioAt: it.audioAt ?? (stamps.has(it.slug) ? new Date(stamps.get(it.slug)!).toISOString() : null),
        reasons,
      }
    })
    .filter((r) => r.reasons.length > 0)
    .sort((a, b) => a.slug.localeCompare(b.slug))

  /*
    audioAt 을 쓰기 전에 만든 음성에는 이 값이 없다. 시각 비교를 매번 Storage 목록
    조회에 기대지 않도록, 찾기를 돌릴 때 비어 있는 문항만 파일 기록 시각으로 채운다.
    한 번 채워지면 이후로는 음성을 만들 때마다 스스로 갱신된다.
  */
  let filled = 0
  const missing = items.filter((it) => it.audio && !it.audioAt && stamps.has(it.slug))
  for (let i = 0; i < missing.length; i += 400) {
    const batch = db.batch()
    for (const it of missing.slice(i, i + 400)) {
      batch.update(db.collection('wed100_questions').doc(it.slug), {
        audioAt: new Date(stamps.get(it.slug)!).toISOString(),
      })
      filled++
    }
    await batch.commit()
  }

  return NextResponse.json({ ok: true, total: items.length, rows, filled, editor })
}
