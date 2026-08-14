import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import raw from '@/data/wed100.json'
import { adminConfigured, getAdminDb, verifyAdmin } from '@/lib/firebase/admin'
import { syncCuesWithAnswer } from '@/lib/wed100-text'
import type { Wed100Data, Wed100Item } from '@/types/wed100'

export const runtime = 'nodejs'
export const maxDuration = 60

const NOT_CONFIGURED =
  'FIREBASE_SERVICE_ACCOUNT 환경변수가 없어 서버에서 저장할 수 없습니다. ' +
  'FIREBASE_SETUP.md 7단계를 참고해 서비스 계정 키를 등록하거나, 관리자 구글 계정으로 로그인해 주세요.'

/** 저장할 필드만 추려 undefined 를 제거 (Firestore 는 undefined 를 거부) */
function toRow(item: Wed100Item, editor: string) {
  return {
    id: item.id,
    slug: item.slug,
    part: item.part,
    partTitle: item.partTitle,
    n: item.n,
    question: item.question,
    question_en: item.question_en ?? null,
    answer: item.answer ?? [],
    cues: (item.cues ?? []).map((c, i) => ({
      i,
      ko: c.ko,
      en: c.en ?? null,
      start: c.start ?? null,
      end: c.end ?? null,
    })),
    keywords: item.keywords ?? [],
    questionAudio: item.questionAudio ?? null,
    audio: item.audio ?? null,
    duration: item.duration ?? null,
    heroImage: item.heroImage ?? null,
    thumbImage: item.thumbImage ?? null,
    published: item.published ?? true,
    updatedAt: new Date().toISOString(),
    updatedBy: editor,
  }
}

/**
 * 어드민 저장 / 시드 — 비밀번호(8888) 또는 관리자 구글 계정 둘 다 허용.
 * 서버가 Admin SDK 로 직접 쓰므로 Firestore 보안 규칙과 무관하게 동작한다.
 *
 * POST { password?|idToken?, action: 'save'|'seed', item?, overwrite? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ password: body?.password, idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json(
      { ok: false, error: '인증 실패 — 비밀번호가 틀렸거나 관리자 계정이 아닙니다.' },
      { status: 401 },
    )
  }

  const db = await getAdminDb()
  if (!db) {
    return NextResponse.json(
      { ok: false, error: adminConfigured ? '서비스 계정 키를 읽을 수 없습니다.' : NOT_CONFIGURED },
      { status: 503 },
    )
  }

  try {
    if (body?.action === 'seed') {
      const data = raw as unknown as Wed100Data
      const overwrite = !!body?.overwrite

      let skip = new Set<string>()
      if (!overwrite) {
        const snap = await db.collection('wed100_questions').get()
        skip = new Set(snap.docs.map((d) => d.id))
      }
      const targets = data.items.filter((x) => !skip.has(x.slug))

      let upserted = 0
      for (let i = 0; i < targets.length; i += 400) {
        const batch = db.batch()
        for (const x of targets.slice(i, i + 400)) {
          batch.set(db.collection('wed100_questions').doc(x.slug), toRow(x, editor))
          upserted++
        }
        await batch.commit()
      }
      revalidatePath('/wed100')
      revalidatePath('/wed100/[slug]', 'page')
      return NextResponse.json({ ok: true, upserted, skipped: skip.size, editor })
    }

    // 삭제 보관함 조회
    if (body?.action === 'trash') {
      const snap = await db.collection('wed100_deleted').get()
      const rows = snap.docs
        .map((d) => {
          const x = d.data() as Wed100Item & { deletedAt?: string; deletedBy?: string }
          return {
            id: d.id,
            slug: x.slug,
            part: x.part,
            n: x.n,
            question: x.question,
            deletedAt: x.deletedAt ?? null,
            deletedBy: x.deletedBy ?? null,
            hasAudio: !!x.audio,
            cues: (x.cues ?? []).length,
          }
        })
        .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''))
      return NextResponse.json({ ok: true, rows })
    }

    // 보관함에서 복구 — 같은 파트의 마지막 번호 다음으로 되돌린다
    if (body?.action === 'restore') {
      const id = typeof body?.id === 'string' ? body.id : ''
      if (!id) return NextResponse.json({ ok: false, error: '복구할 항목이 없습니다.' }, { status: 400 })
      const arc = await db.collection('wed100_deleted').doc(id).get()
      if (!arc.exists) {
        return NextResponse.json({ ok: false, error: '보관함에 없는 항목입니다.' }, { status: 404 })
      }
      const data = arc.data() as Wed100Item & { deletedAt?: string; deletedBy?: string }
      const slug = data.slug
      if ((await db.collection('wed100_questions').doc(slug).get()).exists) {
        return NextResponse.json(
          { ok: false, error: `이미 목록에 있는 문항입니다 (${slug}).` },
          { status: 409 },
        )
      }
      const sameParts = await db.collection('wed100_questions').where('part', '==', data.part).get()
      const maxN = sameParts.docs.reduce((m, d) => Math.max(m, (d.data() as Wed100Item).n ?? 0), 0)

      const row: Record<string, unknown> = { ...data, n: maxN + 1 }
      delete row.deletedAt
      delete row.deletedBy
      row.updatedAt = new Date().toISOString()
      row.updatedBy = editor

      await db.collection('wed100_questions').doc(slug).set(row)
      await db.collection('wed100_deleted').doc(id).delete()
      revalidatePath('/wed100')
      revalidatePath(`/wed100/${slug}`)
      return NextResponse.json({ ok: true, slug, part: data.part, n: maxN + 1, editor })
    }

    // 번호 다시 매기기 — 삭제로 생긴 번호 공백을 파트별로 메운다.
    // 슬러그(=URL·오디오 경로)는 그대로 두고 표시 번호(n)만 조정한다.
    if (body?.action === 'renumber') {
      const snap = await db.collection('wed100_questions').get()
      const rows = snap.docs
        .map((d) => ({ docId: d.id, data: d.data() as Wed100Item }))
        .sort((a, b) => a.data.part - b.data.part || a.data.n - b.data.n)

      const seq = new Map<number, number>()
      const batch = db.batch()
      let changed = 0
      const stamp = new Date().toISOString()
      for (const { docId, data } of rows) {
        // 프롤로그(0)·에필로그(7)는 번호를 쓰지 않는다
        if (data.part === 0 || data.part === 7) continue
        const next = (seq.get(data.part) ?? 0) + 1
        seq.set(data.part, next)
        if (data.n !== next) {
          batch.update(db.collection('wed100_questions').doc(docId), {
            n: next,
            updatedAt: stamp,
            updatedBy: editor,
          })
          changed++
        }
      }
      if (changed) await batch.commit()
      revalidatePath('/wed100')
      revalidatePath('/wed100/[slug]', 'page')
      return NextResponse.json({ ok: true, changed, total: rows.length, editor })
    }

    // 문항 삭제 — 슬러그 확인 문자열을 함께 받아 오조작을 막는다
    if (body?.action === 'delete') {
      const slug = typeof body?.slug === 'string' ? body.slug : ''
      if (!slug) {
        return NextResponse.json({ ok: false, error: '삭제할 문항이 없습니다.' }, { status: 400 })
      }
      const ref = db.collection('wed100_questions').doc(slug)
      const snap = await ref.get()
      if (!snap.exists) {
        return NextResponse.json({ ok: false, error: '이미 삭제된 문항입니다.' }, { status: 404 })
      }
      // 되돌릴 수 있도록 삭제 직전 내용을 보관한다
      await db
        .collection('wed100_deleted')
        .doc(`${slug}__${Date.now()}`)
        .set({ ...snap.data(), deletedAt: new Date().toISOString(), deletedBy: editor })
      await ref.delete()
      revalidatePath('/wed100')
      revalidatePath(`/wed100/${slug}`)
      return NextResponse.json({ ok: true, slug, editor, deleted: true })
    }

    const item = body?.item as Wed100Item | undefined
    if (!item?.slug) {
      return NextResponse.json({ ok: false, error: '저장할 항목이 없습니다.' }, { status: 400 })
    }
    // 동시 수정 보호 — 편집을 시작한 시점(baseUpdatedAt) 이후 다른 저장이 있었으면 거부
    const prev = await db.collection('wed100_questions').doc(item.slug).get()
    const serverUpdatedAt = prev.exists
      ? ((prev.data() as { updatedAt?: string }).updatedAt ?? null)
      : null
    // baseUpdatedAt 미제공(구버전 어드민 탭 포함)도 충돌로 간주 — 새로고침을 강제해
    // 낡은 초안이 최신 데이터를 덮어쓰는 사고를 막는다
    const base = typeof body?.baseUpdatedAt === 'string' ? body.baseUpdatedAt : undefined
    if (serverUpdatedAt && base !== serverUpdatedAt) {
      return NextResponse.json(
        {
          ok: false,
          conflict: true,
          error:
            '이 문항이 다른 화면에서 먼저 수정되었습니다. 저장하지 않았습니다 — 새로고침 후 다시 편집해 주세요.',
          serverUpdatedAt,
        },
        { status: 409 },
      )
    }

    // 본문만 고친 경우 같은 문장을 쓰던 자막 큐도 함께 따라가게 한다
    let cueSync = 0
    try {
      const prevAnswer = prev.exists ? (prev.data() as Wed100Item).answer : undefined
      const r = syncCuesWithAnswer(prevAnswer, item.answer, item.cues)
      if (r.changed) {
        item.cues = r.cues
        cueSync = r.changed
      }
    } catch {
      /* 동기화 실패해도 저장은 진행 */
    }

    const row = toRow(item, editor)
    await db.collection('wed100_questions').doc(item.slug).set(row)
    // 저장 즉시 공개 페이지 캐시를 새로 굽는다 (배포 없이 바로 반영)
    revalidatePath('/wed100')
    revalidatePath(`/wed100/${item.slug}`)
    return NextResponse.json({ ok: true, slug: item.slug, editor, cueSync, updatedAt: row.updatedAt })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e instanceof Error ? e.message : String(e)) },
      { status: 500 },
    )
  }
}
