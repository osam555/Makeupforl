import { createHmac, randomBytes } from 'node:crypto'

import type { LeadMail } from './notifyLead.server'

/**
 * 상담 신청을 휴대폰 문자로도 알린다 (솔라피).
 *
 * 메일은 원장님이 자주 열어 보지 않는다. 상담 신청은 그날 전화해야 의미가 있어 문자를 함께 보낸다.
 * 보내는 번호는 가게 대표번호(02-323-3321) — 손님 문의와 같은 번호라 원장님이 바로 알아본다.
 * 이 번호는 솔라피에 발신번호로 등록(통신서비스 이용증명원)해야 쓸 수 있다.
 *
 * SDK 대신 REST 를 직접 부른다. 인증은 솔라피 HMAC-SHA256: signature = HMAC(date + salt, secret).
 * 키가 없으면 건너뛰고, 실패해도 접수는 이미 저장됐으므로 로그만 남긴다.
 *
 * 받는 사람: LEAD_SMS_TO(쉼표 구분). 개인 휴대폰 번호라 코드에 적지 않는다.
 */
const digits = (s: string) => s.replace(/\D/g, '')

export async function smsLead(lead: LeadMail): Promise<void> {
  const key = process.env.SOLAPI_API_KEY
  const secret = process.env.SOLAPI_API_SECRET
  const to = (process.env.LEAD_SMS_TO || '').split(',').map(digits).filter(Boolean)
  if (!key || !secret || to.length === 0) return
  const from = digits(process.env.LEAD_SMS_FROM || '02-323-3321')

  // 짧게 — 90바이트(한글 45자)를 넘으면 장문(LMS)이 되어 값이 두세 배다
  const text = `[상담신청] ${lead.name} ${lead.phone} ${lead.when}${lead.worry ? ` ${lead.worry}` : ''}`

  const date = new Date().toISOString()
  const salt = randomBytes(16).toString('hex')
  const signature = createHmac('sha256', secret).update(date + salt).digest('hex')
  try {
    const r = await fetch('https://api.solapi.com/messages/v4/send-many/detail', {
      method: 'POST',
      headers: {
        authorization: `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${signature}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ messages: to.map((t) => ({ to: t, from, text })) }),
    })
    if (!r.ok) console.error('consult-lead 알림 문자 실패', r.status, await r.text().catch(() => ''))
  } catch (e) {
    console.error('consult-lead 알림 문자 실패', e)
  }
}
