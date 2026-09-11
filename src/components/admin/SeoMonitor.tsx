'use client'

import { useState } from 'react'
import { Loader2, Plus, Save, Trash2, TrendingUp } from 'lucide-react'

import RankTrend, { type TrendWeeks } from '@/components/admin/RankTrend'

import {
  PRIORITY_LABEL,
  VOLUME_MEASURED_AT,
  measuredAtOf,
  priorityOf,
  sortKeywords,
  isStale,
  rankAchievement,
  todayKST,
  readiness,
  type SeoConfig,
  type SeoFacts,
  type SeoKeyword,
  type SeoPriority,
  type SeoRank,
  type SeoSnapshot,
} from '@/lib/seoKeywords'

/**
 * 검색어 목표와 달성도.
 *
 * 두 가지를 나란히 둔다.
 *
 *  왼쪽 — 우리가 아는 것. 이 말을 맡은 페이지가 있는지, 본문이 두꺼운지,
 *         여러 페이지가 같은 말을 다투지는 않는지. 사이트를 읽어 계산한다.
 *  오른쪽 — 밖에서 재야 아는 것. 네이버·구글에서 지금 몇 위인지. 사람이 적는다.
 *
 * 순위를 자동으로 가져오지 않는 이유는, 검색 결과를 긁는 일이 검색엔진 약관에
 * 걸리고 값도 자리·기기마다 달라 믿기 어렵기 때문이다. 대신 잰 날짜를 함께
 * 적게 하고, 오래되면 그렇다고 표시한다.
 */
export default function SeoMonitor({
  facts,
  initial,
  keywords: initialKeywords,
  history: initialHistory,
  linksCountedAt,
  auth,
}: {
  facts: Record<string, SeoFacts>
  initial: SeoConfig
  keywords: SeoKeyword[]
  /** 날짜별 순위 기록 — 저장할 때 잰 날 자리에 쌓인다 */
  history: SeoSnapshot[]
  /** 내부 링크를 센 날. 낡았으면 scripts/count-internal-links.py 를 다시 돌려야 한다 */
  linksCountedAt: string
  auth: () => Promise<{ idToken: string } | { password: string | null }>
}) {
  const [ranks, setRanks] = useState<Record<string, SeoRank>>(initial.ranks)
  const [keywords, setKeywords] = useState<SeoKeyword[]>(initialKeywords)
  const [history, setHistory] = useState<SeoSnapshot[]>(initialHistory)
  const [weeks, setWeeks] = useState<TrendWeeks>(4)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const set = (term: string, patch: Partial<SeoRank>) =>
    setRanks((r) => ({ ...r, [term]: { ...r[term], ...patch } }))

  const save = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/site/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await auth()), ranks }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setMsg({ ok: true, text: `순위를 저장했습니다. 검색어 ${j.saved}개` })
      /*
        서버가 잰 날 자리에 남긴 것을 화면에도 그대로 반영한다. 새로고침 전까지
        그래프가 옛 모양이면 "저장이 안 됐나" 하고 한 번 더 누르게 된다.
      */
      setHistory((h) => mergeRanks(h, ranks))
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  /*
    저장된 목록에 준비도가 없는 검색어가 있을 수 있다 — 방금 어드민에서 더한 말은
    다음 새로고침 전까지 사실이 계산돼 있지 않다. 그때 facts[term] 이 undefined 라
    readiness 가 터진다. 빈 사실로 채워 0점으로 보이게 한다.
  */
  const factsOf = (term: string): SeoFacts =>
    facts[term] ?? { ownerChars: 0, titlePages: [], questions: 0, openQuestions: 0, inboundLinks: 0 }

  const shown = sortKeywords(keywords)
  const totalVolume = keywords.reduce((a, t) => a + t.volume, 0)
  const avgReadiness = keywords.length
    ? Math.round(
        keywords.reduce((a, t) => a + readiness(factsOf(t.term)).score, 0) / keywords.length,
      )
    : 0

  const saveKeywords = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const res = await fetch('/api/site/seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(await auth()), action: 'keywords', keywords }),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setMsg({ ok: true, text: `목표 검색어 ${j.saved}개를 저장했습니다. 새로고침하면 준비도가 다시 계산됩니다.` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const setKw = (i: number, patch: Partial<SeoKeyword>) =>
    setKeywords((k) => k.map((x, n) => (n === i ? { ...x, ...patch } : x)))

  return (
    <div className="space-y-5">
      {/* 요약 */}
      {/* 좁은 화면에서 두 칸씩 — 하나씩 떨어지면 요약만으로 화면이 다 찬다 */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
          <p className="text-[0.6875rem] font-bold tracking-wider text-[var(--a-8a7a72)]">노리는 검색량</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--a-2e2724)]">
            {totalVolume.toLocaleString()}
            <span className="ml-1 text-sm font-bold text-[var(--a-8a7a72)]">회/월</span>
          </p>
          <p className="mt-1 text-[0.6875rem] text-[var(--a-8a7a72)]">
            {/* 검색어마다 잰 날이 다를 수 있다 — 가장 오래된 것을 적어 둔다 */}
            네이버 키워드도구 · 가장 오래 된 값 {
              keywords.length
                ? keywords.map(measuredAtOf).sort()[0]
                : VOLUME_MEASURED_AT
            } 기준
          </p>
        </div>
        <div className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
          <p className="text-[0.6875rem] font-bold tracking-wider text-[var(--a-8a7a72)]">평균 준비도</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--a-2e2724)]">{avgReadiness}%</p>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--a-8a7a72)]">
            우리가 할 수 있는 것을 얼마나 했는가. 순위가 아니다
          </p>
        </div>
        <div className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
          <p className="text-[0.6875rem] font-bold tracking-wider text-[var(--a-8a7a72)]">순위 기록</p>
          <p className="mt-1 text-2xl font-extrabold text-[var(--a-2e2724)]">
            {keywords.filter((t) => !isStale(ranks[t.term]?.checkedAt ?? '')).length} /{' '}
            {keywords.length}
          </p>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-[var(--a-8a7a72)]">
            최근 30일 안에 재 본 검색어
            <br />
            내부 링크는 {linksCountedAt} 에 셈
          </p>
        </div>
      </div>

      {/* 추세 창 — 검색어마다 따로 고르게 하면 서로 다른 기간을 견주게 된다 */}
      <div className="flex flex-wrap items-center gap-2 text-[0.6875rem] text-[var(--a-8a7a72)]">
        <span className="font-bold text-[var(--a-3a322e)]">순위 추세</span>
        {([1, 2, 4] as TrendWeeks[]).map((w) => (
          <button
            key={w}
            onClick={() => setWeeks(w)}
            className={[
              'rounded-full border px-2.5 py-1 font-bold',
              weeks === w
                ? 'border-[var(--a-2e2724)] bg-[var(--a-2e2724)] text-white'
                : 'border-[var(--a-d4c7be)] bg-white text-[var(--a-6b5d57)]',
            ].join(' ')}
          >
            {w}주
          </button>
        ))}
        <span>잰 날에만 점이 찍힙니다. 안 잰 날은 비워 둡니다</span>
      </div>

      {shown.map((t) => {
        const f = factsOf(t.term)
        const r = ranks[t.term] ?? { naver: null, google: null, checkedAt: '', goal: 10, note: '' }
        const ready = readiness(f)
        const ach = rankAchievement(r)
        const stale = isStale(r.checkedAt)

        return (
          <div key={t.term} className="rounded-xl border border-[var(--a-e0d6cc)] bg-[var(--a-fbf8f5)] p-3.5 sm:p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <b className="text-[0.9375rem] text-[var(--a-2e2724)]">{t.term}</b>
              <span className="text-xs font-bold text-[var(--a-a63d5a)]">
                월 {t.volume.toLocaleString()}회
              </span>
              {/* 순서가 곧 '무엇부터' 라, 왜 그 자리인지가 보여야 한다 */}
              <span
                className={[
                  'rounded-full px-2 py-0.5 text-[0.6875rem] font-bold',
                  priorityOf(t) === 1
                    ? 'bg-[var(--a-f6e9ed)] text-[var(--a-a63d5a)]'
                    : priorityOf(t) === 3
                      ? 'bg-[var(--a-efe7df)] text-[var(--a-8a7a72)]'
                      : 'bg-[var(--a-dce8e0)] text-[var(--a-3f6b57)]',
                ].join(' ')}
              >
                {PRIORITY_LABEL[priorityOf(t)]}
              </span>
              <span className="hidden text-xs text-[var(--a-8a7a72)] sm:inline">담당 {t.owner}</span>
              <span className="ml-auto text-xs font-bold text-[var(--a-3a322e)]">
                준비도 {ready.score}%
                {ach !== null && <span className="ml-2 text-[var(--a-a63d5a)]">달성도 {ach}%</span>}
              </span>
            </div>

            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[var(--a-e7ddd4)]">
              <div
                className="h-full rounded-full bg-[var(--a-a63d5a)]"
                style={{ width: `${ready.score}%` }}
              />
            </div>

            <p className="mt-2 text-[0.6875rem] leading-relaxed text-[var(--a-8a7a72)]">
              <span className="sm:hidden">담당 {t.owner} · </span>
              {t.why}
            </p>

            {/* 우리가 아는 것 */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-[var(--a-6b5d57)]">
              <span>
                본문 <b className="text-[var(--a-2e2724)]">{f.ownerChars.toLocaleString()}자</b>
              </span>
              <span>
                뒷받침 문항 <b className="text-[var(--a-2e2724)]">{f.questions}개</b>
                {/* 잠긴 문항은 검색에 거의 안 나간다 — 셋을 채워도 열린 게 없으면 빨갛게 */}
                <span className={f.questions > 0 && f.openQuestions === 0 ? 'text-[var(--a-a63d5a)]' : ''}>
                  {' '}· 무료 {f.openQuestions}개
                </span>
              </span>
              <span>
                내부 링크 <b className="text-[var(--a-2e2724)]">{f.inboundLinks}개</b>
              </span>
              <span>
                제목 보유 페이지{' '}
                <b className={f.titlePages.length > 1 ? 'text-[var(--a-a63d5a)]' : 'text-[var(--a-2e2724)]'}>
                  {f.titlePages.length}개
                </b>
                {f.titlePages.length > 1 && (
                  <span className="text-[var(--a-a63d5a)]"> — {f.titlePages.join(', ')}</span>
                )}
              </span>
            </div>

            {/* 밖에서 재야 아는 것 */}
            {/*
              좁은 화면에서는 두 칸씩.

              순위 세 개와 날짜·메모를 한 줄에 다섯으로 두면 휴대전화에서 세로로
              길게 늘어져, 검색어 하나가 화면 하나를 다 먹는다. 메모만 한 줄을
              통째로 쓴다 — 짧게 적을 칸이 아니다.
            */}
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {(
                [
                  ['네이버 순위', 'naver'],
                  ['구글 순위', 'google'],
                  ['목표 순위', 'goal'],
                ] as const
              ).map(([label, key]) => (
                <label key={key} className="block">
                  <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">{label}</span>
                  <input
                    type="number"
                    min={1}
                    value={(r[key] ?? '') as number | ''}
                    onChange={(e) =>
                      set(t.term, { [key]: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder={key === 'goal' ? '10' : '못 찾음'}
                    className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-xs outline-none focus:border-[var(--a-a63d5a)]"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">
                  잰 날 {stale && r.checkedAt && <span className="text-[var(--a-a63d5a)]">· 오래됨</span>}
                </span>
                <input
                  value={r.checkedAt}
                  onChange={(e) => set(t.term, { checkedAt: e.target.value })}
                  placeholder="2026-09-09"
                  className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 font-mono text-xs outline-none focus:border-[var(--a-a63d5a)]"
                />
              </label>
              <label className="col-span-2 block sm:col-span-1">
                <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">메모</span>
                <input
                  value={r.note}
                  onChange={(e) => set(t.term, { note: e.target.value })}
                  placeholder="상단이 파워링크뿐 등"
                  className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-xs outline-none focus:border-[var(--a-a63d5a)]"
                />
              </label>
            </div>

            <RankTrend term={t.term} history={history} weeks={weeks} goal={r.goal} />

            {/* 달성 방안 — 준비도에서 빠진 것이 그대로 할 일이 된다 */}
            {ready.todo.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-lg border border-[var(--a-e8dfd7)] bg-white p-3">
                {ready.todo.map((x, i) => (
                  <li key={i} className="flex gap-2 text-[0.7188rem] leading-relaxed text-[var(--a-3a322e)]">
                    <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[var(--a-a63d5a)]" />
                    {x}
                  </li>
                ))}
              </ul>
            )}
            {ready.todo.length === 0 && (
              <p className="mt-3 rounded-lg border border-[var(--a-dce8e0)] bg-white p-3 text-[0.7188rem] text-[var(--a-3f6b57)]">
                할 수 있는 것은 다 했습니다. 이제는 색인과 시간의 문제입니다 — 4주 뒤 순위를 다시
                재 보세요.
              </p>
            )}
          </div>
        )
      })}

      {/*
        목표 검색어 목록 편집.

        순위 기록과 저장 단추를 따로 둔다. 하나로 묶으면 순위 한 칸을 고치려다
        목록까지 함께 저장되고, 실수로 지운 줄이 그때 함께 사라진다.
      */}
      <div className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-sm font-extrabold text-[var(--a-2e2724)]">키워드 관리</h3>
          <span className="text-[0.6875rem] text-[var(--a-8a7a72)]">
            여기서 고친 것이 진짜 목록입니다. 저장하지 않으면 코드의 시드가 쓰입니다
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {keywords.map((t, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--a-e8dfd7)] bg-[var(--a-fbf8f5)] p-2.5 sm:grid-cols-14"
            >
              <label className="col-span-2 sm:col-span-3">
                <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">검색어</span>
                <input
                  value={t.term}
                  onChange={(e) => setKw(i, { term: e.target.value })}
                  className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-xs outline-none focus:border-[var(--a-a63d5a)]"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">월 검색량</span>
                <input
                  inputMode="numeric"
                  value={t.volume}
                  onChange={(e) => setKw(i, { volume: Number(e.target.value) || 0 })}
                  className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-xs tabular-nums outline-none focus:border-[var(--a-a63d5a)]"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">우선순위</span>
                <select
                  value={priorityOf(t)}
                  onChange={(e) => setKw(i, { priority: Number(e.target.value) as SeoPriority })}
                  className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-xs outline-none focus:border-[var(--a-a63d5a)]"
                >
                  <option value={1}>높음</option>
                  <option value={2}>보통</option>
                  <option value={3}>낮음</option>
                </select>
              </label>
              <label className="sm:col-span-2">
                <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">언제 쟀나</span>
                <input
                  value={t.measuredAt ?? ''}
                  onChange={(e) => setKw(i, { measuredAt: e.target.value })}
                  placeholder={VOLUME_MEASURED_AT}
                  className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-xs tabular-nums outline-none focus:border-[var(--a-a63d5a)]"
                />
              </label>
              <label className="sm:col-span-2">
                <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">맡은 페이지</span>
                <input
                  value={t.owner}
                  onChange={(e) => setKw(i, { owner: e.target.value })}
                  placeholder="/혼주한복"
                  className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-xs outline-none focus:border-[var(--a-a63d5a)]"
                />
              </label>
              <label className="col-span-2 sm:col-span-2">
                <span className="text-[0.6875rem] font-bold text-[var(--a-3a322e)]">왜 그 장인가</span>
                <input
                  value={t.why}
                  onChange={(e) => setKw(i, { why: e.target.value })}
                  className="mt-1 h-8 w-full rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-xs outline-none focus:border-[var(--a-a63d5a)]"
                />
              </label>
              <div className="col-span-2 flex items-end justify-end sm:col-span-1">
                <button
                  onClick={() => setKeywords((k) => k.filter((_, n) => n !== i))}
                  aria-label={`${t.term} 지우기`}
                  className="inline-flex h-8 items-center gap-1 rounded-md border border-[var(--a-d4c7be)] bg-white px-2 text-[0.6875rem] font-bold text-[var(--a-8a7a72)] hover:border-[var(--a-a63d5a)] hover:text-[var(--a-a63d5a)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  지우기
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={() =>
              setKeywords((k) => [
              ...k,
              { term: '', volume: 0, owner: '', why: '', priority: 2, measuredAt: todayKST() },
            ])
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[var(--a-d4c7be)] px-3 py-2 text-xs font-bold text-[var(--a-6b5d57)]"
          >
            <Plus className="h-3.5 w-3.5" />
            키워드 추가
          </button>
          <button
            onClick={() => void saveKeywords()}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--a-a63d5a)] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            키워드 저장
          </button>
          <span className="text-[0.6875rem] leading-relaxed text-[var(--a-8a7a72)]">
            검색량은 네이버 검색광고 키워드도구에서 재 옵니다
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--a-2e2724)] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          순위 기록 저장
        </button>
        {msg && (
          <span className={`text-xs ${msg.ok ? 'text-[var(--a-3f6b57)]' : 'text-[var(--a-a63d5a)]'}`}>
            {msg.text}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[0.6875rem] text-[var(--a-8a7a72)]">
          <TrendingUp className="h-3.5 w-3.5" />
          순위는 네이버·구글에서 직접 검색해 보고 적어 주세요
        </span>
      </div>
    </div>
  )
}

/** 방금 저장한 순위를 잰 날 자리에 끼워 넣는다 — 서버가 seo_snapshots 에 하는 일과 같은 모양 */
function mergeRanks(history: SeoSnapshot[], ranks: Record<string, SeoRank>): SeoSnapshot[] {
  const byDate = new Map(history.map((s) => [s.date, { ...s, naver: { ...s.naver }, google: { ...s.google } }]))
  for (const [term, r] of Object.entries(ranks)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.checkedAt)) continue
    const s = byDate.get(r.checkedAt) ?? { date: r.checkedAt, readiness: {}, naver: {}, google: {} }
    s.naver[term] = r.naver
    s.google[term] = r.google
    byDate.set(r.checkedAt, s)
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
}
