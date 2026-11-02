/**
 * 상담 신청이 들어오면 원장님·매니저 메일로 알린다.
 *
 * 어드민 화면은 열어 봐야 보이는데, 상담 신청은 하루 안에 전화해야 의미가 있다.
 * 발송은 Resend REST 를 fetch 로 직접 부른다 — SDK 하나 때문에 의존성을 늘리지 않는다.
 *
 * RESEND_API_KEY 가 없으면 조용히 건너뛴다(로컬·미리보기). 메일이 실패해도 접수는 이미
 * 저장됐으므로 손님에게 오류를 보이지 않는다 — 실패는 로그로만 남긴다.
 *
 * 받는 사람: LEAD_NOTIFY_TO(쉼표 구분)로 덮어쓰고, 없으면 원장·매니저 두 사람.
 * 보내는 주소: LEAD_NOTIFY_FROM. makeupforl.co.kr 를 Resend 에서 인증해야 원장님 메일로 간다.
 */
const DEFAULT_TO = ['makeupforl77@gmail.com', 'john.wu571@gmail.com']

export interface LeadMail {
  name: string
  phone: string
  when: string
  who: string
  worry: string
}

export async function notifyLead(lead: LeadMail): Promise<void> {
  const key = process.env.RESEND_API_KEY
  if (!key) return
  const to = (process.env.LEAD_NOTIFY_TO || DEFAULT_TO.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  const from = process.env.LEAD_NOTIFY_FROM || '메이크업포엘 <noreply@makeupforl.co.kr>'
  const text = [
    `성함: ${lead.name}`,
    `휴대전화: ${lead.phone}`,
    `결혼식 시기: ${lead.when}`,
    lead.who ? `누구: ${lead.who}` : '',
    lead.worry ? `걱정: ${lead.worry}` : '',
    '',
    '목록: https://makeupforl.co.kr/admin/leads',
  ].join('\n')
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `[상담 신청] ${lead.name} · ${lead.when}`, text }),
    })
    if (!r.ok) console.error('consult-lead 알림 메일 실패', r.status, await r.text().catch(() => ''))
  } catch (e) {
    console.error('consult-lead 알림 메일 실패', e)
  }
}
