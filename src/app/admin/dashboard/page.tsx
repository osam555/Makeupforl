'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'

import seedRaw from '@/data/wed100.json'
import { getDb } from '@/lib/firebase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { Wed100Data } from '@/types/wed100'
import { PART_THEME } from '@/types/wed100'

const seed = seedRaw as unknown as Wed100Data
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_WED100_ADMIN_PASSWORD ?? '8888'

interface EventRow {
  slug: string
  event: 'view' | 'play' | 'complete' | 'cta_click'
  lang: string | null
  created_at: string
}

const RANGES = [
  { key: 7, label: '7일' },
  { key: 30, label: '30일' },
  { key: 90, label: '90일' },
] as const

export default function AdminDashboardPage() {
  const [password, setPassword] = useState('')
  const [authed, setAuthed] = useState(false)
  const [days, setDays] = useState<number>(30)
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(false)
  const [dbError, setDbError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setDbError(null)
    try {
      const since = new Date(Date.now() - days * 86400_000).toISOString()
      const db = getDb()
      if (!db) throw new Error('Firebase 환경변수 미설정')
      const { collection, getDocs, limit, orderBy, query, where } = await import(
        'firebase/firestore'
      )
      const q = query(
        collection(db, 'wed100_events'),
        where('createdAt', '>=', since),
        orderBy('createdAt', 'desc'),
        limit(50000),
      )
      const snap = await getDocs(q)
      setEvents(
        snap.docs.map((d) => {
          const v = d.data() as { slug: string; event: EventRow['event']; lang: string | null; createdAt: string }
          return { slug: v.slug, event: v.event, lang: v.lang, created_at: v.createdAt }
        }),
      )
    } catch (e) {
      setDbError(e instanceof Error ? e.message : String(e))
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    if (authed) void load()
  }, [authed, load])

  const stats = useMemo(() => {
    const by = (ev: EventRow['event']) => events.filter((e) => e.event === ev)
    const views = by('view').length
    const plays = by('play').length
    const completes = by('complete').length
    const ctas = by('cta_click').length

    const perSlug = new Map<string, { view: number; play: number; complete: number; cta: number }>()
    for (const e of events) {
      const s = perSlug.get(e.slug) ?? { view: 0, play: 0, complete: 0, cta: 0 }
      if (e.event === 'view') s.view++
      else if (e.event === 'play') s.play++
      else if (e.event === 'complete') s.complete++
      else s.cta++
      perSlug.set(e.slug, s)
    }
    const top = [...perSlug.entries()]
      .sort((a, b) => b[1].play + b[1].view - (a[1].play + a[1].view))
      .slice(0, 10)

    const perPart = new Map<number, number>()
    for (const [slug, s] of perSlug) {
      const item = seed.items.find((x) => x.slug === slug)
      if (item) perPart.set(item.part, (perPart.get(item.part) ?? 0) + s.view + s.play)
    }

    const langCount = new Map<string, number>()
    for (const e of events) {
      if (e.event === 'play' && e.lang) langCount.set(e.lang, (langCount.get(e.lang) ?? 0) + 1)
    }

    return { views, plays, completes, ctas, top, perPart, langCount }
  }, [events])

  const coverage = useMemo(() => {
    const total = seed.items.length
    const withAudio = seed.items.filter((x) => x.audio).length
    const withEn = seed.items.filter((x) => x.cues.every((c) => c.en)).length
    const cueCount = seed.items.reduce((a, x) => a + x.cues.length, 0)
    return { total, withAudio, withEn, cueCount }
  }, [])

  if (!authed) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#FBF7F3] px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (password === ADMIN_PASSWORD) setAuthed(true)
            else {
              alert('비밀번호가 올바르지 않습니다.')
              setPassword('')
            }
          }}
          className="w-full max-w-sm rounded-2xl border border-[#E7DDD4] bg-white p-8 shadow"
        >
          <h1 className="text-lg font-extrabold text-[#2E2724]">통계 대시보드</h1>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-4"
            placeholder="관리자 비밀번호"
          />
          <Button type="submit" className="mt-4 w-full bg-[#A63D5A] hover:bg-[#8A2E48]">
            로그인
          </Button>
        </form>
      </div>
    )
  }

  const kpi = [
    { l: '100문100답 조회수', v: stats.views },
    { l: '음성 재생 수', v: stats.plays },
    {
      l: '완청률',
      v: stats.plays ? `${Math.round((stats.completes / stats.plays) * 100)}%` : '—',
    },
    { l: '상담 CTA 클릭', v: stats.ctas },
  ]

  return (
    <div className="bg-[#EFE9E3] px-4 py-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center gap-3 rounded-t-2xl bg-[#221D1B] px-5 py-3.5 text-white">
          <BarChart3 className="h-4 w-4" />
          <b className="text-sm">100문100답 통계</b>
          <div className="ml-2 flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setDays(r.key)}
                className={`rounded-full px-3 py-1 text-[11px] ${
                  days === r.key ? 'bg-[#A63D5A] font-bold' : 'bg-[#3A322F] text-[#C9BDB6]'
                }`}
              >
                최근 {r.label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={load} className="flex items-center gap-1 text-xs text-[#C9BDB6] hover:text-white">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> 새로고침
            </button>
            <Link href="/admin/wed100" className="text-xs text-[#C9BDB6] hover:text-white">
              콘텐츠 관리 →
            </Link>
          </div>
        </div>

        <div className="rounded-b-2xl bg-white p-5 shadow lg:p-6">
          {dbError && (
            <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
              이벤트 데이터를 읽지 못했습니다 ({dbError}). Firebase 프로젝트 세팅(FIREBASE_SETUP.md)
              후 방문·재생·전환이 자동 집계됩니다. 아래 콘텐츠 커버리지는 정상 표시됩니다.
            </div>
          )}

          {/* KPI */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kpi.map((k) => (
              <div key={k.l} className="rounded-2xl border border-[#E7DDD4] p-4">
                <p className="text-[11px] font-bold text-[#6B5D57]">{k.l}</p>
                <p className="mt-1.5 text-2xl font-black text-[#2E2724]">{k.v}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            {/* TOP 질문 */}
            <div className="rounded-2xl border border-[#E7DDD4] p-5">
              <h2 className="text-sm font-extrabold text-[#2E2724]">가장 많이 본 질문 TOP 10</h2>
              {stats.top.length === 0 ? (
                <p className="mt-4 text-xs text-[#9C8D86]">
                  아직 집계된 이벤트가 없습니다. 사이트 배포 후 방문이 쌓이면 여기에 표시됩니다.
                </p>
              ) : (
                <div className="mt-4 space-y-2.5">
                  {stats.top.map(([slug, s]) => {
                    const item = seed.items.find((x) => x.slug === slug)
                    const max = stats.top[0][1].view + stats.top[0][1].play
                    const v = s.view + s.play
                    return (
                      <div key={slug} className="flex items-center gap-3 text-xs">
                        <span className="w-52 truncate text-[#4A403B]">
                          {item?.question ?? slug}
                        </span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F2EAE3]">
                          <span
                            className="block h-full rounded-full bg-gradient-to-r from-[#A63D5A] to-[#D98BA3]"
                            style={{ width: `${(v / max) * 100}%` }}
                          />
                        </span>
                        <span className="w-14 text-right font-mono text-[11px] text-[#8A7B73]">
                          {v.toLocaleString()}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* 커버리지 + 파트 비중 */}
            <div className="rounded-2xl border border-[#E7DDD4] p-5">
              <h2 className="text-sm font-extrabold text-[#2E2724]">콘텐츠 제작 커버리지</h2>
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {[
                  [`${coverage.total}`, '본문(문)'],
                  [`${coverage.withAudio}/${coverage.total}`, 'TTS 음성'],
                  [`${coverage.withEn}/${coverage.total}`, '영문 자막'],
                  [`${coverage.cueCount}`, '자막 큐'],
                ].map(([v, l]) => (
                  <div key={l} className="rounded-xl bg-[#FCFAF8] p-3 text-center">
                    <p className="text-lg font-black text-[#A63D5A]">{v}</p>
                    <p className="text-[10px] text-[#6B5D57]">{l}</p>
                  </div>
                ))}
              </div>

              <h2 className="mt-6 text-sm font-extrabold text-[#2E2724]">파트별 소비 비중</h2>
              <div className="mt-3 space-y-2">
                {seed.parts.map((p) => {
                  const v = stats.perPart.get(p.part) ?? 0
                  const total = [...stats.perPart.values()].reduce((a, b) => a + b, 0) || 1
                  return (
                    <div key={p.part} className="flex items-center gap-2.5 text-xs">
                      <span className="w-32 truncate text-[#4A403B]">
                        P{p.part} {p.title}
                      </span>
                      <span className="h-2 flex-1 overflow-hidden rounded-full bg-[#F2EAE3]">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${(v / total) * 100}%`,
                            background: PART_THEME[p.part].accent,
                          }}
                        />
                      </span>
                      <span className="w-10 text-right font-mono text-[10px] text-[#8A7B73]">
                        {total > 1 ? `${Math.round((v / total) * 100)}%` : '—'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
