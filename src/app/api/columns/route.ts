import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import raw from '@/data/columns.json'
import { adminConfigured, getAdminDb, takeAuthError, verifyAdmin } from '@/lib/firebase/admin'
import { COLUMN_SLUG_RE } from '@/lib/columns'
import type { Column, ColumnData } from '@/types/column'

export const runtime = 'nodejs'
export const maxDuration = 60

const NOT_CONFIGURED =
  'FIREBASE_SERVICE_ACCOUNT 환경변수가 없어 서버에서 저장할 수 없습니다. ' +
  'FIREBASE_SETUP.md 를 참고해 서비스 계정 키를 등록하거나, 관리자 구글 계정으로 로그인해 주세요.'

/** 문자열 배열로 다듬기 — 빈 값·공백은 버린다 */
function toStrArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => String(x).trim()).filter(Boolean)
}

/**
 * 저장할 칸만 추려 undefined 를 없앤다 (Firestore 는 undefined 를 거부).
 * .set(row) 이라 문서를 통째로 갈아치우므로, 남길 값은 여기서 전부 실어야 한다.
 */
function toRow(input: Partial<Column>, editor: string): Column {
  const now = new Date().toISOString()
  return {
    slug: String(input.slug ?? ''),
    title: String(input.title ?? '').trim(),
    description: String(input.description ?? '').trim(),
    lead: String(input.lead ?? '').trim(),
    body: toStrArray(input.body),
    keywords: toStrArray(input.keywords),
    photo: input.photo ? String(input.photo) : '',
    heroImage: input.heroImage ? String(input.heroImage) : '',
    thumbImage: input.thumbImage ? String(input.thumbImage) : '',
    author: String(input.author ?? '김성희').trim() || '김성희',
    publishedAt: String(input.publishedAt ?? now.slice(0, 10)),
    updatedAt: now,
    updatedBy: editor,
    relatedHubs: toStrArray(input.relatedHubs),
    relatedQna: toStrArray(input.relatedQna),
    published: input.published !== false,
  }
}

/**
 * CEO 칼럼 저장 — 관리자 구글 계정만 허용.
 * 서버가 Admin SDK 로 직접 쓰므로 Firestore 보안 규칙과 무관하게 동작한다.
 * 100문100답 저장 API 와 같은 뼈대다.
 *
 * POST { idToken, action: 'list'|'save'|'delete'|'seed', item?, slug?, overwrite? }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  let editor: string | null = null
  let db: Awaited<ReturnType<typeof getAdminDb>> = null
  try {
    editor = await verifyAdmin({ idToken: body?.idToken })
    if (editor) db = await getAdminDb()
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `인증 처리 중 오류 — ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    )
  }

  if (!editor) {
    const why = takeAuthError()
    return NextResponse.json(
      { ok: false, error: why ? `구글 로그인 확인 실패 — ${why}` : '인증 실패 — 관리자 계정이 아닙니다.' },
      { status: 401 },
    )
  }

  if (!db) {
    return NextResponse.json(
      { ok: false, error: adminConfigured ? '서비스 계정 키를 읽을 수 없습니다.' : NOT_CONFIGURED },
      { status: 503 },
    )
  }

  // 저장/삭제 뒤 공개 페이지 캐시를 새로 굽는다 (배포 없이 바로 반영)
  const revalidateAll = (slug?: string) => {
    revalidatePath('/column')
    if (slug) revalidatePath(`/column/${slug}`)
    revalidatePath('/column/[slug]', 'page')
    revalidatePath('/sitemap.xml')
    revalidatePath('/', 'layout')
  }

  try {
    if (body?.action === 'list') {
      const snap = await db.collection('columns').get()
      const rows = snap.docs
        .map((d) => d.data() as Column)
        .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''))
      return NextResponse.json({ ok: true, rows, editor })
    }

    // 시드(JSON)를 Firestore 로 밀어 넣는다 — 처음 한 번, 또는 비어 있을 때
    if (body?.action === 'seed') {
      const data = raw as unknown as ColumnData
      const overwrite = !!body?.overwrite
      let skip = new Set<string>()
      if (!overwrite) {
        const snap = await db.collection('columns').get()
        skip = new Set(snap.docs.map((d) => d.id))
      }
      const targets = data.items.filter((x) => !skip.has(x.slug))
      const batch = db.batch()
      for (const x of targets) batch.set(db.collection('columns').doc(x.slug), toRow(x, editor))
      if (targets.length) await batch.commit()
      revalidateAll()
      return NextResponse.json({ ok: true, upserted: targets.length, skipped: skip.size, editor })
    }

    if (body?.action === 'delete') {
      const slug = String(body?.slug ?? '')
      if (!COLUMN_SLUG_RE.test(slug)) {
        return NextResponse.json({ ok: false, error: '칼럼 주소가 올바르지 않습니다.' }, { status: 400 })
      }
      const ref = db.collection('columns').doc(slug)
      const snap = await ref.get()
      if (!snap.exists) {
        return NextResponse.json({ ok: false, error: '이미 삭제된 칼럼입니다.' }, { status: 404 })
      }
      // 되돌릴 수 있도록 삭제 직전 내용을 보관한다
      await db
        .collection('columns_deleted')
        .doc(`${slug}__${Date.now()}`)
        .set({ ...snap.data(), deletedAt: new Date().toISOString(), deletedBy: editor })
      await ref.delete()
      revalidateAll(slug)
      return NextResponse.json({ ok: true, slug, deleted: true, editor })
    }

    // 저장 (신규·수정 공용)
    const input = body?.item as Partial<Column> | undefined
    const slug = String(input?.slug ?? '')
    if (!COLUMN_SLUG_RE.test(slug)) {
      return NextResponse.json(
        { ok: false, error: '칼럼 주소(slug)는 영문 소문자·숫자·하이픈 2~60자여야 합니다.' },
        { status: 400 },
      )
    }
    if (!input?.title || !toStrArray(input.body).length) {
      return NextResponse.json({ ok: false, error: '제목과 본문은 비울 수 없습니다.' }, { status: 400 })
    }

    // 고치기 전 상태를 남긴다 — 되돌릴 수 없는 수정은 만들지 않는다
    const ref = db.collection('columns').doc(slug)
    const prev = await ref.get()
    if (prev.exists) {
      await db
        .collection('columns_versions')
        .doc(`${slug}__${Date.now()}`)
        .set({ slug, savedAt: new Date().toISOString(), editor, snapshot: prev.data() })
    }

    const row = toRow(input, editor)
    // 발행일은 처음 값이 있으면 지킨다 — 수정할 때마다 오늘로 바뀌지 않게
    if (prev.exists) {
      const before = prev.data() as Column
      if (before.publishedAt) row.publishedAt = before.publishedAt
    }
    await ref.set(row)
    revalidateAll(slug)
    return NextResponse.json({ ok: true, slug, editor, updatedAt: row.updatedAt })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
