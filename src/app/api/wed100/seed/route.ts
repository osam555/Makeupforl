import { NextResponse } from 'next/server'

import raw from '@/data/wed100.json'
import type { Wed100Data } from '@/types/wed100'

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'makeupforl77@gmail.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

/**
 * 시드 JSON -> Firestore 업서트 (어드민 [DB에 시드 넣기] 버튼)
 * POST /api/wed100/seed  { email: string, overwrite?: boolean }
 * - overwrite=false(기본): 이미 있는 slug 는 건너뜀 (어드민 수정 보존)
 * - overwrite=true: 전체 덮어쓰기
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body?.email === 'string' ? body.email.toLowerCase() : ''
  const overwrite = !!body?.overwrite

  if (!ADMIN_EMAILS.includes(email)) {
    return NextResponse.json(
      { ok: false, error: '관리자 계정으로 로그인한 뒤 다시 시도해 주세요.' },
      { status: 401 },
    )
  }

  const { getDb } = await import('@/lib/firebase/client')
  const db = getDb()
  if (!db) {
    return NextResponse.json(
      { ok: false, error: 'Firebase 환경변수(NEXT_PUBLIC_FIREBASE_*)가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }

  const { collection, doc, getDocs, writeBatch } = await import('firebase/firestore')
  const data = raw as unknown as Wed100Data

  let skip = new Set<string>()
  if (!overwrite) {
    const snap = await getDocs(collection(db, 'wed100_questions'))
    skip = new Set(snap.docs.map((d) => d.id))
  }

  const targets = data.items.filter((x) => !skip.has(x.slug))

  // Firestore 배치는 500개 제한 — 105개라 1배치로 충분하지만 안전하게 분할
  let upserted = 0
  for (let i = 0; i < targets.length; i += 400) {
    const batch = writeBatch(db)
    for (const x of targets.slice(i, i + 400)) {
      batch.set(doc(db, 'wed100_questions', x.slug), {
        ...x,
        cues: x.cues.map((c, ci) => ({
          i: ci,
          ko: c.ko,
          en: c.en ?? null,
          start: c.start ?? null,
          end: c.end ?? null,
        })),
        question_en: x.question_en ?? null,
        questionAudio: x.questionAudio ?? null,
        audio: x.audio ?? null,
        duration: x.duration ?? null,
        heroImage: null,
        thumbImage: null,
        published: true,
        updatedAt: new Date().toISOString(),
      })
      upserted++
    }
    await batch.commit()
  }

  return NextResponse.json({ ok: true, upserted, skipped: skip.size })
}
