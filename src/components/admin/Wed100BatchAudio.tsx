'use client'

import { useCallback, useRef, useState } from 'react'
import { CheckCircle2, Loader2, RefreshCw, Search, XCircle } from 'lucide-react'

import { whenExact, whenText } from '@/lib/when'

interface Row {
  slug: string
  part: number
  question: string
  cues: number
  sentences: number
  updatedAt: string | null
  audioAt: string | null
  reasons: string[]
}

type State = 'wait' | 'run' | 'done' | 'error'

/**
 * 본문이 바뀐 문항의 원장 음성 일괄 재생성.
 *
 * 본문을 고쳐도 음성은 그대로 남기 때문에, 화면에는 새 글이 소리로는 옛 글이 나가는
 * 문항이 쌓인다. 눈으로는 구분되지 않아 한 건씩 찾기 어렵다. 여기서 그런 문항을
 * 한 번에 찾아 원장 답변만 다시 만든다.
 *
 * 질문은 기존 음성에서 그대로 잘라 쓴다. Typecast 사용량이 들지 않고, 같은 문장이라도
 * 합성할 때마다 억양이 달라져 앞뒤가 어긋나 들리는 일도 없다.
 */
export default function Wed100BatchAudio({
  auth,
  onDone,
}: {
  /** 저장 API 인증 정보 — 구글 로그인이면 ID 토큰, 아니면 비밀번호 */
  auth: () => Promise<{ idToken: string } | { password: string | null }>
  onDone: () => void
}) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [state, setState] = useState<Record<string, State>>({})
  const [note, setNote] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const stopRef = useRef(false)

  const scan = useCallback(async () => {
    setScanning(true)
    setErr(null)
    try {
      const res = await fetch('/api/wed100/stale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(await auth()),
      })
      const j = await res.json()
      if (!j.ok) throw new Error(j.error)
      setRows(j.rows as Row[])
      setPicked(new Set((j.rows as Row[]).map((r) => r.slug)))
      setState({})
      setNote({})
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setScanning(false)
    }
  }, [auth])

  const run = useCallback(async () => {
    if (!rows) return
    const targets = rows.filter((r) => picked.has(r.slug))
    if (targets.length === 0) return
    if (
      !confirm(
        `${targets.length}개 문항의 원장 음성을 현재 본문 기준으로 다시 만듭니다.\n\n` +
          '질문 음성은 기존 것을 그대로 씁니다.\n' +
          '한 건에 10~30초 걸리므로 창을 닫지 마세요. 계속할까요?',
      )
    )
      return

    stopRef.current = false
    setBusy(true)
    try {
      for (const r of targets) {
        if (stopRef.current) break
        setState((s) => ({ ...s, [r.slug]: 'run' }))
        try {
          const res = await fetch('/api/wed100/tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...(await auth()),
              slug: r.slug,
              question: r.question,
              // 자막이 아니라 본문을 기준으로 서버가 다시 나눈 문장을 쓴다
              cues: null,
              fromAnswer: true,
              reuseQuestion: true,
              commit: true,
            }),
          })
          const j = await res.json()
          if (!j.ok) throw new Error(j.error)
          if (!j.saved) throw new Error('음성은 만들었지만 저장되지 않았습니다.')
          setState((s) => ({ ...s, [r.slug]: 'done' }))
          setNote((n) => ({ ...n, [r.slug]: `${Math.round(j.duration)}초 · 자막 ${j.cues.length}줄` }))
        } catch (e) {
          setState((s) => ({ ...s, [r.slug]: 'error' }))
          setNote((n) => ({ ...n, [r.slug]: e instanceof Error ? e.message : String(e) }))
        }
      }
    } finally {
      setBusy(false)
      onDone()
    }
  }, [rows, picked, auth, onDone])

  const toggle = (slug: string) =>
    setPicked((p) => {
      const next = new Set(p)
      if (next.has(slug)) next.delete(slug)
      else next.add(slug)
      return next
    })

  const done = Object.values(state).filter((s) => s === 'done').length
  const failed = Object.values(state).filter((s) => s === 'error').length

  return (
    <div className="rounded-xl border border-[#E0D6CC] bg-[#FBF8F5] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <RefreshCw className="h-4 w-4 text-[#8A7A72]" />
        <b className="text-sm text-[#3A322E]">일괄 음성 재생성</b>
        <span className="text-xs text-[#8A7A72]">본문이 바뀌었는데 음성이 옛 것인 문항</span>
        <button
          onClick={() => void scan()}
          disabled={scanning || busy}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-md border border-[#D4C7BE] bg-white px-3 text-xs font-medium text-[#3A322E] hover:bg-[#F5EFE9] disabled:opacity-50"
        >
          {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
          {scanning ? '찾는 중…' : '다시 만들 문항 찾기'}
        </button>
      </div>

      {err && <p className="mt-3 text-xs text-red-700">{err}</p>}

      {rows && rows.length === 0 && (
        <p className="mt-3 text-xs text-[#6B5D57]">모든 문항의 음성이 본문과 맞습니다.</p>
      )}

      {rows && rows.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[#6B5D57]">
            <span>
              {rows.length}개 발견 · <b>{picked.size}개</b> 선택
            </span>
            <button onClick={() => setPicked(new Set(rows.map((r) => r.slug)))} className="underline">
              전체 선택
            </button>
            <button onClick={() => setPicked(new Set())} className="underline">
              전체 해제
            </button>
            {(done > 0 || failed > 0) && (
              <span className="ml-auto">
                완료 {done}
                {failed > 0 && <span className="text-red-700"> · 실패 {failed}</span>}
              </span>
            )}
          </div>

          <div className="mt-2 max-h-[46vh] overflow-auto rounded-lg border border-[#E8DFD7] bg-white">
            {rows.map((r) => {
              const st = state[r.slug]
              return (
                <label
                  key={r.slug}
                  className="flex cursor-pointer items-start gap-2.5 border-b border-[#F0EAE4] px-3 py-2 last:border-0 hover:bg-[#FBF8F5]"
                >
                  <input
                    type="checkbox"
                    checked={picked.has(r.slug)}
                    onChange={() => toggle(r.slug)}
                    disabled={busy}
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-[#3A322E]">
                      <span className="text-[#8A7A72]">{r.slug}</span> · {r.question}
                    </div>
                    <div className="mt-0.5 text-[11px] text-[#8A7A72]">
                      <span title={whenExact(r.updatedAt)}>본문 {whenText(r.updatedAt)}</span>
                      <span className="px-1.5 text-[#D4C7BE]">|</span>
                      <span title={whenExact(r.audioAt)}>음성 {whenText(r.audioAt)}</span>
                      <span className="px-1.5 text-[#D4C7BE]">|</span>
                      {r.reasons.join(' · ')}
                      {r.cues !== r.sentences && ` · 자막 ${r.cues}줄 → ${r.sentences}줄로 다시 나눔`}
                      {note[r.slug] && ` · ${note[r.slug]}`}
                    </div>
                  </div>
                  <div className="mt-0.5 w-4 shrink-0">
                    {st === 'run' && <Loader2 className="h-4 w-4 animate-spin text-[#8A7A72]" />}
                    {st === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    {st === 'error' && <XCircle className="h-4 w-4 text-red-600" />}
                  </div>
                </label>
              )
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={() => void run()}
              disabled={busy || picked.size === 0}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-[#221D1B] px-4 text-xs font-medium text-white hover:bg-[#3A322E] disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {busy ? `만드는 중… (${done + failed}/${picked.size})` : `선택한 ${picked.size}개 다시 만들기`}
            </button>
            {busy && (
              <button
                onClick={() => (stopRef.current = true)}
                className="h-9 rounded-md border border-[#D4C7BE] px-3 text-xs text-[#6B5D57] hover:bg-white"
              >
                이번 건까지만 하고 멈추기
              </button>
            )}
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-[#8A7A72]">
            원장 답변만 새로 만들고 질문 음성은 기존 것을 그대로 씁니다. 자막 타임코드도 함께
            맞춰지며 결과는 바로 사이트에 반영됩니다.
          </p>
        </>
      )}
    </div>
  )
}
