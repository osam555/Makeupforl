import { NextResponse } from 'next/server'

import { emailFromIdToken, verifyAdmin } from '@/lib/firebase/admin'
import { findMember, isMember, todayKST } from '@/lib/wed100Access'
import { getWed100Access } from '@/lib/wed100Access.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 내 열람 권한 상태.
 *
 * 문항 안에서는 본문을 받아 오며 함께 알 수 있지만, 목록 페이지에서는
 * 물어볼 데가 없다. 구매 랜딩에서 넘어온 사람이 로그인할 자리를 찾으려면
 * 목록에서도 "지금 내 상태가 무엇인지"를 알아야 한다.
 *
 * POST { idToken }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const idToken = typeof body?.idToken === 'string' ? body.idToken : ''
  if (!idToken) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let email: string | null = null
  try {
    email = await emailFromIdToken(idToken)
  } catch {
    email = null
  }
  if (!email) {
    return NextResponse.json({ ok: false, error: '로그인 정보를 확인하지 못했습니다.' }, { status: 401 })
  }

  const access = await getWed100Access()
  const member = findMember(access, email)
  const admin = (await verifyAdmin({ idToken })) !== null

  return NextResponse.json({
    ok: true,
    email,
    admin,
    allowed: isMember(access, email) || admin,
    until: member?.until ?? null,
    // 명단에 있는데 못 보는 경우는 기간이 지난 것뿐이다
    expired: !!(member?.until && member.until < todayKST()),
  })
}
