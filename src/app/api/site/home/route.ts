import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { HERO_QNA_MAX, HOME_CONFIG_DOC } from '@/lib/homeConfig'

export const runtime = 'nodejs'

const SLUG = /^[a-z0-9-]{2,40}$/

/** 중복을 걸러 낸 slug 목록 — 같은 질문이 두 번 도는 걸 막는다 */
function slugs(v: unknown, max: number): string[] | null {
  if (!Array.isArray(v)) return null
  const out: string[] = []
  for (const x of v) {
    const s = String(x ?? '').trim()
    if (!SLUG.test(s)) return null
    if (!out.includes(s)) out.push(s)
  }
  return out.slice(0, max)
}

/**
 * 홈에 노출할 100문100답 문항 설정 저장.
 *
 * POST { password?|idToken?, heroQna?: string[], sectionQna?: string[] }
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
  if ('heroQna' in body) {
    const v = slugs(body.heroQna, HERO_QNA_MAX)
    if (!v) return NextResponse.json({ ok: false, error: '문항 목록이 올바르지 않습니다.' }, { status: 400 })
    patch.heroQna = v
  }
  if ('sectionQna' in body) {
    const v = slugs(body.sectionQna, 12)
    if (!v) return NextResponse.json({ ok: false, error: '문항 목록이 올바르지 않습니다.' }, { status: 400 })
    patch.sectionQna = v
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: '저장할 내용이 없습니다.' }, { status: 400 })
  }

  patch.updatedAt = new Date().toISOString()
  patch.updatedBy = editor
  await db.collection(HOME_CONFIG_DOC.collection).doc(HOME_CONFIG_DOC.doc).set(patch, { merge: true })

  // 홈은 1시간 캐시라 이걸 하지 않으면 바뀐 게 한참 뒤에 보인다
  revalidatePath('/')
  return NextResponse.json({ ok: true, ...patch, editor })
}
