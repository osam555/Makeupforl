import { NextResponse } from 'next/server'

import raw from '@/data/wed100.json'
import type { Wed100Data } from '@/types/wed100'

/**
 * 시드 JSON -> Supabase 업서트 (어드민 [DB에 시드 넣기] 버튼)
 * POST /api/wed100/seed  { password: string, overwrite?: boolean }
 * - overwrite=false(기본): 이미 있는 slug 는 건너뜀 (어드민 수정 보존)
 * - overwrite=true: 전체 덮어쓰기
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const password = body?.password
  const overwrite = !!body?.overwrite

  const expected = process.env.WED100_ADMIN_PASSWORD ?? '8888'
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json(
      { ok: false, error: 'Supabase 환경변수가 설정되지 않았습니다.' },
      { status: 500 },
    )
  }

  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const data = raw as unknown as Wed100Data

  let skip = new Set<string>()
  if (!overwrite) {
    const { data: existing } = await supabase.from('wed100_questions').select('slug')
    skip = new Set((existing ?? []).map((r: { slug: string }) => r.slug))
  }

  const rows = data.items
    .filter((x) => !skip.has(x.slug))
    .map((x) => ({
      id: x.id,
      slug: x.slug,
      part: x.part,
      partTitle: x.partTitle,
      n: x.n,
      question: x.question,
      question_en: x.question_en ?? null,
      answer: x.answer,
      cues: x.cues,
      keywords: x.keywords,
      questionAudio: x.questionAudio ?? null,
      audio: x.audio ?? null,
      duration: x.duration ?? null,
      published: true,
    }))

  if (rows.length === 0) {
    return NextResponse.json({ ok: true, upserted: 0, skipped: skip.size })
  }

  const { error } = await supabase.from('wed100_questions').upsert(rows, { onConflict: 'slug' })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, upserted: rows.length, skipped: skip.size })
}
