import { NextResponse } from 'next/server'

import { emailFromIdToken } from '@/lib/firebase/admin'
import { isMember } from '@/lib/wed100Access'
import { getWed100Access } from '@/lib/wed100Access.server'
import { clampSeconds } from '@/lib/wed100Usage'
import { addReadSeconds } from '@/lib/wed100Usage.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 회원 열람 시간 보고. 문항 화면을 내리거나 떠날 때 sendBeacon 으로 온다.
 * 응답을 아무도 기다리지 않으므로 늘 204 로 짧게 끝낸다 — 실패 이유를 알려 줄 상대가 없다.
 *
 * POST { slug, idToken, seconds }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const seconds = clampSeconds(body?.seconds)
  const idToken = typeof body?.idToken === 'string' ? body.idToken : ''
  if (seconds && idToken) {
    const email = await emailFromIdToken(idToken).catch(() => null)
    if (email && isMember(await getWed100Access(), email)) await addReadSeconds(email, seconds)
  }
  return new NextResponse(null, { status: 204 })
}
