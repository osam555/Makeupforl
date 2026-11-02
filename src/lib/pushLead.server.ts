import webpush from 'web-push'

import { getAdminDb } from '@/lib/firebase/admin'
import type { LeadMail } from './notifyLead.server'

/**
 * 상담 신청을 관리자 휴대폰에 웹 푸시로 알린다 (안드로이드 크롬·홈 화면 앱).
 *
 * 문자는 건당 돈이 들고 발신번호 심사가 필요하다. 웹 푸시는 무료이고, /admin/leads 에서
 * "이 기기에서 알림 받기" 를 한 번 누른 기기(push_subs)에 바로 간다.
 * 아이폰은 iOS 16.4+ 홈 화면 앱에서만 되므로 문자·메일을 함께 둔다.
 *
 * 만료된 구독(404·410)은 지운다 — 앱을 지웠거나 알림을 끈 기기에 계속 보내면 쌓이기만 한다.
 * 키가 없거나 실패해도 접수는 이미 저장됐으므로 로그만 남긴다.
 */
export async function pushLead(lead: LeadMail): Promise<void> {
  const pub = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return
  const db = await getAdminDb()
  if (!db) return
  try {
    webpush.setVapidDetails('mailto:makeupforl77@gmail.com', pub, priv)
    const snap = await db.collection('push_subs').get()
    const payload = JSON.stringify({
      title: `상담 신청 · ${lead.name}`,
      body: `${lead.phone} · 결혼식 ${lead.when}${lead.worry ? ` · ${lead.worry}` : ''}`,
      url: '/admin/leads',
    })
    await Promise.all(
      snap.docs.map(async (d) => {
        try {
          await webpush.sendNotification(d.data().sub, payload)
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode
          if (code === 404 || code === 410) await d.ref.delete()
          else console.error('consult-lead 푸시 실패', d.id, e)
        }
      }),
    )
  } catch (e) {
    console.error('consult-lead 푸시 실패', e)
  }
}
