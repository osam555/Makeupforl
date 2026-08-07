'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Eye, EyeOff, Link2, Plus, Save, Trash2 } from 'lucide-react'

import AdminGate from '@/components/admin/AdminGate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import seedRaw from '@/data/videos.json'
import { getDb } from '@/lib/firebase/client'
import {
  parseYoutubeId,
  videoCategories,
  youtubeThumb,
  youtubeWatch,
  type VideoCategory,
  type VideoChannel,
  type VideoItem,
} from '@/lib/videos-shared'

const SEED = seedRaw as unknown as { channel: VideoChannel; items: VideoItem[] }
type Status = { kind: 'ok' | 'err'; msg: string } | null

function AdminVideos({ password, idTokenGetter }: { password: string | null; idTokenGetter: () => Promise<string | null> }) {
  const [items, setItems] = useState<VideoItem[]>(SEED.items)
  const [channel, setChannel] = useState<VideoChannel>(SEED.channel)
  const [source, setSource] = useState<'db' | 'seed'>('seed')
  const [url, setUrl] = useState('')
  const [cat, setCat] = useState<VideoCategory>('recent')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>(null)

  const load = useCallback(async () => {
    try {
      const db = getDb()
      if (!db) return
      const { collection, getDocs, doc, getDoc } = await import('firebase/firestore')
      const snap = await getDocs(collection(db, 'videos'))
      if (!snap.empty) {
        setItems(
          snap.docs
            .map((d) => ({ ...(d.data() as VideoItem), id: d.id }))
            .sort((a, b) => a.order - b.order),
        )
        setSource('db')
      }
      const cfg = await getDoc(doc(db, 'site_config', 'videos'))
      if (cfg.exists()) setChannel((c) => ({ ...c, ...(cfg.data() as VideoChannel) }))
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
      const res = await fetch('/api/videos/save', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...payload, password, idToken }),
      })
      const j = (await res.json()) as { ok: boolean; error?: string; title?: string }
      if (!j.ok) throw new Error(j.error ?? '저장 실패')
      return j
    },
    [password, idTokenGetter],
  )

  const add = async () => {
    const id = parseYoutubeId(url)
    if (!id) {
      setStatus({ kind: 'err', msg: '유튜브 주소 또는 영상 ID를 확인해 주세요.' })
      return
    }
    if (items.some((x) => x.youtubeId === id)) {
      setStatus({ kind: 'err', msg: '이미 등록된 영상입니다.' })
      return
    }
    setBusy(true)
    setStatus(null)
    try {
      const order = items.filter((x) => x.category === cat).length
      const j = await call({
        action: 'upsert',
        item: { youtubeId: id, category: cat, order, published: true },
      })
      setItems((prev) => [
        ...prev,
        {
          id,
          youtubeId: id,
          title: j.title ?? '',
          summary: null,
          publishedAt: null,
          category: cat,
          order,
          published: true,
        },
      ])
      setUrl('')
      setStatus({ kind: 'ok', msg: `추가했습니다 — ${j.title ?? id}` })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '저장 실패' })
    } finally {
      setBusy(false)
    }
  }

  const patch = async (v: VideoItem, next: Partial<VideoItem>) => {
    setBusy(true)
    try {
      await call({ action: 'upsert', item: { ...v, ...next } })
      setItems((prev) => prev.map((x) => (x.youtubeId === v.youtubeId ? { ...x, ...next } : x)))
      setStatus({ kind: 'ok', msg: '저장했습니다.' })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '저장 실패' })
    } finally {
      setBusy(false)
    }
  }

  const remove = async (v: VideoItem) => {
    if (!window.confirm(`"${v.title || v.youtubeId}" 을(를) 목록에서 삭제할까요?`)) return
    setBusy(true)
    try {
      await call({ action: 'delete', item: { youtubeId: v.youtubeId } })
      setItems((prev) => prev.filter((x) => x.youtubeId !== v.youtubeId))
      setStatus({ kind: 'ok', msg: '삭제했습니다.' })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '삭제 실패' })
    } finally {
      setBusy(false)
    }
  }

  const move = async (v: VideoItem, dir: -1 | 1) => {
    const group = items.filter((x) => x.category === v.category).sort((a, b) => a.order - b.order)
    const i = group.findIndex((x) => x.youtubeId === v.youtubeId)
    const j = i + dir
    if (j < 0 || j >= group.length) return
    ;[group[i], group[j]] = [group[j], group[i]]
    const payload = group.map((x, k) => ({ youtubeId: x.youtubeId, order: k, category: x.category }))
    setBusy(true)
    try {
      await call({ action: 'reorder', items: payload })
      setItems((prev) =>
        prev.map((x) => {
          const p = payload.find((y) => y.youtubeId === x.youtubeId)
          return p ? { ...x, order: p.order } : x
        }),
      )
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '순서 저장 실패' })
    } finally {
      setBusy(false)
    }
  }

  const saveChannel = async () => {
    setBusy(true)
    try {
      await call({ action: 'channel', channel: channel as unknown as Record<string, unknown> })
      setStatus({ kind: 'ok', msg: '채널 정보를 저장했습니다.' })
    } catch (e) {
      setStatus({ kind: 'err', msg: e instanceof Error ? e.message : '저장 실패' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">유튜브 채널 관리</h1>
            <p className="mt-1 text-sm text-gray-500">
              최신 영상은 채널 RSS 로 자동 수집됩니다. 여기서는 <b>대표·인기 영상</b>과 노출 순서를
              정하고, 자동 수집분 중 숨길 영상을 지정합니다. ({source === 'db' ? 'DB' : '시드'} 기준)
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/videos" target="_blank">
              <Button variant="outline" size="sm">
                <Eye className="mr-1.5 h-4 w-4" /> 사이트 보기
              </Button>
            </Link>
            <Link href="/admin/wed100">
              <Button variant="outline" size="sm">
                100문100답
              </Button>
            </Link>
          </div>
        </div>

        {status && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm ${
              status.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {status.msg}
          </div>
        )}

        {/* 채널 */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-900">
            <Link2 className="h-4 w-4" /> 유튜브 채널
          </h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-gray-500">
              채널 주소
              <Input
                className="mt-1"
                value={channel.url ?? ''}
                onChange={(e) => setChannel({ ...channel, url: e.target.value })}
                placeholder="https://www.youtube.com/@..."
              />
            </label>
            <label className="text-xs text-gray-500">
              채널 이름
              <Input
                className="mt-1"
                value={channel.name ?? ''}
                onChange={(e) => setChannel({ ...channel, name: e.target.value })}
              />
            </label>
            <label className="text-xs text-gray-500">
              채널 ID (UC… — 최신 영상 자동 수집에 사용)
              <Input
                className="mt-1"
                value={channel.channelId ?? ''}
                onChange={(e) => setChannel({ ...channel, channelId: e.target.value })}
                placeholder="UCtlSwebjXpbjnasvIMMTLZA"
              />
            </label>
          </div>
          <Button onClick={saveChannel} disabled={busy} size="sm" className="mt-3 bg-[#F46E65] hover:bg-[#E2564C]">
            <Save className="mr-1.5 h-4 w-4" /> 채널 저장
          </Button>
        </section>

        {/* 추가 */}
        <section className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-bold text-gray-900">영상 추가</h2>
          <div className="flex flex-wrap gap-2">
            <Input
              className="min-w-[280px] flex-1"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && add()}
              placeholder="유튜브 주소 붙여넣기 (watch / youtu.be / shorts / embed 모두 가능)"
            />
            <select
              value={cat}
              onChange={(e) => setCat(e.target.value as VideoCategory)}
              className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm"
            >
              {videoCategories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button onClick={add} disabled={busy} className="bg-[#F46E65] hover:bg-[#E2564C]">
              <Plus className="mr-1.5 h-4 w-4" /> 추가
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            제목은 유튜브에서 자동으로 가져옵니다. 필요하면 아래 목록에서 직접 고칠 수 있습니다.
          </p>
        </section>

        {/* 목록 */}
        {videoCategories.map((c) => {
          const rows = items.filter((x) => x.category === c.key).sort((a, b) => a.order - b.order)
          return (
            <section key={c.key} className="mb-6">
              <h2 className="mb-2 text-sm font-bold text-gray-900">
                {c.name} <span className="ml-1 font-normal text-gray-400">{rows.length}개</span>
              </h2>
              {rows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-400">
                  등록된 영상이 없습니다.
                </p>
              ) : (
                <ul className="space-y-2">
                  {rows.map((v, i) => (
                    <li
                      key={v.youtubeId}
                      className={`flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 ${
                        v.published === false ? 'border-gray-200 opacity-55' : 'border-gray-200'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={youtubeThumb(v.youtubeId)}
                        alt=""
                        className="h-[54px] w-[96px] shrink-0 rounded object-cover"
                      />
                      <div className="min-w-[220px] flex-1">
                        <Input
                          value={v.title}
                          onChange={(e) =>
                            setItems((prev) =>
                              prev.map((x) =>
                                x.youtubeId === v.youtubeId ? { ...x, title: e.target.value } : x,
                              ),
                            )
                          }
                          onBlur={() => patch(v, { title: v.title })}
                          className="h-8 text-sm"
                        />
                        <a
                          href={youtubeWatch(v.youtubeId)}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-[11px] text-gray-400 underline"
                        >
                          {v.youtubeId}
                        </a>
                      </div>
                      <select
                        value={v.category}
                        onChange={(e) => patch(v, { category: e.target.value as VideoCategory })}
                        className="h-8 rounded-md border border-gray-200 bg-white px-2 text-xs"
                      >
                        {videoCategories.map((x) => (
                          <option key={x.key} value={x.key}>
                            {x.name}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" disabled={busy || i === 0} onClick={() => move(v, -1)}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy || i === rows.length - 1}
                          onClick={() => move(v, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => patch(v, { published: v.published === false })}
                          title={v.published === false ? '노출' : '숨김'}
                        >
                          {v.published === false ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => remove(v)}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminVideosPage() {
  return (
    <AdminGate title="유튜브 채널 관리">
      {(ctx) => (
        <AdminVideos
          password={ctx.password}
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
  )
}
