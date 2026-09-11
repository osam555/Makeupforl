import { NextResponse } from 'next/server'

import { verifyAdmin } from '@/lib/firebase/admin'
import {
  DEFAULT_RANK,
  READINESS_FORMULA,
  todayKST,
  type SeoKeyword,
  type SeoPriority,
  type SeoRank,
  type SeoTodo,
} from '@/lib/seoKeywords'
import {
  SEO_CONFIG_DOC,
  SEO_KEYWORDS_DOC,
  SEO_TODOS_DOC,
  getSeoKeywords,
} from '@/lib/seoKeywords.server'

export const runtime = 'nodejs'

/**
 * 검색어 순위 기록 저장.
 *
 * 순위는 밖에서 재야 아는 값이라 사람이 적어 넣는다. 잰 날짜를 함께 받는 이유는,
 * 오래된 숫자를 지금 값처럼 보는 일을 막기 위해서다.
 *
 * POST { idToken, ranks: { [검색어]: { naver, google, checkedAt, goal, note } } }
 * POST { idToken, action: 'keywords', keywords: SeoKeyword[] }
 * POST { idToken, action: 'snapshot', readiness, naver, google }
 * POST { idToken, action: 'todos', todos: SeoTodo[] }
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
          // 자가 바뀐 날 그래프가 꺾이는 이유를 나중에 알 수 있게 함께 남긴다
          formula: READINESS_FORMULA,
          readiness: body?.readiness ?? {},
          /*
            순위는 안 보냈으면 안 건드린다.

            첫 화면은 준비도만 보내는데, 여기서 naver: {} 를 같이 쓰고 있었다.
            그날 순위 저장이 남긴 값이 그 빈 맵에 가려질 길이라, 있는 것만 적는다.
          */
          ...(hasKeys(body?.naver) ? { naver: body.naver } : {}),
          ...(hasKeys(body?.google) ? { google: body.google } : {}),
          at: new Date().toISOString(),
        },
        { merge: true },
      )
    return NextResponse.json({ ok: true, date })
  }

  /* SEO 할 일 — 목록을 통째로 받아 통째로 쓴다. 몇 줄 안 되고 두 사람이 동시에 고칠 일이 없다 */
  if (body?.action === 'todos') {
    const rows = Array.isArray(body?.todos) ? (body.todos as Partial<SeoTodo>[]) : null
    if (!rows) return NextResponse.json({ ok: false, error: '할 일 목록이 없습니다.' }, { status: 400 })
    const items: SeoTodo[] = []
    for (const r of rows) {
      const text = String(r.text ?? '').trim().slice(0, 300)
      if (!text) continue
      const due = String(r.due ?? '').trim()
      if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) {
        return NextResponse.json(
          { ok: false, error: `기한은 2026-10-02 형식으로 적어 주세요: ${text.slice(0, 20)}` },
          { status: 400 },
        )
      }
      items.push({
        id: String(r.id ?? '').trim() || Math.random().toString(36).slice(2, 10),
        text,
        ...(due ? { due } : {}),
        ...(r.who ? { who: String(r.who).trim().slice(0, 40) } : {}),
        done: r.done === true,
        ...(r.done === true ? { doneAt: String(r.doneAt ?? '').trim() || todayKST() } : {}),
        ...(r.note ? { note: String(r.note).trim().slice(0, 300) } : {}),
      })
    }
    await db
      .collection(SEO_TODOS_DOC.collection)
      .doc(SEO_TODOS_DOC.doc)
      .set({ items, updatedAt: new Date().toISOString(), updatedBy: editor }, { merge: true })
    return NextResponse.json({ ok: true, saved: items.length, editor })
  }

  /*
    목표 검색어 목록 저장.

    전에는 목록이 코드에만 있어서 검색어 하나를 더하려면 배포를 해야 했다. 노릴 말을
    정하는 것은 장사 판단이라 개발자를 거치게 하면 목록이 안 바뀐다.

    순위와 다른 문서에 넣는다(seo-keywords). 목록은 가끔 통째로 갈고 순위는 자주
    조금씩 고치는데, 한 문서에 두면 한쪽을 저장할 때 다른 쪽을 덮어쓸 길이 생긴다.
  */
  if (body?.action === 'keywords') {
    const rows = Array.isArray(body?.keywords) ? (body.keywords as Partial<SeoKeyword>[]) : null
    if (!rows) {
      return NextResponse.json({ ok: false, error: '검색어 목록이 없습니다.' }, { status: 400 })
    }

    const seen = new Set<string>()
    const items: SeoKeyword[] = []
    for (const r of rows) {
      const term = String(r.term ?? '').trim()
      if (!term) continue
      /*
        같은 말이 두 줄이면 뒤엣것이 앞엣것의 순위를 가린다 — 순위와 준비도가 모두
        term 을 열쇠로 쓰기 때문이다. 저장할 때 막는 편이 낫다.
      */
      if (seen.has(term)) {
        return NextResponse.json(
          { ok: false, error: `'${term}' 이 두 번 있습니다. 검색어는 한 줄씩만 둘 수 있습니다.` },
          { status: 400 },
        )
      }
      seen.add(term)

      const volume = Number(r.volume)
      const pr = Number(r.priority)
      const measuredAt = String(r.measuredAt ?? '').trim()
      if (measuredAt && !/^\d{4}-\d{2}-\d{2}$/.test(measuredAt)) {
        return NextResponse.json(
          { ok: false, error: `잰 날짜는 2026-09-11 형식으로 적어 주세요: ${term}` },
          { status: 400 },
        )
      }
      items.push({
        term,
        volume: Number.isFinite(volume) && volume >= 0 ? Math.round(volume) : 0,
        owner: String(r.owner ?? '').trim(),
        why: String(r.why ?? '').trim().slice(0, 300),
        priority: ([1, 2, 3].includes(pr) ? pr : 2) as SeoPriority,
        ...(measuredAt ? { measuredAt } : {}),
      })
    }

    if (!items.length) {
      return NextResponse.json(
        {
          ok: false,
          error:
            '검색어가 하나도 없습니다. 빈 목록을 저장하면 화면이 시드로 되돌아가 헷갈립니다.',
        },
        { status: 400 },
      )
    }

    await db
      .collection(SEO_KEYWORDS_DOC.collection)
      .doc(SEO_KEYWORDS_DOC.doc)
      .set({ items, updatedAt: new Date().toISOString(), updatedBy: editor }, { merge: true })

    return NextResponse.json({ ok: true, saved: items.length, editor })
  }

  const incoming = (body?.ranks ?? {}) as Record<string, Partial<SeoRank>>
  const num = (v: unknown): number | null => {
    if (v === null || v === '' || v === undefined) return null
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }

  // 순위는 지금 살아 있는 목록을 기준으로 추린다 — 코드 시드가 아니다
  const keywords = await getSeoKeywords()
  const ranks: Record<string, SeoRank> = {}
  for (const t of keywords) {
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

  /*
    순위 추이.

    site_config/seo 는 "지금 몇 위인가" 하나만 들고 있어서, 다음에 재서 덮어쓰면
    지난 값은 사라졌다. 잰 날(checkedAt) 이름의 기록 문서에 검색어별 순위를 함께
    남긴다 — 저장한 날이 아니라 **잰 날**이다. 아침에 재고 저녁에 적어도 아침 값이고,
    지난주 것을 이제야 옮겨 적어도 지난주 자리에 들어간다.

    잰 날이 없는 검색어는 남기지 않는다. 날짜 없는 순위는 추이에 놓을 자리가 없다.
    못 찾음(null)은 남긴다 — 3페이지까지 봤는데 없었다는 것도 그날의 사실이다.
    merge 라 같은 날 다른 검색어의 값이나 준비도 기록은 건드리지 않는다.
  */
  const byDate: Record<string, { naver: Record<string, number | null>; google: Record<string, number | null> }> = {}
  for (const [term, r] of Object.entries(ranks)) {
    if (!r.checkedAt) continue
    const d = (byDate[r.checkedAt] ??= { naver: {}, google: {} })
    d.naver[term] = r.naver
    d.google[term] = r.google
  }
  const ranksAt = new Date().toISOString()
  await Promise.all(
    Object.entries(byDate).map(([date, d]) =>
      db.collection('seo_snapshots').doc(date).set({ date, ...d, ranksAt }, { merge: true }),
    ),
  )

  return NextResponse.json({ ok: true, saved: Object.keys(ranks).length, editor })
}

const hasKeys = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && Object.keys(v as object).length > 0
