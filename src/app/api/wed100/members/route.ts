import { NextResponse } from 'next/server'

import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { WED100_CONFIG_DOC, normalizeMembers } from '@/lib/wed100Access'
import { MEMBERS_COLLECTION, parseMemberInput } from '@/lib/wed100Members'

export const runtime = 'nodejs'

/**
 * 100문100답 이용권 회원 등록·삭제.
 *
 * POST { idToken, action: 'save', name, email, phone, until }
 * POST { idToken, action: 'delete', email }
 *
 * 저장할 때 공개 설정(site_config/wed100.members)에 같은 이메일이 있으면 거기서 뺀다 —
 * 옛 명단은 누구나 읽을 수 있는 문서라, 옮겨 오는 김에 공개된 이메일도 하나씩 줄인다.
 * 열람 권한은 getWed100Access 가 두 곳을 합쳐서 보므로 빼는 순간에도 끊기지 않는다.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json({ ok: false, error: '관리자만 사용할 수 있습니다.' }, { status: 401 })
  }
  const db = await getAdminDb()
  if (!db) {
    return NextResponse.json({ ok: false, error: '서버에서 Firestore 를 쓸 수 없습니다.' }, { status: 503 })
  }

  const col = db.collection(MEMBERS_COLLECTION)
  const configRef = db.collection(WED100_CONFIG_DOC.collection).doc(WED100_CONFIG_DOC.doc)
  const dropLegacy = async (email: string) => {
    const snap = await configRef.get()
    const legacy = normalizeMembers(snap.data()?.members)
    if (legacy.some((m) => m.email === email)) {
      await configRef.set({ members: legacy.filter((m) => m.email !== email) }, { merge: true })
    }
  }

  if (body?.action === 'delete') {
    const email = String(body.email ?? '').trim().toLowerCase()
    if (!email) return NextResponse.json({ ok: false, error: '이메일이 없습니다.' }, { status: 400 })
    await col.doc(email).delete()
    await dropLegacy(email)
    return NextResponse.json({ ok: true })
  }

  const v = parseMemberInput(body ?? {})
  if (!v.ok) return NextResponse.json({ ok: false, error: v.error }, { status: 400 })

  const now = new Date().toISOString()
  const ref = col.doc(v.email)
  const prev = await ref.get()
  await ref.set({
    name: v.name,
    email: v.email,
    phone: v.phone,
    until: v.until,
    createdAt: prev.exists ? (prev.data()?.createdAt ?? now) : now,
    updatedAt: now,
    updatedBy: editor,
  })
  await dropLegacy(v.email)
  return NextResponse.json({ ok: true, email: v.email, until: v.until, renewed: prev.exists })
}
