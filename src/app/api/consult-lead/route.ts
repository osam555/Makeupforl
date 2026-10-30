import { NextResponse } from 'next/server'

import { getAdminDb } from '@/lib/firebase/admin'
import { notifyLead } from '@/lib/notifyLead.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 상담 신청 접수 (100문100답 안내 채팅 끝 단계).
 *
 * 이 사이트에서 처음으로 이름·전화번호를 받는 곳이다. /api/track 의 "식별 정보를 남기지
 * 않는다" 는 방문 기록 이야기이고, 이건 손님이 동의하고 직접 남긴 상담 신청이라 따로 둔다 —
 * 통계 문서와 섞지 않는다. 개인정보처리방침에 이 항목을 넣기 전에는 운영에 켜지 말 것.
 *
 * 쓰기는 이 라우트(Admin SDK)만 한다. consult_leads 는 보안 규칙에서 클라이언트 읽기·쓰기를
 * 모두 막는다. 받는 칸은 최소한으로: 이름·전화·결혼식 시기·고른 걱정.
 * IP·UA 는 저장하지 않는다.
 *
 * POST { name, phone, when, who, worry, agree: true, website: '' }
 * website 는 화면에 안 보이는 칸이다 — 채워져 오면 봇이라 조용히 성공한 척한다.
 */
const PHONE = /^01[016789]-?\d{3,4}-?\d{4}$/
const WHEN = ['한 달 안', '1~3개월', '3개월 넘게', '아직 미정']

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return NextResponse.json({ error: 'bad request' }, { status: 400 })
  if (body.website) return NextResponse.json({ ok: true })

  const name = String(body.name ?? '').trim().slice(0, 30)
  const phone = String(body.phone ?? '').replace(/\s/g, '')
  const when = String(body.when ?? '')
  if (!name || !PHONE.test(phone) || !WHEN.includes(when) || body.agree !== true) {
    return NextResponse.json({ error: '이름·휴대전화·시기와 동의를 확인해 주세요.' }, { status: 400 })
  }

  const db = await getAdminDb()
  // 키가 없는 로컬·미리보기에서는 저장하지 않는다 — 다른 저장 API 와 같은 503 길
  if (!db) {
    return NextResponse.json({ error: '지금은 접수할 수 없어요. 02-323-3321 로 전화 주세요.' }, { status: 503 })
  }

  const lead = {
    name,
    phone: phone.replace(/^(\d{3})-?(\d{3,4})-?(\d{4})$/, '$1-$2-$3'),
    when,
    who: String(body.who ?? '').slice(0, 30),
    worry: String(body.worry ?? '').slice(0, 60),
  }
  await db.collection('consult_leads').add({
    ...lead,
    source: 'honjoo100-chat',
    status: 'new',
    createdAt: new Date().toISOString(),
  })
  // 저장 뒤에 알린다 — 메일이 실패해도 접수는 남는다
  await notifyLead(lead)
  return NextResponse.json({ ok: true })
}
