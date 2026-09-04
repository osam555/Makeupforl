import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { WED100_CONFIG_DOC } from '@/lib/wed100Access'

export const runtime = 'nodejs'

const SLUG = /^[a-z0-9-]{2,40}$/

/**
 * 100문100답 공개 범위 저장.
 *
 * POST { password?|idToken?, paywall?, freeQna?, storeUrl?, notice? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ password: body?.password, idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json({ ok: false, error: '관리자만 사용할 수 있습니다.' }, { status: 401 })
  }

  const db = await getAdminDb()
  if (!db) {
    return NextResponse.json({ ok: false, error: '서버에서 Firestore 를 쓸 수 없습니다.' }, { status: 503 })
  }

  const patch: Record<string, unknown> = {}

  if ('paywall' in body) patch.paywall = body.paywall === true

  if ('freeQna' in body) {
    if (!Array.isArray(body.freeQna) || body.freeQna.some((x: unknown) => !SLUG.test(String(x ?? '')))) {
      return NextResponse.json({ ok: false, error: '문항 목록이 올바르지 않습니다.' }, { status: 400 })
    }
    patch.freeQna = [...new Set(body.freeQna.map(String))]
  }

  if ('storeUrl' in body) {
    const u = String(body.storeUrl ?? '').trim()
    if (u && !/^https:\/\//.test(u)) {
      return NextResponse.json({ ok: false, error: '구매 주소는 https 로 시작해야 합니다.' }, { status: 400 })
    }
    patch.storeUrl = u
  }

  if ('notice' in body) patch.notice = String(body.notice ?? '').slice(0, 400)

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: '저장할 내용이 없습니다.' }, { status: 400 })
  }

  patch.updatedAt = new Date().toISOString()
  patch.updatedBy = editor
  await db.collection(WED100_CONFIG_DOC.collection).doc(WED100_CONFIG_DOC.doc).set(patch, { merge: true })

  // 공개 범위가 바뀌면 문항 페이지가 전부 달라진다
  revalidatePath('/honjoo100', 'layout')
  revalidatePath('/')
  revalidatePath('/sitemap.xml')
  return NextResponse.json({ ok: true, ...patch, editor })
}
