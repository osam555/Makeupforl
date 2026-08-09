import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { parseYoutubeId, resolveTitle, type VideoCategory } from '@/lib/videos'

export const runtime = 'nodejs'

const NOT_CONFIGURED =
  'FIREBASE_SERVICE_ACCOUNT 환경변수가 없어 서버에서 저장할 수 없습니다. FIREBASE_SETUP.md 를 참고해 서비스 계정 키를 등록해 주세요.'

interface SaveBody {
  password?: string
  idToken?: string
  action: 'upsert' | 'delete' | 'reorder' | 'channel' | 'resolve'
  url?: string
  item?: {
    youtubeId: string
    title?: string
    summary?: string | null
    publishedAt?: string | null
    category?: VideoCategory
    order?: number
    published?: boolean
  }
  items?: { youtubeId: string; order: number; category: VideoCategory }[]
  channel?: { url?: string; name?: string; channelId?: string; handle?: string }
}

/** 영상자료 어드민 저장 — 비밀번호(8888) 또는 관리자 구글 계정 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as SaveBody

  // 제목 조회는 인증 없이도 가능 (외부 데이터 조회일 뿐)
  if (body.action === 'resolve') {
    const id = parseYoutubeId(body.url ?? '')
    if (!id) return NextResponse.json({ ok: false, error: '유튜브 주소를 인식하지 못했습니다.' }, { status: 400 })
    const meta = await resolveTitle(id)
    return NextResponse.json({ ok: true, youtubeId: id, title: meta?.title ?? '', author: meta?.author ?? '' })
  }

  const editor = await verifyAdmin({ password: body.password, idToken: body.idToken })
  if (!editor) {
    return NextResponse.json(
      { ok: false, error: '인증 실패 — 비밀번호가 틀렸거나 관리자 계정이 아닙니다.' },
      { status: 401 },
    )
  }

  const db = await getAdminDb()
  if (!db) return NextResponse.json({ ok: false, error: NOT_CONFIGURED }, { status: 503 })

  const done = () => revalidatePath('/videos')

  try {
    if (body.action === 'upsert' && body.item) {
      const id = parseYoutubeId(body.item.youtubeId)
      if (!id) return NextResponse.json({ ok: false, error: '유튜브 영상 ID 가 올바르지 않습니다.' }, { status: 400 })
      let title = body.item.title?.trim() ?? ''
      if (!title) title = (await resolveTitle(id))?.title ?? ''
      await db
        .collection('videos')
        .doc(id)
        .set(
          {
            youtubeId: id,
            title,
            summary: body.item.summary ?? null,
            publishedAt: body.item.publishedAt ?? null,
            category: body.item.category ?? 'recent',
            order: typeof body.item.order === 'number' ? body.item.order : 999,
            published: body.item.published !== false,
            updatedAt: new Date().toISOString(),
            updatedBy: editor,
          },
          { merge: true },
        )
      done()
      return NextResponse.json({ ok: true, id, title })
    }

    if (body.action === 'delete' && body.item?.youtubeId) {
      await db.collection('videos').doc(body.item.youtubeId).delete()
      done()
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'reorder' && body.items) {
      const batch = db.batch()
      body.items.forEach((x) => {
        batch.set(
          db.collection('videos').doc(x.youtubeId),
          { order: x.order, category: x.category, updatedAt: new Date().toISOString(), updatedBy: editor },
          { merge: true },
        )
      })
      await batch.commit()
      done()
      return NextResponse.json({ ok: true, count: body.items.length })
    }

    if (body.action === 'channel' && body.channel) {
      await db
        .collection('site_config')
        .doc('videos')
        .set({ ...body.channel, updatedAt: new Date().toISOString(), updatedBy: editor }, { merge: true })
      done()
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ ok: false, error: '알 수 없는 요청입니다.' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.' },
      { status: 500 },
    )
  }
}
