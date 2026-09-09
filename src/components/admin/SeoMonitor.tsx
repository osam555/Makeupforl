'use client'

import { useState } from 'react'
import { Loader2, Save, TrendingUp } from 'lucide-react'

import {
  SEO_TARGETS,
  VOLUME_MEASURED_AT,
  isStale,
  rankAchievement,
  readiness,
  type SeoConfig,
  type SeoFacts,
  type SeoRank,
} from '@/lib/seoTargets'

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
  auth,
}: {
  facts: Record<string, SeoFacts>
  initial: SeoConfig
  auth: () => Promise<{ idToken: string } | { password: string | null }>
}) {
  const [ranks, setRanks] = useState<Record<string, SeoRank>>(initial.ranks)
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
      setMsg({ ok: true, text: `저장했습니다. 검색어 ${j.saved}개` })
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  const totalVolume = SEO_TARGETS.reduce((a, t) => a + t.volume, 0)
  const avgReadiness = Math.round(
    SEO_TARGETS.reduce((a, t) => a + readiness(facts[t.term]).score, 0) / SEO_TARGETS.length,
  )

  return (
    <div className="space-y-5">
      {/* 요약 */}
      {/* 좁은 화면에서 두 칸씩 — 하나씩 떨어지면 요약만으로 화면이 다 찬다 */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <div className="rounded-xl border border-[#E0D6CC] bg-white p-3.5 sm:p-4">
          <p className="text-[0.6875rem] font-bold tracking-wider text-[#8A7A72]">노리는 검색량</p>
          <p className="mt-1 text-2xl font-extrabold text-[#2E2724]">
            {totalVolume.toLocaleString()}
            <span className="ml-1 text-sm font-bold text-[#8A7A72]">회/월</span>
          </p>
          <p className="mt-1 text-[0.6875rem] text-[#8A7A72]">
            네이버 키워드도구 {VOLUME_MEASURED_AT} 기준
          </p>
        </div>
        <div className="rounded-xl border border-[#E0D6CC] bg-white p-3.5 sm:p-4">
          <p className="text-[0.6875rem] font-bold tracking-wider text-[#8A7A72]">평균 준비도</p>
          <p className="mt-1 text-2xl font-extrabold text-[#2E2724]">{avgReadiness}%</p>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-[#8A7A72]">
            우리가 할 수 있는 것을 얼마나 했는가. 순위가 아니다
          </p>
        </div>
        <div className="rounded-xl border border-[#E0D6CC] bg-white p-3.5 sm:p-4">
          <p className="text-[0.6875rem] font-bold tracking-wider text-[#8A7A72]">순위 기록</p>
          <p className="mt-1 text-2xl font-extrabold text-[#2E2724]">
            {SEO_TARGETS.filter((t) => !isStale(ranks[t.term]?.checkedAt ?? '')).length} /{' '}
            {SEO_TARGETS.length}
          </p>
          <p className="mt-1 text-[0.6875rem] text-[#8A7A72]">최근 30일 안에 재 본 검색어</p>
        </div>
      </div>

      {SEO_TARGETS.map((t) => {
        const f = facts[t.term]
        const r = ranks[t.term] ?? { naver: null, google: null, checkedAt: '', goal: 10, note: '' }
        const ready = readiness(f)
        const ach = rankAchievement(r)
        const stale = isStale(r.checkedAt)

        return (
          <div key={t.term} className="rounded-xl border border-[#E0D6CC] bg-[#FBF8F5] p-3.5 sm:p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <b className="text-[0.9375rem] text-[#2E2724]">{t.term}</b>
              <span className="text-xs font-bold text-[#A63D5A]">
                월 {t.volume.toLocaleString()}회
              </span>
              <span className="hidden text-xs text-[#8A7A72] sm:inline">담당 {t.owner}</span>
              <span className="ml-auto text-xs font-bold text-[#3A322E]">
                준비도 {ready.score}%
                {ach !== null && <span className="ml-2 text-[#A63D5A]">달성도 {ach}%</span>}
              </span>
            </div>

            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#E7DDD4]">
              <div
                className="h-full rounded-full bg-[#A63D5A]"
                style={{ width: `${ready.score}%` }}
              />
            </div>

            <p className="mt-2 text-[0.6875rem] leading-relaxed text-[#8A7A72]">
              <span className="sm:hidden">담당 {t.owner} · </span>
              {t.why}
            </p>

            {/* 우리가 아는 것 */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.6875rem] text-[#6B5D57]">
              <span>
                본문 <b className="text-[#2E2724]">{f.ownerChars.toLocaleString()}자</b>
              </span>
              <span>
                뒷받침 문항 <b className="text-[#2E2724]">{f.questions}개</b>
              </span>
              <span>
                내부 링크 <b className="text-[#2E2724]">{f.inboundLinks}개</b>
              </span>
              <span>
                제목 보유 페이지{' '}
                <b className={f.titlePages.length > 1 ? 'text-[#A63D5A]' : 'text-[#2E2724]'}>
                  {f.titlePages.length}개
                </b>
                {f.titlePages.length > 1 && (
                  <span className="text-[#A63D5A]"> — {f.titlePages.join(', ')}</span>
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
                  <span className="text-[0.6875rem] font-bold text-[#3A322E]">{label}</span>
                  <input
                    type="number"
                    min={1}
                    value={(r[key] ?? '') as number | ''}
                    onChange={(e) =>
                      set(t.term, { [key]: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder={key === 'goal' ? '10' : '못 찾음'}
                    className="mt-1 h-8 w-full rounded-md border border-[#D4C7BE] bg-white px-2 text-xs outline-none focus:border-[#A63D5A]"
                  />
                </label>
              ))}
              <label className="block">
                <span className="text-[0.6875rem] font-bold text-[#3A322E]">
                  잰 날 {stale && r.checkedAt && <span className="text-[#A63D5A]">· 오래됨</span>}
                </span>
                <input
                  value={r.checkedAt}
                  onChange={(e) => set(t.term, { checkedAt: e.target.value })}
                  placeholder="2026-09-09"
                  className="mt-1 h-8 w-full rounded-md border border-[#D4C7BE] bg-white px-2 font-mono text-xs outline-none focus:border-[#A63D5A]"
                />
              </label>
              <label className="col-span-2 block sm:col-span-1">
                <span className="text-[0.6875rem] font-bold text-[#3A322E]">메모</span>
                <input
                  value={r.note}
                  onChange={(e) => set(t.term, { note: e.target.value })}
                  placeholder="상단이 파워링크뿐 등"
                  className="mt-1 h-8 w-full rounded-md border border-[#D4C7BE] bg-white px-2 text-xs outline-none focus:border-[#A63D5A]"
                />
              </label>
            </div>

            {/* 달성 방안 — 준비도에서 빠진 것이 그대로 할 일이 된다 */}
            {ready.todo.length > 0 && (
              <ul className="mt-3 space-y-1 rounded-lg border border-[#E8DFD7] bg-white p-3">
                {ready.todo.map((x, i) => (
                  <li key={i} className="flex gap-2 text-[0.7188rem] leading-relaxed text-[#3A322E]">
                    <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-[#A63D5A]" />
                    {x}
                  </li>
                ))}
              </ul>
            )}
            {ready.todo.length === 0 && (
              <p className="mt-3 rounded-lg border border-[#DCE8E0] bg-white p-3 text-[0.7188rem] text-[#3F6B57]">
                할 수 있는 것은 다 했습니다. 이제는 색인과 시간의 문제입니다 — 4주 뒤 순위를 다시
                재 보세요.
              </p>
            )}
          </div>
        )
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-[#2E2724] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          순위 기록 저장
        </button>
        {msg && (
          <span className={`text-xs ${msg.ok ? 'text-[#3F6B57]' : 'text-[#A63D5A]'}`}>
            {msg.text}
          </span>
        )}
        <span className="ml-auto inline-flex items-center gap-1.5 text-[0.6875rem] text-[#8A7A72]">
          <TrendingUp className="h-3.5 w-3.5" />
          순위는 네이버·구글에서 직접 검색해 보고 적어 주세요
        </span>
      </div>
    </div>
  )
}
