'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Eye, EyeOff, FileText, Plus, Save, Trash2, Upload } from 'lucide-react'

import AdminGate from '@/components/admin/AdminGate'
import AdminShell from '@/components/admin/AdminShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import seedRaw from '@/data/columns.json'
import { getDb } from '@/lib/firebase/client'
import type { Column, ColumnData } from '@/types/column'

const SEED = seedRaw as unknown as ColumnData

type Status = { kind: 'ok' | 'err'; msg: string } | null

/** 화면 편집용 초안 — 배열·문단은 글로 다루고 저장할 때 배열로 되돌린다 */
interface Draft {
  slug: string
  title: string
  description: string
  lead: string
  author: string
  publishedAt: string
  heroImage: string
  bodyText: string
  keywordsText: string
  hubsText: string
  qnaText: string
  published: boolean
}

const csv = (a?: string[]) => (a ?? []).join(', ')
const toArr = (s: string) =>
  s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean)

function toDraft(c?: Column): Draft {
  return {
    slug: c?.slug ?? '',
    title: c?.title ?? '',
    description: c?.description ?? '',
    lead: c?.lead ?? '',
    author: c?.author ?? '김성희',
    publishedAt: c?.publishedAt ?? new Date().toISOString().slice(0, 10),
    heroImage: c?.heroImage ?? '',
    // 문단은 빈 줄로 나눈다 — 본문 렌더러가 문단 배열을 그대로 <p> 로 그린다
    bodyText: (c?.body ?? []).join('\n\n'),
    keywordsText: csv(c?.keywords),
    hubsText: csv(c?.relatedHubs),
    qnaText: csv(c?.relatedQna),
    published: c?.published !== false,
  }
}

function AdminColumn({
  idTokenGetter,
}: {
  idTokenGetter: () => Promise<string | null>
}) {
  const [items, setItems] = useState<Column[]>(SEED.items)
  const [source, setSource] = useState<'db' | 'seed'>('seed')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const load = useCallback(async () => {
    try {
      const db = getDb()
      if (!db) return
      const { collection, getDocs } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'columns'))
      if (!snap.empty) {
        setItems(
          snap.docs
            .map((d) => d.data() as Column)
            .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')),
        )
        setSource('db')
      }
    } catch {
      /* 규칙상 읽기가 막혀 있으면 시드 유지 */
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const call = useCallback(
    async (payload: Record<string, unknown>) => {
      const idToken = await idTokenGetter()
      const res = await fetch('/api/columns', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, idToken }),
      })
      const j = (await res.json()) as { ok: boolean; error?: string }
      if (!j.ok) throw new Error(j.error ?? '저장 실패')
      return j
    },
    [idTokenGetter],
  )

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d))

  const save = async () => {
    if (!draft) return
    if (!/^[a-z0-9-]{2,60}$/.test(draft.slug)) {
      setStatus({ kind: 'err', msg: '주소(slug)는 영문 소문자·숫자·하이픈 2~60자여야 합니다.' })
      return
    }
    const item: Partial<Column> = {
      slug: draft.slug,
      title: draft.title,
      description: draft.description,
      lead: draft.lead,
      author: draft.author,
      publishedAt: draft.publishedAt,
      heroImage: draft.heroImage,
      body: draft.bodyText.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean),
      keywords: toArr(draft.keywordsText),
      relatedHubs: toArr(draft.hubsText),
      relatedQna: toArr(draft.qnaText),
      published: draft.published,
    }
    setBusy(true)
    setStatus(null)
    try {
      await call({ action: 'save', item })
      await load()
      setStatus({ kind: 'ok', msg: `저장했습니다 — ${draft.title}` })
      setDraft(null)
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '저장 실패' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (c: Column) => {
    if (!window.confirm(`"${c.title}" 칼럼을 삭제할까요? (되돌릴 수 있게 보관됩니다)`)) return
    setBusy(true)
    try {
      await call({ action: 'delete', slug: c.slug })
      await load()
      setStatus({ kind: 'ok', msg: '삭제했습니다.' })
      if (draft?.slug === c.slug) setDraft(null)
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '삭제 실패' })
    } finally {
      setBusy(false)
    }
  }

  const seed = async () => {
    if (!window.confirm('리포 시드의 칼럼을 Firestore 로 올릴까요? (이미 있는 주소는 건너뜁니다)')) return
    setBusy(true)
    try {
      const j = (await call({ action: 'seed' })) as { upserted?: number; skipped?: number }
      await load()
      setStatus({ kind: 'ok', msg: `시드 반영 — 새로 ${j.upserted ?? 0}건, 건너뜀 ${j.skipped ?? 0}건` })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '시드 실패' })
    } finally {
      setBusy(false)
    }
  }

  const inputCls =
    'mt-1 w-full rounded-md border border-[var(--a-e0d6cc)] bg-white px-3 py-2 text-sm'

  const editing = useMemo(() => items.find((x) => x.slug === draft?.slug), [items, draft])

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-xl text-sm leading-relaxed text-[var(--a-6b5d57)]">
          대표원장 칼럼을 올리고 고칩니다. 저장하면 배포 없이 바로 반영됩니다. ({source === 'db' ? 'DB' : '시드'} 기준)
          <br />
          <span className="text-[var(--a-8a7a72)]">
            푸시 전에는 <code>scripts/sync-columns-seed.py</code> 로 시드에 되돌려 두세요 — 폴백 때 옛 글이 뜨지 않게.
          </span>
        </p>
        <div className="flex gap-2">
          <Link href="/column" target="_blank">
            <Button variant="outline" size="sm">
              <Eye className="mr-1.5 h-4 w-4" /> 사이트에서 보기
            </Button>
          </Link>
          <Button variant="outline" size="sm" disabled={busy} onClick={seed}>
            <Upload className="mr-1.5 h-4 w-4" /> 시드 반영
          </Button>
          <Button
            size="sm"
            className="bg-[var(--a-f46e65)] hover:bg-[var(--a-e2564c)]"
            onClick={() => setDraft(toDraft())}
          >
            <Plus className="mr-1.5 h-4 w-4" /> 새 칼럼
          </Button>
        </div>
      </div>

      {status && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            status.kind === 'ok'
              ? 'border border-[var(--a-dce8e0)] bg-white text-[var(--a-3f6b57)]'
              : 'border border-[var(--a-e8c7cf)] bg-white text-[var(--a-a63d5a)]'
          }`}
        >
          {status.msg}
        </div>
      )}

      {/* 편집 폼 */}
      {draft && (
        <section className="mb-6 rounded-xl border border-[var(--a-e0d6cc)] bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[var(--a-2e2724)]">
            <FileText className="h-4 w-4" /> {editing ? '칼럼 수정' : '새 칼럼'}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[var(--a-8a7a72)]">
              주소 (slug) — 영문·숫자·하이픈
              <Input
                className="mt-1"
                value={draft.slug}
                disabled={!!editing}
                onChange={(e) => set({ slug: e.target.value })}
                placeholder="sanggyeonrye-makeup"
              />
            </label>
            <label className="text-xs text-[var(--a-8a7a72)]">
              발행일
              <Input
                className="mt-1"
                type="date"
                value={draft.publishedAt}
                onChange={(e) => set({ publishedAt: e.target.value })}
              />
            </label>
          </div>
          <label className="mt-3 block text-xs text-[var(--a-8a7a72)]">
            제목
            <Input className="mt-1" value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </label>
          <label className="mt-3 block text-xs text-[var(--a-8a7a72)]">
            요약 (검색 결과·목록 카드에 뜨는 한두 문장)
            <textarea
              className={inputCls}
              rows={2}
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
            />
          </label>
          <label className="mt-3 block text-xs text-[var(--a-8a7a72)]">
            리드 (히어로 아래 한 줄)
            <Input className="mt-1" value={draft.lead} onChange={(e) => set({ lead: e.target.value })} />
          </label>
          <label className="mt-3 block text-xs text-[var(--a-8a7a72)]">
            본문 — 문단은 빈 줄로 나눕니다
            <textarea
              className={inputCls}
              rows={12}
              value={draft.bodyText}
              onChange={(e) => set({ bodyText: e.target.value })}
            />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[var(--a-8a7a72)]">
              키워드 (쉼표로)
              <Input
                className="mt-1"
                value={draft.keywordsText}
                onChange={(e) => set({ keywordsText: e.target.value })}
                placeholder="상견례 메이크업, 혼주 화장"
              />
            </label>
            <label className="text-xs text-[var(--a-8a7a72)]">
              필자
              <Input className="mt-1" value={draft.author} onChange={(e) => set({ author: e.target.value })} />
            </label>
            <label className="text-xs text-[var(--a-8a7a72)]">
              이어 줄 허브 slug (쉼표로) — 예: 혼주메이크업
              <Input
                className="mt-1"
                value={draft.hubsText}
                onChange={(e) => set({ hubsText: e.target.value })}
              />
            </label>
            <label className="text-xs text-[var(--a-8a7a72)]">
              이어 줄 문항 slug (쉼표로) — 예: p3-05
              <Input
                className="mt-1"
                value={draft.qnaText}
                onChange={(e) => set({ qnaText: e.target.value })}
              />
            </label>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-[var(--a-2e2724)]">
            <input
              type="checkbox"
              checked={draft.published}
              onChange={(e) => set({ published: e.target.checked })}
            />
            공개 (끄면 목록·검색에서 숨김)
          </label>

          <div className="mt-4 flex gap-2">
            <Button
              onClick={save}
              disabled={busy}
              className="bg-[var(--a-f46e65)] hover:bg-[var(--a-e2564c)]"
            >
              <Save className="mr-1.5 h-4 w-4" /> 저장
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)} disabled={busy}>
              닫기
            </Button>
          </div>
        </section>
      )}

      {/* 목록 */}
      <section>
        <h2 className="mb-2 text-sm font-extrabold text-[var(--a-2e2724)]">
          칼럼 <span className="ml-1 font-normal text-[var(--a-9a8b84)]">{items.length}개</span>
        </h2>
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-[var(--a-e0d6cc)] bg-white px-4 py-6 text-center text-sm text-[var(--a-9a8b84)]">
            아직 칼럼이 없습니다.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((c) => (
              <li
                key={c.slug}
                className={`flex flex-wrap items-center gap-3 rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3 ${
                  c.published === false ? 'opacity-55' : ''
                }`}
              >
                <div className="min-w-[220px] flex-1">
                  <p className="text-sm font-bold text-[var(--a-2e2724)]">{c.title}</p>
                  <p className="mt-0.5 text-[0.6875rem] text-[var(--a-9a8b84)]">
                    {c.slug} · {c.publishedAt}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft(toDraft(c))}>
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => remove(c)}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  {c.published === false ? (
                    <span className="flex items-center px-1 text-[var(--a-9a8b84)]" title="숨김">
                      <EyeOff className="h-3.5 w-3.5" />
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

export default function AdminColumnPage() {
  return (
    <AdminShell active="/admin/column" title="CEO 칼럼 관리">
      <AdminGate title="CEO 칼럼 관리">
        {(ctx) => (
          <AdminColumn
            idTokenGetter={async () => {
              if (!ctx.email) return null
              try {
                const { getFirebaseApp } = await import('@/lib/firebase/client')
                const app = getFirebaseApp()
                if (!app) return null
                const { getAuth } = await import('firebase/auth')
                return (await getAuth(app).currentUser?.getIdToken()) ?? null
              } catch {
                return null
              }
            }}
          />
        )}
      </AdminGate>
    </AdminShell>
  )
}
