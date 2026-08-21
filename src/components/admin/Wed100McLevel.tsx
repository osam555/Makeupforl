'use client'

import { useCallback, useRef, useState } from 'react'
import { Volume2, Loader2, CheckCircle2, XCircle } from 'lucide-react'

import { uploadAudio } from '@/lib/firebase/client'
import { raiseMcLevel } from '@/lib/wed100-mc-level'
import type { Wed100Item } from '@/types/wed100'

interface Row {
  slug: string
  state: 'done' | 'skip' | 'error'
  message: string
}

/**
 * MC(진행자) 음량 맞추기.
 *
 * Typecast 로 만든 질문 음성이 원장님 답변보다 평균 9dB 조용해서, 이미 만들어 둔
 * 음성 파일의 앞쪽 MC 구간만 키워 다시 올린다. 답변 구간은 바이트 그대로 두므로
 * 음질이 떨어지지 않는다.
 */
export default function Wed100McLevel({
  items,
  googleEmail,
  auth,
  onDone,
}: {
  items: Wed100Item[]
  googleEmail: string | null
  /** 저장 API 인증 정보 — 구글 로그인이면 ID 토큰, 아니면 비밀번호 */
  auth: () => Promise<{ idToken: string } | { password: string | null }>
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [at, setAt] = useState(0)
  const stopRef = useRef(false)

  const targets = items.filter((x) => x.audio && x.questionAudio && x.questionAudio.end > 0)

  const run = useCallback(async () => {
    if (!googleEmail) return
    setBusy(true)
    setRows([])
    setAt(0)
    stopRef.current = false
    const ctx = new AudioContext({ sampleRate: 24000 })

    for (let i = 0; i < targets.length; i++) {
      if (stopRef.current) break
      const item = targets[i]
      setAt(i + 1)
      try {
        // Storage 중계가 간헐적으로 502 를 내서 몇 번 다시 시도한다
        let buf: ArrayBuffer | null = null
        let lastStatus = 0
        for (let tryN = 0; tryN < 3 && !buf; tryN++) {
          if (tryN) await new Promise((r) => setTimeout(r, 1200 * tryN))
          const res = await fetch(`/api/wed100/audio?slug=${encodeURIComponent(item.slug)}`)
          lastStatus = res.status
          if (res.ok) buf = await res.arrayBuffer()
        }
        if (!buf) throw new Error(`음성을 받지 못했습니다 (${lastStatus}, 3번 시도)`)

        const fixed = await raiseMcLevel(buf, item.questionAudio!.end, ctx)
        if (!fixed) {
          setRows((v) => [...v, { slug: item.slug, state: 'skip', message: '이미 음량이 맞습니다' }])
          continue
        }

        const url = await uploadAudio(item.slug, fixed.blob)

        // 같은 경로에 덮어써도 Storage 가 내려받기 토큰을 그대로 유지해서
        // 주소가 바뀌지 않는다. 그럴 땐 DB 에 쓸 것도 없다.
        if (url !== item.audio) {
          const save = await fetch('/api/wed100/save', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              ...(await auth()),
              action: 'audioUrl',
              slug: item.slug,
              audio: url,
            }),
          })
          // 서버가 본문 없이 죽는 경우가 있어 text 로 먼저 받는다 —
          // 그래야 'Unexpected end of JSON input' 대신 실제 상태를 볼 수 있다
          const text = await save.text()
          let j: { ok?: boolean; error?: string } = {}
          try {
            j = text ? JSON.parse(text) : {}
          } catch {
            throw new Error(`주소 저장 응답이 이상합니다 (HTTP ${save.status}) ${text.slice(0, 80)}`)
          }
          if (!j.ok) throw new Error(j.error ?? `주소를 저장하지 못했습니다 (HTTP ${save.status})`)
        }

        setRows((v) => [
          ...v,
          {
            slug: item.slug,
            state: 'done',
            message: `${fixed.beforeDb.toFixed(1)} → ${fixed.afterDb.toFixed(1)} dB (${fixed.gainDb >= 0 ? '+' : ''}${fixed.gainDb.toFixed(1)})`,
          },
        ])
      } catch (e) {
        setRows((v) => [
          ...v,
          { slug: item.slug, state: 'error', message: e instanceof Error ? e.message : '실패' },
        ])
      }
    }
    void ctx.close()
    setBusy(false)
    onDone()
  }, [targets, googleEmail, auth, onDone])

  const done = rows.filter((r) => r.state === 'done').length
  const skip = rows.filter((r) => r.state === 'skip').length
  const bad = rows.filter((r) => r.state === 'error')

  return (
    <div className="rounded-xl border border-[#E7DDD4] bg-[#FCFAF8] p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold text-[#6B5D57]">MC 음량 맞추기</p>
        <span className="text-[11px] text-[#8A7C74]">음성 있는 문항 {targets.length}개</span>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#8A7C74]">
        진행자 질문이 원장님 답변보다 평균 9dB 작습니다. 각 파일의 앞쪽 질문 구간만 재서
        답변과 같은 음량으로 올립니다. 답변 구간은 손대지 않아 음질이 그대로입니다.
      </p>

      {!googleEmail && (
        <p className="mt-2 rounded-lg bg-[#FDF3E7] px-3 py-2 text-[11px] leading-relaxed text-[#8A6A48]">
          음성을 다시 올리려면 <b>관리자 구글 계정 로그인</b>이 필요합니다.
        </p>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void run()}
          disabled={busy || !googleEmail || targets.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-[#A63D5A] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#8E3049] disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Volume2 className="h-3.5 w-3.5" />}
          {busy ? `${at} / ${targets.length} 처리 중…` : `${targets.length}개 음량 맞추기`}
        </button>
        {busy && (
          <button
            onClick={() => (stopRef.current = true)}
            className="rounded-lg border border-[#E7DDD4] px-3 py-2 text-xs font-bold text-[#6B5D57]"
          >
            멈추기
          </button>
        )}
        {rows.length > 0 && (
          <span className="text-[11px] font-bold text-[#6B5D57]">
            고침 {done} · 건너뜀 {skip}
            {bad.length > 0 && <span className="text-[#C0392B]"> · 실패 {bad.length}</span>}
          </span>
        )}
      </div>

      {rows.length > 0 && (
        <div className="mt-2.5 max-h-52 overflow-y-auto rounded-lg border border-[#E7DDD4] bg-white">
          {rows.map((r) => (
            <div
              key={r.slug}
              className="flex items-center gap-2 border-b border-[#F3EDE7] px-2.5 py-1.5 text-[11px] last:border-0"
            >
              {r.state === 'error' ? (
                <XCircle className="h-3.5 w-3.5 shrink-0 text-[#C0392B]" />
              ) : (
                <CheckCircle2
                  className={`h-3.5 w-3.5 shrink-0 ${r.state === 'done' ? 'text-[#2E7D5B]' : 'text-[#B9ACA3]'}`}
                />
              )}
              <span className="w-16 shrink-0 font-mono font-bold text-[#4A403B]">{r.slug}</span>
              <span className={r.state === 'error' ? 'text-[#C0392B]' : 'text-[#6B5D57]'}>{r.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
