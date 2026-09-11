import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 방문 기록.
 *
 * Vercel 웹 통계가 이미 붙어 있지만 그 숫자는 Vercel 화면에서만 보인다. 어드민에서
 * 검색어 준비도와 나란히 놓고 보려면 우리 쪽에도 있어야 한다.
 *
 * 사람을 식별하지 않는다. 쿠키를 쓰지 않고, 세션 구분은 브라우저 sessionStorage 의
 * 임의 문자열로만 한다 — 창을 닫으면 사라지고 우리는 그 값이 누구인지 알 수 없다.
 * IP·User-Agent 도 저장하지 않는다. 개인정보처리방침이 "전화·카톡 상담만 받는다" 로
 * 되어 있어, 방문 기록으로 사람을 알아볼 수 있게 만들면 그 말과 어긋난다.
 *
 * 저장은 날짜별 문서 하나에 증가값으로 쌓는다. 방문마다 문서를 만들면 금세 수만 건이
 * 되고, 어드민이 그걸 다 읽어야 한다.
 *
 * POST { path, kind: 'view'|'leave', sid, dwellMs?, ref? }
 */
const PATH = /^\/[^\s?#]{0,200}$/
const DAY = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())

/** Firestore 필드 이름에 쓸 수 없는 글자를 바꾼다 (/ 는 경로 구분자로 해석된다) */
const key = (p: string) => p.replace(/[~*/[\].]/g, '_').slice(0, 120) || '_'

/**
 * 어디서 왔나 — 도메인만 남긴다. 전체 주소에는 검색어가 붙어 오기도 한다.
 *
 * 네이버는 한 덩어리로 세지 않는다. 2026-09-11 하루에 네이버가 4 → 24 로 뛰었는데
 * "네이버" 하나로는 모바일 검색인지 PC 검색인지 플레이스(지도)인지 원장님 블로그인지
 * 알 길이 없었다 — Vercel 통계는 나눠 보여 주는데 우리 것만 뭉쳐 있었다. 혼주는
 * 대부분 휴대전화로 찾고, 플레이스 유입은 검색 순위가 아니라 스마트플레이스가 한 일이라
 * 같은 칸에 두면 무엇이 효과를 낸 건지 못 본다.
 */
function refSource(ref: string): string {
  if (!ref) return 'direct'
  try {
    const h = new URL(ref).hostname.replace(/^www\./, '')
    if (h.endsWith('makeupforl.co.kr')) return 'internal'
    if (/naver/.test(h)) {
      if (/place/.test(h)) return 'naver-place'
      if (/blog/.test(h)) return 'naver-blog'
      if (/cafe/.test(h)) return 'naver-cafe'
      if (/^m\./.test(h)) return 'naver-m'
      if (/search/.test(h)) return 'naver-pc'
      return 'naver'
    }
    if (/google/.test(h)) return 'google'
    if (/daum|kakao/.test(h)) return 'daum'
    if (/instagram|facebook/.test(h)) return 'sns'
    if (/youtube|youtu\.be/.test(h)) return 'youtube'
    return h.slice(0, 60)
  } catch {
    return 'direct'
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const path = String(body?.path ?? '')
  const kind = body?.kind === 'leave' ? 'leave' : 'view'
  if (!PATH.test(path) || path.startsWith('/admin') || path.startsWith('/api')) {
    // 관리자 화면은 세지 않는다. 우리가 들여다본 것이 숫자에 섞이면 안 된다
    return NextResponse.json({ ok: true, skipped: true })
  }

  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const db = await getAdminDb()
    if (!db) return NextResponse.json({ ok: false }, { status: 503 })

    const { FieldValue } = await import('firebase-admin/firestore')
    const ref = db.collection('analytics_daily').doc(DAY())
    const k = key(path)

    if (kind === 'view') {
      const isNewSession = body?.newSession === true
      await ref.set(
        {
          date: DAY(),
          views: FieldValue.increment(1),
          ...(isNewSession ? { visits: FieldValue.increment(1) } : {}),
          pages: { [k]: FieldValue.increment(1) },
          /*
            출처와 함께 **어느 페이지로 들어왔는지**도 쌓는다.

            출처 합계와 페이지 합계를 따로만 두면 "네이버가 늘었다" 까지는 보여도
            네이버가 어느 페이지를 보여 줘서 늘었는지는 영영 모른다. 첫 방문 한 번만
            세므로 출처 × 페이지 조합은 몇십 개를 넘지 않는다.
          */
          ...(isNewSession
            ? {
                sources: { [key(refSource(String(body?.ref ?? '')))]: FieldValue.increment(1) },
                landings: {
                  [`${key(refSource(String(body?.ref ?? '')))}__${k}`]: FieldValue.increment(1),
                },
              }
            : {}),
        },
        { merge: true },
      )
    } else {
      // 체류 시간은 합과 횟수를 따로 쌓아 나중에 평균을 낸다
      const ms = Number(body?.dwellMs)
      if (!Number.isFinite(ms) || ms < 1000 || ms > 30 * 60_000) {
        return NextResponse.json({ ok: true, skipped: true })
      }
      await ref.set(
        {
          date: DAY(),
          dwellMs: FieldValue.increment(Math.round(ms)),
          dwellCount: FieldValue.increment(1),
          pageDwellMs: { [k]: FieldValue.increment(Math.round(ms)) },
          pageDwellCount: { [k]: FieldValue.increment(1) },
        },
        { merge: true },
      )
    }
    return NextResponse.json({ ok: true })
  } catch {
    // 기록이 실패해도 화면에는 아무 일이 없어야 한다
    return NextResponse.json({ ok: false })
  }
}
