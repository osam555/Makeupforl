import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'

import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 관리자 기기의 웹 푸시 구독을 저장한다 (/admin/leads 의 "이 기기에서 알림 받기").
 *
 * 상담 신청 알림이 엉뚱한 기기로 가지 않게 관리자 로그인을 확인한다.
 * 문서 ID 는 endpoint 해시: 같은 기기가 여러 번 눌러도 한 줄로 남는다.
 *
 * POST { idToken, sub: PushSubscriptionJSON }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { idToken?: string; sub?: Record<string, unknown> } | null
  const email = await verifyAdmin({ idToken: body?.idToken ?? '' }).catch(() => null)
  if (!email) return NextResponse.json({ error: '관리자 계정이 아닙니다.' }, { status: 401 })

  const sub = body?.sub as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | undefined
  if (typeof sub?.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: '알림 구독 정보가 아닙니다.' }, { status: 400 })
  }

  const db = await getAdminDb()
  if (!db) return NextResponse.json({ error: '서버 키가 없어 저장할 수 없습니다.' }, { status: 503 })
  const id = createHash('sha256').update(sub.endpoint).digest('hex').slice(0, 40)
  await db.collection('push_subs').doc(id).set({ email, sub, createdAt: new Date().toISOString() })
  return NextResponse.json({ ok: true })
}
