import { NextResponse } from 'next/server'

import { ADMIN_VIEWS, type AdminView } from '@/lib/adminViews'
import { ADMIN_LOADERS } from '@/lib/adminViews.server'
import { takeAuthError, verifyAdmin } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * 어드민 읽기 화면의 값 — 로그인을 확인한 뒤에만 준다.
 *
 * 읽기까지 POST 인 것은 idToken 을 본문으로 받기 때문이다(다른 어드민 라우트와 같은 모양).
 * 토큰을 주소줄에 실으면 브라우저 기록과 서버 로그에 그대로 남는다.
 *
 * Admin SDK 가 없어도 503 으로 막지 않는다. 읽는 함수들이 클라이언트 SDK·시드로
 * 폴백하므로 로컬에서도 화면이 그대로 떠야 한다 — 막는 것은 오직 "관리자인가" 다.
 *
 * POST { idToken, view: 'overview'|'visits'|'seo'|'wed100'|'proposals'|'worklog' }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { idToken?: string; view?: string }

  let editor: string | null = null
  try {
    editor = await verifyAdmin({ idToken: body?.idToken })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `인증 처리 중 오류 — ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    )
  }
  if (!editor) {
    const why = takeAuthError()
    return NextResponse.json(
      { ok: false, error: why ? `구글 로그인 확인 실패 — ${why}` : '관리자 계정이 아닙니다.' },
      { status: 401 },
    )
  }

  const view = body.view as AdminView
  if (!ADMIN_VIEWS.includes(view)) {
    return NextResponse.json({ ok: false, error: `모르는 화면입니다: ${body.view}` }, { status: 400 })
  }

  try {
    const data = await ADMIN_LOADERS[view]()
    return NextResponse.json(
      { ok: true, data },
      // 관리자 한 사람의 응답이 CDN·브라우저 캐시에 남아 남에게 가지 않게
      { headers: { 'cache-control': 'private, no-store' } },
    )
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
