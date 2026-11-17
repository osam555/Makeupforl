'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { getDb } from '@/lib/firebase/client'
import AdminGate from '@/components/admin/AdminGate'
import AdminShell from '@/components/admin/AdminShell'
import { PART_THEME } from '@/types/wed100'

/** 문항 수·음성·자막 갖춤. 서버(page.tsx)가 세어 숫자만 넘긴다 */
export interface Coverage {
  total: number
  withAudio: number
  withEn: number
  cueCount: number
}

/** 화면에 필요한 것만 — 질문 제목과 파트 이름은 손님 화면에도 공개된 글이다 */
export interface DashboardProps {
  coverage: Coverage
  questions: Record<string, string>
  parts: { part: number; title: string }[]
}

/*
  slug 로 파트를 안다 — p3-07 은 파트 3, 프롤로그 0, 에필로그 7.
  전에는 시드 JSON 을 import 해 문항을 찾았는데, 클라이언트 컴포넌트가 import 한 JSON 은
  공개 JS 파일에 통째로 실려 잠긴 답 전문이 로그인 없이 새어 나갔다(2026-11-07).
*/
function partOf(slug: string): number | null {
  if (slug === 'prologue') return 0
  if (slug === 'epilogue') return 7
  const m = /^p(\d)-/.exec(slug)
  return m ? Number(m[1]) : null
}

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

function AdminDashboard({ coverage, questions, parts }: DashboardProps) {
  const authed = true
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
        // Firestore 쿼리 limit 의 최대는 10000 — 50000 을 넣자 운영에서 "Limit value ... over the maximum value of 10000" 로
        // 통째로 빈 화면이 됐다(2026-11-02 발견). 최근 90일 이벤트가 1만 건을 넘으면 오래된 쪽이 잘리지만, 빈 화면보다는 낫다.
        limit(10000),
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
      const part = partOf(slug)
      if (part !== null) perPart.set(part, (perPart.get(part) ?? 0) + s.view + s.play)
    }

    const langCount = new Map<string, number>()
    for (const e of events) {
      if (e.event === 'play' && e.lang) langCount.set(e.lang, (langCount.get(e.lang) ?? 0) + 1)
    }

    return { views, plays, completes, ctas, top, perPart, langCount }
  }, [events])



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
    <div>
      {/*
        기간 고르기.

        전에는 검은 띠 안에 기간·새로고침·다른 화면 링크가 함께 있었다. 새로고침도
        링크도 이제 윗줄에 있으니 남는 것은 기간뿐이다 — 띠를 걷어내고 고르는
        단추만 남긴다. 지금 무엇을 보고 있는지가 한 줄로 읽힌다.
      */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-1 rounded-lg border border-[var(--a-e0d6cc)] bg-[var(--color-white)] p-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setDays(r.key)}
              aria-pressed={days === r.key}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                days === r.key
                  ? 'bg-[var(--a-2e2724)] text-[var(--color-white)]'
                  : 'text-[var(--a-6b5d57)] hover:bg-[var(--a-f4f1ee)]'
              }`}
            >
              최근 {r.label}
            </button>
          ))}
        </div>
        {loading && <span className="text-xs text-[var(--a-8a7a72)]">읽는 중…</span>}
      </div>

      {dbError && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
          이벤트 데이터를 읽지 못했습니다 ({dbError}). Firebase 프로젝트 세팅(FIREBASE_SETUP.md)
          후 방문·재생·전환이 자동 집계됩니다. 아래 콘텐츠 커버리지는 정상 표시됩니다.
        </div>
      )}

      {/* KPI */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((k) => (
          <div key={k.l} className="rounded-2xl border border-[var(--a-e7ddd4)] bg-[var(--color-white)] p-4">
            <p className="text-[0.6875rem] font-bold text-[var(--a-6b5d57)]">{k.l}</p>
            <p className="mt-1.5 text-2xl font-black text-[var(--a-2e2724)]">{k.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        {/* TOP 질문 */}
        <div className="rounded-2xl border border-[var(--a-e7ddd4)] bg-[var(--color-white)] p-5">
          <h2 className="text-sm font-extrabold text-[var(--a-2e2724)]">가장 많이 본 질문 TOP 10</h2>
          {stats.top.length === 0 ? (
            <p className="mt-4 text-xs text-[var(--a-9c8d86)]">
              아직 집계된 이벤트가 없습니다. 사이트 배포 후 방문이 쌓이면 여기에 표시됩니다.
            </p>
          ) : (
            <div className="mt-4 space-y-2.5">
              {stats.top.map(([slug, s]) => {
                const max = stats.top[0][1].view + stats.top[0][1].play
                const v = s.view + s.play
                return (
                  <div key={slug} className="flex items-center gap-3 text-xs">
                    <span className="w-52 truncate text-[var(--a-4a403b)]">
                      {questions[slug] ?? slug}
                    </span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--a-f2eae3)]">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-[var(--a-a63d5a)] to-[var(--a-d98ba3)]"
                        style={{ width: `${(v / max) * 100}%` }}
                      />
                    </span>
                    <span className="w-14 text-right font-mono text-[0.6875rem] text-[var(--a-8a7b73)]">
                      {v.toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 커버리지 + 파트 비중 */}
        <div className="rounded-2xl border border-[var(--a-e7ddd4)] bg-[var(--color-white)] p-5">
          <h2 className="text-sm font-extrabold text-[var(--a-2e2724)]">콘텐츠 제작 커버리지</h2>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {[
              [`${coverage.total}`, '본문(문)'],
              [`${coverage.withAudio}/${coverage.total}`, 'TTS 음성'],
              [`${coverage.withEn}/${coverage.total}`, '영문 자막'],
              [`${coverage.cueCount}`, '자막 큐'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-xl bg-[var(--a-fcfaf8)] p-3 text-center">
                <p className="text-lg font-black text-[var(--a-a63d5a)]">{v}</p>
                <p className="text-[0.625rem] text-[var(--a-6b5d57)]">{l}</p>
              </div>
            ))}
          </div>

          <h2 className="mt-6 text-sm font-extrabold text-[var(--a-2e2724)]">파트별 소비 비중</h2>
          <div className="mt-3 space-y-2">
            {parts.map((p) => {
              const v = stats.perPart.get(p.part) ?? 0
              const total = [...stats.perPart.values()].reduce((a, b) => a + b, 0) || 1
              return (
                <div key={p.part} className="flex items-center gap-2.5 text-xs">
                  <span className="w-32 truncate text-[var(--a-4a403b)]">
                    P{p.part} {p.title}
                  </span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--a-f2eae3)]">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${(v / total) * 100}%`,
                        background: PART_THEME[p.part].accent,
                      }}
                    />
                  </span>
                  <span className="w-10 text-right font-mono text-[0.625rem] text-[var(--a-8a7b73)]">
                    {total > 1 ? `${Math.round((v / total) * 100)}%` : '—'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard(props: DashboardProps) {
  return (
    <AdminShell active="/admin/dashboard" title="100문100답 통계" wide>
      <AdminGate title="100문100답 통계">{() => <AdminDashboard {...props} />}</AdminGate>
    </AdminShell>
  )
}
