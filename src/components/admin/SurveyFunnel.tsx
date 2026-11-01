'use client'

import { useEffect, useState } from 'react'

import { getDb } from '@/lib/firebase/client'
import { Chips, Empty, Note, Panel } from '@/components/admin/AdminUI'
import { SURVEY_COLLECTION, choices, funnel, type SurveyDay } from '@/lib/surveyStats'

const kstDay = (offset: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(Date.now() - offset * 86400_000),
  )

/**
 * 설문 단계별 이탈 — 상담 목록 위에 둔다. 접수된 분만 보면 "연락처 칸까지 와서 그냥 간 분"이
 * 안 보이기 때문이다. 숫자는 익명 증가값(survey_daily)이라 누가 그랬는지는 알 수 없다.
 */
export default function SurveyFunnel() {
  const [range, setRange] = useState<7 | 30>(7)
  const [days, setDays] = useState<SurveyDay[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const db = getDb()
        if (!db) throw new Error('Firebase 가 설정되지 않았습니다.')
        const { collection, documentId, getDocs, query, where } = await import('firebase/firestore')
        const snap = await getDocs(
          query(collection(db, SURVEY_COLLECTION), where(documentId(), '>=', kstDay(range - 1))),
        )
        if (alive) setDays(snap.docs.map((d) => d.data() as SurveyDay))
      } catch (e) {
        if (alive) setErr(`설문 통계를 읽지 못했습니다 — ${e instanceof Error ? e.message : String(e)} (보안 규칙 배포가 필요할 수 있습니다)`)
      }
    })()
    return () => {
      alive = false
    }
  }, [range])

  const f = days ? funnel(days) : null
  const max = f ? Math.max(1, f.rows[0].count) : 1
  const worries = days ? choices(days, 'worryChoice').slice(0, 5) : []

  return (
    <Panel
      title="설문 단계별 이탈"
      hint="2026-11-01부터 셉니다 · 익명"
      action={
        <Chips
          value={range}
          onChange={(v) => {
            setDays(null)
            setRange(v)
          }}
          options={[
            [7, '7일'],
            [30, '30일'],
          ] as const}
        />
      }
    >
      {err ? (
        <Note kind="err">{err}</Note>
      ) : !f ? (
        <Empty>읽는 중…</Empty>
      ) : f.rows[0].count === 0 ? (
        <Empty>아직 기록이 없습니다</Empty>
      ) : (
        <div className="space-y-3">
          <ul className="space-y-1.5">
            {f.rows.map((r) => (
              <li key={r.key} className="text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[var(--a-2e2724)]">{r.label}</span>
                  <span className="font-bold tabular-nums text-[var(--a-2e2724)]">
                    {r.count}명
                    {r.keep !== null && <span className="ml-1.5 text-xs font-normal text-[var(--a-8a7a72)]">({r.keep}% 남음)</span>}
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-[var(--a-f3ede7)]">
                  <div className="h-2 rounded-full bg-[var(--a-a63d5a)]" style={{ width: `${(r.count / max) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
          {f.abandoned > 0 && (
            <Note kind="err">연락 받기를 눌러 놓고 제출하지 않은 분이 {f.abandoned}명입니다. 누구인지는 알 수 없습니다(입력값을 저장하지 않음).</Note>
          )}
          <p className="text-xs text-[var(--a-6b5d57)]">
            다른 길로 간 분: {f.side.map((s) => `${s.label} ${s.count}`).join(' · ')}
          </p>
          {worries.length > 0 && (
            <p className="text-xs text-[var(--a-6b5d57)]">
              많이 고른 걱정: {worries.map(([k, v]) => `${k.replace(/_/g, ' ')} ${v}`).join(' · ')}
            </p>
          )}
        </div>
      )}
    </Panel>
  )
}
