import { NextResponse } from 'next/server'

import { getAdminDb } from '@/lib/firebase/admin'
import type { Wed100Item } from '@/types/wed100'

export const runtime = 'nodejs'

/**
 * 음성 파일 중계.
 *
 * Firebase Storage 는 CORS 헤더를 주지 않아서 브라우저가 직접 받아올 수 없다.
 * 어드민에서 음성을 손보려면 바이트가 필요하므로 서버가 대신 받아 넘긴다.
 *
 * 주소는 Firestore 에 저장된 것만 쓴다 — 쿼리로 임의 URL 을 받으면
 * 서버가 아무 데나 요청을 보내는 통로(SSRF)가 되기 때문이다.
 */
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') ?? ''
  if (!/^[a-z0-9-]{2,40}$/.test(slug)) {
    return NextResponse.json({ ok: false, error: '잘못된 문항입니다.' }, { status: 400 })
  }

  const db = await getAdminDb()
  if (!db) {
    return NextResponse.json({ ok: false, error: '서버에서 Firestore 를 쓸 수 없습니다.' }, { status: 503 })
  }

  const snap = await db.collection('wed100_questions').doc(slug).get()
  const audio = snap.exists ? (snap.data() as Wed100Item).audio : undefined
  if (!audio) {
    return NextResponse.json({ ok: false, error: '이 문항에는 음성이 없습니다.' }, { status: 404 })
  }
  if (!audio.startsWith('https://firebasestorage.googleapis.com/')) {
    return NextResponse.json({ ok: false, error: '중계할 수 없는 주소입니다.' }, { status: 400 })
  }

  const res = await fetch(audio, { cache: 'no-store' })
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: `원본을 받지 못했습니다 (${res.status})` }, { status: 502 })
  }
  return new NextResponse(res.body, {
    headers: { 'content-type': 'audio/mpeg', 'cache-control': 'no-store' },
  })
}
