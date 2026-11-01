import { NextResponse } from 'next/server'

import { SURVEY_COLLECTION, SURVEY_EVENTS, choiceKey } from '@/lib/surveyStats'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 설문 단계 기록 (익명). 화면은 응답을 기다리지 않으므로 늘 204 로 끝낸다.
 * 봇 판별은 /api/track 과 같은 기준 — UA 는 판별에만 쓰고 저장하지 않는다.
 *
 * POST { e: 단계, v?: 고른 답(who·worry 일 때) }
 */
const BOT_UA =
  /bot|crawl|spider|scrap|slurp|headless|lighthouse|pagespeed|yeti|daumoa|googleother|bingpreview|facebookexternalhit|fetch|curl|python|wget|phantom|selenium|puppeteer|playwright/i
const DAY = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  )

export async function POST(req: Request) {
  const ua = req.headers.get('user-agent')
  const body = await req.json().catch(() => ({}))
  const e = String(body?.e ?? '')
  if (!ua || BOT_UA.test(ua) || !SURVEY_EVENTS.includes(e)) return new NextResponse(null, { status: 204 })
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const db = await getAdminDb()
    if (db) {
      const { FieldValue } = await import('firebase-admin/firestore')
      const patch: Record<string, unknown> = { [e]: FieldValue.increment(1), updatedAt: new Date().toISOString() }
      const v = typeof body?.v === 'string' ? body.v : ''
      if (v && (e === 'who' || e === 'worry')) patch[`${e}Choice`] = { [choiceKey(v)]: FieldValue.increment(1) }
      await db.collection(SURVEY_COLLECTION).doc(DAY()).set(patch, { merge: true })
    }
  } catch {
    /* 통계 실패는 손님 화면과 무관하다 */
  }
  return new NextResponse(null, { status: 204 })
}
