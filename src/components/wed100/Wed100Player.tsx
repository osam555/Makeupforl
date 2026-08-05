'use client'

import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Repeat } from 'lucide-react'

import type { SubtitleLang, Wed100Cue } from '@/types/wed100'

/** 조회/재생 이벤트 적재 (Firebase 미설정/실패 시 조용히 무시) */
function track(slug: string, event: 'view' | 'play' | 'complete' | 'cta_click', lang?: string) {
  void (async () => {
    try {
      const { getDb } = await import('@/lib/firebase/client')
      const db = getDb()
      if (!db) return
      const { addDoc, collection } = await import('firebase/firestore')
      await addDoc(collection(db, 'wed100_events'), {
        slug,
        event,
        lang: lang ?? null,
        createdAt: new Date().toISOString(),
      })
    } catch {
      /* noop */
    }
  })()
}

const RATES = [0.8, 1, 1.25, 1.5]
const LANGS: { key: SubtitleLang; label: string }[] = [
  { key: 'ko', label: '한국어' },
  { key: 'en', label: 'English' },
  { key: 'both', label: '한+영' },
]

export interface PlayerProps {
  slug: string
  part: number
  partTitle: string
  n: number
  question: string
  questionEn: string
  cues: Wed100Cue[]
  heroImage: string
  audio?: string
  questionAudio?: { start: number; end: number }
  duration: number
  nextHref?: string | null
  prevHref?: string | null
}

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function Wed100Player(p: PlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const scriptRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [rate, setRate] = useState(1)
  const [lang, setLang] = useState<SubtitleLang>('both')
  const [loop, setLoop] = useState(false)
  const [dur, setDur] = useState(p.duration)
  const playedRef = useRef(false)
  const doneRef = useRef(false)

  useEffect(() => {
    playedRef.current = false
    doneRef.current = false
    track(p.slug, 'view')
  }, [p.slug])

  useEffect(() => {
    if (playing && !playedRef.current) {
      playedRef.current = true
      track(p.slug, 'play', lang)
    }
  }, [playing, p.slug, lang])

  /** 타임코드가 없는 항목(음성 미생성)도 읽을 수 있도록 추정 타임라인을 만든다 */
  const timeline = useMemo(() => {
    const hasReal = p.cues.every((c) => typeof c.start === 'number')
    if (hasReal) return p.cues.map((c) => ({ start: c.start!, end: c.end! }))
    let acc = p.questionAudio?.end ?? 4.5
    return p.cues.map((c) => {
      const d = Math.max(1.8, c.ko.length / 5.2 + 0.5)
      const seg = { start: acc, end: acc + d }
      acc += d + 0.28
      return seg
    })
  }, [p.cues, p.questionAudio])

  const idx = useMemo(() => {
    for (let i = timeline.length - 1; i >= 0; i--) {
      if (t >= timeline[i].start) return i
    }
    return -1
  }, [t, timeline])

  const isQuestion = idx < 0
  const cue = idx >= 0 ? p.cues[idx] : null
  const ko = isQuestion ? p.question : cue?.ko ?? ''
  const en = isQuestion ? p.questionEn : cue?.en ?? ''

  // 음성이 없으면 추정 타임라인으로 자체 재생(읽기 모드)
  useEffect(() => {
    if (!playing || p.audio) return
    const id = window.setInterval(() => {
      setT((v) => {
        const nv = v + 0.1 * rate
        if (nv >= dur) {
          setPlaying(false)
          return 0
        }
        return nv
      })
    }, 100)
    return () => window.clearInterval(id)
  }, [playing, rate, dur, p.audio])

  useEffect(() => {
    const el = audioRef.current
    if (el) el.playbackRate = rate
  }, [rate])

  const toggle = useCallback(() => {
    const el = audioRef.current
    if (!el) {
      setPlaying((v) => !v)
      return
    }
    if (el.paused) void el.play()
    else el.pause()
  }, [])

  const seek = useCallback(
    (sec: number) => {
      const v = Math.min(Math.max(0, sec), dur)
      setT(v)
      const el = audioRef.current
      if (el) el.currentTime = v
    },
    [dur],
  )

  // 현재 문장이 스크립트 밖으로 나가면 따라 스크롤
  useEffect(() => {
    if (!playing || idx < 0) return
    const el = scriptRef.current?.querySelector<HTMLElement>(`[data-cue="${idx}"]`)
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [idx, playing])

  const pct = dur > 0 ? Math.min(100, (t / dur) * 100) : 0

  return (
    <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
      {/* 무대 */}
      <div className="overflow-hidden rounded-2xl bg-[#1E1917] shadow-xl">
        <div className="relative aspect-video bg-black">
          <Image
            src={p.heroImage}
            alt={p.question}
            fill
            priority
            sizes="(max-width:1024px) 100vw, 60vw"
            className="object-cover"
          />

          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isQuestion ? '#8FD6FF' : '#FFD08A' }}
            />
            {isQuestion ? '진행자 질문' : '원장님 답변'}
          </div>

          <div className="absolute right-4 top-4 flex gap-1.5">
            {LANGS.map((l) => (
              <button
                key={l.key}
                onClick={() => setLang(l.key)}
                className={`rounded-lg border px-2.5 py-1 text-[11px] backdrop-blur transition ${
                  lang === l.key
                    ? 'border-white bg-[var(--w-card)] font-bold text-[#1E1917]'
                    : 'border-white/20 bg-black/45 text-[#F0E6E0] hover:bg-black/60'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* 영상 하단 자막 */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#14100F]/95 via-[#14100F]/80 to-transparent px-6 pb-6 pt-10 sm:px-8">
            <p
              className={`font-bold leading-snug text-white drop-shadow-lg ${
                lang === 'en' ? 'text-base sm:text-lg' : 'text-lg sm:text-xl'
              }`}
            >
              {lang === 'en' ? en : ko}
            </p>
            {lang === 'both' && en && (
              <p className="mt-1.5 text-xs leading-snug text-[#FFE9C9] drop-shadow-lg sm:text-sm">
                {en}
              </p>
            )}
          </div>
        </div>

        {/* 컨트롤 */}
        <div className="bg-[#17130F] px-4 pb-4 pt-3.5 text-[#EDE3DC]">
          <div
            className="group relative h-1.5 cursor-pointer rounded-full bg-[#3A322D]"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              seek(((e.clientX - r.left) / r.width) * dur)
            }}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-[var(--w-rose)] to-[var(--w-gold)]"
              style={{ width: `${pct}%` }}
            />
            <span
              className="absolute top-1/2 -ml-1.5 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--w-card)] shadow"
              style={{ left: `${pct}%` }}
            />
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button onClick={() => seek(t - 10)} aria-label="10초 뒤로">
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              onClick={toggle}
              aria-label={playing ? '일시정지' : '재생'}
              className="grid h-10 w-10 place-items-center rounded-full bg-[var(--w-rose)] text-white"
            >
              {playing ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            </button>
            <button onClick={() => seek(t + 10)} aria-label="10초 앞으로">
              <SkipForward className="h-4 w-4" />
            </button>
            <span className="font-mono text-[11px] text-[#A3948C]">
              {fmt(t)} / {fmt(dur)}
            </span>
            <button
              onClick={() => setLoop((v) => !v)}
              className={`flex items-center gap-1 text-[11px] ${loop ? 'text-[#FFD08A]' : 'text-[#A3948C]'}`}
            >
              <Repeat className="h-3.5 w-3.5" /> 반복
            </button>
            <span className="ml-auto flex gap-1.5">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => setRate(r)}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    rate === r
                      ? 'border-[#3A322D] bg-[#3A322D] text-white'
                      : 'border-[#3A322D] text-[#BDAEA6]'
                  }`}
                >
                  {r.toFixed(r === 1 ? 1 : 2).replace(/0$/, '')}×
                </button>
              ))}
            </span>
          </div>

          {!p.audio && (
            <p className="mt-3 text-[11px] text-[#A3948C]">
              음성 준비 중입니다 — 지금은 자막 읽기 모드로 재생됩니다.
            </p>
          )}
        </div>

        {p.audio && (
          <audio
            ref={audioRef}
            src={p.audio}
            preload="metadata"
            loop={loop}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => {
              setPlaying(false)
              if (!doneRef.current) {
                doneRef.current = true
                track(p.slug, 'complete', lang)
              }
            }}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setDur(e.currentTarget.duration || p.duration)
              e.currentTarget.playbackRate = rate
            }}
          />
        )}
      </div>

      {/* 스크립트 */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)]">
        <div className="border-b border-[var(--w-line)] px-5 py-4">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-[var(--w-gold)]">
            PART {p.part} · {p.partTitle} · {String(p.n).padStart(2, '0')}
          </p>
          <h1 className="mt-2 text-lg font-bold leading-snug text-[var(--w-ink)]">{p.question}</h1>
          <p className="mt-1 text-xs leading-relaxed text-[var(--w-mut2)]">{p.questionEn}</p>
        </div>

        <div ref={scriptRef} className="max-h-[420px] overflow-auto p-2.5">
          {p.cues.map((c, i) => (
            <button
              key={i}
              data-cue={i}
              onClick={() => seek(timeline[i].start)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-[13px] leading-relaxed transition ${
                i === idx
                  ? 'bg-[var(--w-rose-l)] font-semibold text-[var(--w-ink)]'
                  : 'text-[var(--w-ink2)] hover:bg-[var(--w-hover)]'
              }`}
            >
              {c.ko}
              {c.en && <span className="mt-1 block text-[11px] font-normal text-[var(--w-mut2)]">{c.en}</span>}
            </button>
          ))}
        </div>

        <div className="flex gap-2 border-t border-[var(--w-line)] px-4 py-3">
          <a
            href="/consultation"
            onClick={() => track(p.slug, 'cta_click')}
            className="flex-1 rounded-lg bg-[var(--w-rose)] px-4 py-2.5 text-center text-[13px] font-bold text-white hover:bg-[var(--w-rose-d)]"
          >
            이 내용으로 상담 예약
          </a>
          <a
            href="tel:02-323-3321"
            className="rounded-lg border border-[var(--w-line)] px-4 py-2.5 text-[13px] font-bold text-[var(--w-ink)]"
          >
            전화
          </a>
        </div>
      </div>
    </div>
  )
}
