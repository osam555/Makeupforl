import { NextResponse } from 'next/server'

import gallerySeed from '@/data/gallery.json'
import siteImages from '@/data/site-images.json'
import { getAdminApp, getAdminDb, verifyAdmin } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const maxDuration = 60

interface SeedItem {
  id: string
  url: string
  alt_text: string
  category: string
  order_position: number
}

const SEED = gallerySeed as SeedItem[]

/** 사이트 UI/콘텐츠 이미지 (히어로 배너, 대표 사진, 컨설팅 일러스트 등) */
const ASSETS = (siteImages as { assets: { id: string; url: string; alt: string }[] }).assets.map(
  (a, i) => ({
    id: a.id,
    url: a.url,
    alt_text: a.alt,
    category: '_site',
    order_position: i,
  }),
)
const BUCKET =
  process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
  `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`

function extOf(url: string) {
  const m = url.toLowerCase().match(/\.(jpe?g|png|webp|gif)(?:\?|$)/)
  return m ? m[1].replace('jpeg', 'jpg') : 'jpg'
}
const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
}

/**
 * 원본 홈페이지(makeupforl.co.kr) 갤러리 사진을 우리 Firebase Storage 로 이전한다.
 * 서버리스 실행시간 제한 때문에 offset/limit 으로 나눠 호출한다.
 *
 * POST { password?|idToken?, offset?, limit? }
 *  → { ok, migrated, skipped, failed, nextOffset, done, total }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const editor = await verifyAdmin({ password: body?.password, idToken: body?.idToken })
  if (!editor) {
    return NextResponse.json({ ok: false, error: '관리자만 사용할 수 있습니다.' }, { status: 401 })
  }

  const app = await getAdminApp()
  const db = await getAdminDb()
  if (!app || !db) {
    return NextResponse.json(
      { ok: false, error: 'FIREBASE_SERVICE_ACCOUNT 가 설정되지 않았습니다.' },
      { status: 503 },
    )
  }

  const offset = Number(body?.offset ?? 0)
  const limit = Math.min(Number(body?.limit ?? 12), 25)
  // mode: 'gallery'(기본) | 'assets'
  const list = body?.mode === 'assets' ? ASSETS : SEED
  const batch = list.slice(offset, offset + limit)

  const { getStorage } = await import('firebase-admin/storage')
  const { randomUUID } = await import('node:crypto')
  const bucket = getStorage(app).bucket(BUCKET)

  let migrated = 0
  let skipped = 0
  const failed: string[] = []

  for (const item of batch) {
    const ext = extOf(item.url)
    const path = item.category === '_site' ? `site/${item.id}.${ext}` : `gallery/${item.id}.${ext}`
    const file = bucket.file(path)

    try {
      const [exists] = await file.exists()
      if (exists) {
        skipped++
        continue
      }
      const res = await fetch(item.url, {
        headers: { referer: 'https://makeupforl.co.kr/', 'user-agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const buf = Buffer.from(await res.arrayBuffer())
      if (buf.length < 1000) throw new Error('too small')

      const token = randomUUID()
      await file.save(buf, {
        contentType: MIME[ext] ?? 'image/jpeg',
        metadata: {
          cacheControl: 'public,max-age=31536000',
          metadata: { firebaseStorageDownloadTokens: token },
        },
      })
      const url =
        `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/` +
        `${encodeURIComponent(path)}?alt=media&token=${token}`

      const col = item.category === '_site' ? 'site_images' : 'gallery_images'
      await db.collection(col).doc(item.id).set({
        url,
        alt_text: item.alt_text,
        category: item.category,
        order_position: item.order_position,
        sourceUrl: item.url,
        updatedAt: new Date().toISOString(),
      })
      migrated++
    } catch (e) {
      failed.push(`${item.id}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const nextOffset = offset + batch.length
  return NextResponse.json({
    ok: true,
    migrated,
    skipped,
    failed,
    nextOffset,
    done: nextOffset >= list.length,
    total: list.length,
  })
}
