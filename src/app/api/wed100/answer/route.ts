import { NextResponse } from 'next/server'

import { emailFromIdToken, verifyAdmin } from '@/lib/firebase/admin'
import {
  estimateDuration,
  getPublishedWed100Items,
  getWed100Item,
  getWed100Neighbors,
  paragraphStarts,
} from '@/lib/wed100'
import { getWed100Access, isMember, isOpen } from '@/lib/wed100Access'

export const runtime = 'nodejs'
/* 사람마다 답이 다르므로 절대 캐시하지 않는다 */
export const dynamic = 'force-dynamic'

const SLUG = /^[a-z0-9-]{2,40}$/

/**
 * 잠긴 문항의 본문을 인증된 사람에게만 내려준다.
 *
 * 문항 페이지 102개는 잠긴 모습 그대로 정적으로 구워 둔다. 서버에서 로그인
 * 여부를 보고 본문을 넣었다 뺐다 하면 사람마다 화면이 달라져 미리 구울 수
 * 없고, 그러면 오늘 잡은 속도가 도로 무너진다. 그래서 페이지는 잠긴 채로
 * 두고, 권한이 있는 사람만 이 API 로 본문을 따로 받아 채운다.
 *
 * 크롤러는 토큰이 없으니 잠긴 화면만 본다 — 사람과 크롤러에게 다른 것을
 * 보여 주는 행위(클로킹)가 아니라, 로그인한 사람에게만 더 주는 것이다.
 *
 * POST { slug, idToken }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const slug = String(body?.slug ?? '')
  if (!SLUG.test(slug)) {
    return NextResponse.json({ ok: false, error: '문항을 찾을 수 없습니다.' }, { status: 400 })
  }

  const access = await getWed100Access()

  // 원래 열려 있는 문항이면 굳이 이 길로 올 이유가 없다
  if (isOpen(access, slug)) {
    return NextResponse.json({ ok: false, error: '이미 공개된 문항입니다.' }, { status: 400 })
  }

  const idToken = typeof body?.idToken === 'string' ? body.idToken : ''
  if (!idToken) {
    return NextResponse.json({ ok: false, error: '로그인이 필요합니다.' }, { status: 401 })
  }

  let email: string | null = null
  try {
    email = await emailFromIdToken(idToken)
  } catch {
    email = null
  }
  if (!email) {
    return NextResponse.json({ ok: false, error: '로그인 정보를 확인하지 못했습니다.' }, { status: 401 })
  }

  // 관리자는 명단에 없어도 본다 — 원고를 확인해야 하기 때문
  const allowed = isMember(access, email) || (await verifyAdmin({ idToken })) !== null
  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: `${email} 계정은 아직 전체 열람 권한이 없습니다.`,
        email,
      },
      { status: 403 },
    )
  }

  const item = await getWed100Item(slug)
  if (!item) {
    return NextResponse.json({ ok: false, error: '문항을 찾을 수 없습니다.' }, { status: 404 })
  }

  const all = await getPublishedWed100Items()
  const { prev, next } = await getWed100Neighbors(slug)
  const samePart = all.filter((x) => x.part === item.part)

  const nav = (x: typeof item | null | undefined) =>
    x
      ? {
          slug: x.slug,
          question: x.question,
          thumb: x.thumbImage ?? `/wed100/img/${x.slug}-thumb.svg`,
          href: `/honjoo100/${x.slug}`,
        }
      : null

  return NextResponse.json({
    ok: true,
    email,
    player: {
      slug: item.slug,
      part: item.part,
      partTitle: item.partTitle,
      n: item.n,
      question: item.question,
      questionEn: item.question_en ?? '',
      cues: item.cues,
      paraStarts: paragraphStarts(item.answer, item.cues),
      keywords: item.keywords,
      heroImage: item.heroImage ?? `/wed100/img/${item.slug}-hero.svg`,
      audio: item.audio,
      questionAudio: item.questionAudio,
      duration: estimateDuration(item),
      prev: nav(prev),
      next: nav(next),
      partIndex: samePart.findIndex((x) => x.slug === item.slug) + 1,
      partTotal: samePart.length,
    },
  })
}
