import { NextResponse } from 'next/server'

import { verifyAdmin } from '@/lib/firebase/admin'
import { SEO_TARGETS, DEFAULT_RANK, todayKST, type SeoRank } from '@/lib/seoTargets'
import { SEO_CONFIG_DOC } from '@/lib/seoTargets.server'

export const runtime = 'nodejs'

/**
 * 검색어 순위 기록 저장.
 *
 * 순위는 밖에서 재야 아는 값이라 사람이 적어 넣는다. 잰 날짜를 함께 받는 이유는,
 * 오래된 숫자를 지금 값처럼 보는 일을 막기 위해서다.
 *
 * POST { idToken, ranks: { [검색어]: { naver, google, checkedAt, goal, note } } }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json({ ok: false, error: '관리자만 사용할 수 있습니다.' }, { status: 401 })
  }

  const { getAdminDb } = await import('@/lib/firebase/admin')
  const db = await getAdminDb()
  if (!db) {
    return NextResponse.json(
      { ok: false, error: '서버에서 Firestore 를 쓸 수 없습니다.' },
      { status: 503 },
    )
  }

  /*
    하루치 기록.

    문서 이름이 날짜라 하루에 몇 번을 불러도 덮어쓰기만 된다. 그래서 화면이
    열릴 때마다 부담 없이 부를 수 있고, 어드민을 안 여는 날은 기록이 비는데
    그건 그대로 사실이다 — 없는 날을 지어내지 않는다.
  */
  if (body?.action === 'snapshot') {
    const date = todayKST()
    await db
      .collection('seo_snapshots')
      .doc(date)
      .set(
        {
          date,
          readiness: body?.readiness ?? {},
          naver: body?.naver ?? {},
          google: body?.google ?? {},
          at: new Date().toISOString(),
        },
        { merge: true },
      )
    return NextResponse.json({ ok: true, date })
  }

  const incoming = (body?.ranks ?? {}) as Record<string, Partial<SeoRank>>
  const num = (v: unknown): number | null => {
    if (v === null || v === '' || v === undefined) return null
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }

  const ranks: Record<string, SeoRank> = {}
  for (const t of SEO_TARGETS) {
    const r = incoming[t.term] ?? {}
    const checkedAt = String(r.checkedAt ?? '').trim()
    if (checkedAt && !/^\d{4}-\d{2}-\d{2}$/.test(checkedAt)) {
      return NextResponse.json(
        { ok: false, error: `날짜는 2026-09-09 형식으로 적어 주세요: ${t.term}` },
        { status: 400 },
      )
    }
    ranks[t.term] = {
      naver: num(r.naver),
      google: num(r.google),
      checkedAt,
      goal: num(r.goal) ?? DEFAULT_RANK.goal,
      note: String(r.note ?? '').slice(0, 300),
    }
  }

  await db
    .collection(SEO_CONFIG_DOC.collection)
    .doc(SEO_CONFIG_DOC.doc)
    .set({ ranks, updatedAt: new Date().toISOString(), updatedBy: editor }, { merge: true })

  return NextResponse.json({ ok: true, saved: Object.keys(ranks).length, editor })
}
