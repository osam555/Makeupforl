import { NextResponse } from 'next/server'

import raw from '@/data/wed100.json'
import { adminConfigured, getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import type { Wed100Data, Wed100Item } from '@/types/wed100'

export const runtime = 'nodejs'
export const maxDuration = 60

const NOT_CONFIGURED =
  'FIREBASE_SERVICE_ACCOUNT 환경변수가 없어 서버에서 저장할 수 없습니다. ' +
  'FIREBASE_SETUP.md 7단계를 참고해 서비스 계정 키를 등록하거나, 관리자 구글 계정으로 로그인해 주세요.'

/** 저장할 필드만 추려 undefined 를 제거 (Firestore 는 undefined 를 거부) */
function toRow(item: Wed100Item, editor: string) {
  return {
    id: item.id,
    slug: item.slug,
    part: item.part,
    partTitle: item.partTitle,
    n: item.n,
    question: item.question,
    question_en: item.question_en ?? null,
    answer: item.answer ?? [],
    cues: (item.cues ?? []).map((c, i) => ({
      i,
      ko: c.ko,
      en: c.en ?? null,
      start: c.start ?? null,
      end: c.end ?? null,
    })),
    keywords: item.keywords ?? [],
    questionAudio: item.questionAudio ?? null,
    audio: item.audio ?? null,
    duration: item.duration ?? null,
    heroImage: item.heroImage ?? null,
    thumbImage: item.thumbImage ?? null,
    published: item.published ?? true,
    updatedAt: new Date().toISOString(),
    updatedBy: editor,
  }
}

/**
 * 어드민 저장 / 시드 — 비밀번호(8888) 또는 관리자 구글 계정 둘 다 허용.
 * 서버가 Admin SDK 로 직접 쓰므로 Firestore 보안 규칙과 무관하게 동작한다.
 *
 * POST { password?|idToken?, action: 'save'|'seed', item?, overwrite? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ password: body?.password, idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json(
      { ok: false, error: '인증 실패 — 비밀번호가 틀렸거나 관리자 계정이 아닙니다.' },
      { status: 401 },
    )
  }

  const db = await getAdminDb()
  if (!db) {
    return NextResponse.json(
      { ok: false, error: adminConfigured ? '서비스 계정 키를 읽을 수 없습니다.' : NOT_CONFIGURED },
      { status: 503 },
    )
  }

  try {
    if (body?.action === 'seed') {
      const data = raw as unknown as Wed100Data
      const overwrite = !!body?.overwrite

      let skip = new Set<string>()
      if (!overwrite) {
        const snap = await db.collection('wed100_questions').get()
        skip = new Set(snap.docs.map((d) => d.id))
      }
      const targets = data.items.filter((x) => !skip.has(x.slug))

      let upserted = 0
      for (let i = 0; i < targets.length; i += 400) {
        const batch = db.batch()
        for (const x of targets.slice(i, i + 400)) {
          batch.set(db.collection('wed100_questions').doc(x.slug), toRow(x, editor))
          upserted++
        }
        await batch.commit()
      }
      return NextResponse.json({ ok: true, upserted, skipped: skip.size, editor })
    }

    const item = body?.item as Wed100Item | undefined
    if (!item?.slug) {
      return NextResponse.json({ ok: false, error: '저장할 항목이 없습니다.' }, { status: 400 })
    }
    await db.collection('wed100_questions').doc(item.slug).set(toRow(item, editor))
    return NextResponse.json({ ok: true, slug: item.slug, editor })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e instanceof Error ? e.message : String(e)) },
      { status: 500 },
    )
  }
}
