'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Play,
  Pause,
  Repeat,
  RotateCcw,
  RotateCw,
  ChevronLeft,
  ChevronRight,
  ListVideo,
  Type,
  Languages,
} from 'lucide-react'

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

/* ── 이어듣기 / 들은 문항 (localStorage) ───────────────────────────── */
const LS_RESUME = 'wed100:resume'
const LS_DONE = 'wed100:done'
const LS_AUTOPLAY = 'wed100:autoplay'
const LS_FONT = 'wed100:font'
const LS_LANG = 'wed100:lang'
const LS_RATE = 'wed100:rate'
const LS_CAPFONT = 'wed100:capfont'
const SS_PLAY_ON_LOAD = 'wed100:playOnLoad'

function saveResume(slug: string, t: number, duration: number) {
  try {
    window.localStorage.setItem(
      LS_RESUME,
      JSON.stringify({ slug, t: Math.floor(t), duration: Math.floor(duration), at: Date.now() }),
    )
  } catch {
    /* 사파리 프라이빗 모드 등 */
  }
}

function markDone(slug: string) {
  try {
    const raw = window.localStorage.getItem(LS_DONE)
    const set = new Set<string>(raw ? (JSON.parse(raw) as string[]) : [])
    set.add(slug)
    window.localStorage.setItem(LS_DONE, JSON.stringify([...set]))
  } catch {
    /* noop */
  }
}

const RATES = [0.8, 1, 1.25, 1.5, 2]
const LANGS: { key: SubtitleLang; label: string }[] = [
  { key: 'ko', label: '한국어' },
  { key: 'en', label: 'English' },
  { key: 'both', label: '한+영' },
]
/**
 * 자막 글자 크기 — 주 사용자가 50~60대라 기본을 키웠다.
 * px 는 오른쪽 전문(스크립트), cap 은 영상 하단 자막.
 * 영상 자막은 어두운 배경 위에 한 줄로 떠서 전문보다 조금 크게 잡는다.
 */
const FONTS = [
  { key: 'sm', label: '작게', px: 15, lh: 1.75, cap: 17, capEn: 12 },
  { key: 'md', label: '보통', px: 17, lh: 1.8, cap: 20, capEn: 14 },
  { key: 'lg', label: '크게', px: 20, lh: 1.85, cap: 25, capEn: 17 },
] as const
type FontKey = (typeof FONTS)[number]['key']

/** 다음/이전 문항 카드에 필요한 최소 정보 */
export interface PlayerNav {
  slug: string
  question: string
  thumb: string
  href: string
}

export interface PlayerProps {
  slug: string
  part: number
  partTitle: string
  n: number
  question: string
  questionEn: string
  cues: Wed100Cue[]
  /** 문단이 새로 시작하는 자막 큐 인덱스 */
  paraStarts?: number[]
  keywords?: string[]
  heroImage: string
  audio?: string
  questionAudio?: { start: number; end: number }
  duration: number
  prev?: PlayerNav | null
  next?: PlayerNav | null
  /** 파트 안에서의 위치 (1부터) */
  partIndex: number
  partTotal: number
}

function fmt(sec: number) {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** 다음 화 자동 재생까지 기다리는 시간(초) */
const NEXT_DELAY = 6

export default function Wed100Player(p: PlayerProps) {
  const router = useRouter()
  const audioRef = useRef<HTMLAudioElement>(null)
  const scriptRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [t, setT] = useState(0)
  const [rate, setRate] = useState(1)
  const [lang, setLang] = useState<SubtitleLang>('both')
  const [loop, setLoop] = useState(false)
  const [autoNext, setAutoNext] = useState(true)
  const [font, setFont] = useState<FontKey>('md')
  // 영상 자막 크기는 전문과 따로 기억한다 — 보는 거리도 쓰임새도 다르다
  const [capFont, setCapFont] = useState<FontKey>('md')
  const [dur, setDur] = useState(p.duration)
  const [ended, setEnded] = useState(false)
  const [countdown, setCountdown] = useState(NEXT_DELAY)
  const playedRef = useRef(false)
  const doneRef = useRef(false)

  const fs = FONTS.find((f) => f.key === font) ?? FONTS[1]
  const cfs = FONTS.find((f) => f.key === capFont) ?? FONTS[1]

  /* ── 초기 설정 읽기 ── */
  useEffect(() => {
    try {
      const a = window.localStorage.getItem(LS_AUTOPLAY)
      if (a !== null) setAutoNext(a === '1')
      const f = window.localStorage.getItem(LS_FONT)
      if (f === 'sm' || f === 'md' || f === 'lg') setFont(f)
      const g = window.localStorage.getItem(LS_LANG)
      if (g === 'ko' || g === 'en' || g === 'both') setLang(g)
      const r = Number(window.localStorage.getItem(LS_RATE))
      if (RATES.includes(r)) setRate(r)
      const c = window.localStorage.getItem(LS_CAPFONT)
      if (c === 'sm' || c === 'md' || c === 'lg') setCapFont(c)
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    playedRef.current = false
    doneRef.current = false
    setEnded(false)
    setCountdown(NEXT_DELAY)
    setT(0)
    track(p.slug, 'view')
  }, [p.slug])

  useEffect(() => {
    if (playing && !playedRef.current) {
      playedRef.current = true
      track(p.slug, 'play', lang)
    }
  }, [playing, p.slug, lang])

  /** 앞 문항에서 [다음]으로 넘어온 경우 바로 재생 */
  useEffect(() => {
    if (!p.audio) return
    let flag: string | null = null
    try {
      flag = window.sessionStorage.getItem(SS_PLAY_ON_LOAD)
      if (flag) window.sessionStorage.removeItem(SS_PLAY_ON_LOAD)
    } catch {
      /* noop */
    }
    if (flag === p.slug) {
      void audioRef.current?.play().catch(() => {
        /* 브라우저가 막으면 조용히 넘어간다 */
      })
    }
  }, [p.slug, p.audio])

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
  }, [playing, p.audio, rate, dur])

  /* ── 현재 자막 줄로 자동 스크롤 ──
     scrollIntoView 는 자막 상자뿐 아니라 창까지 함께 끌어당겨 페이지가 위아래로
     흔들린다. 그래서 상자의 scrollTop 만 직접 계산해 움직인다. */
  useEffect(() => {
    if (!playing || idx < 0) return
    const box = scriptRef.current
    const el = box?.querySelector<HTMLElement>(`[data-cue="${idx}"]`)
    if (!box || !el) return
    const br = box.getBoundingClientRect()
    const er = el.getBoundingClientRect()
    // 줄의 중앙이 상자의 중앙에 오도록
    const delta = er.top - br.top - (br.height - er.height) / 2
    const top = Math.max(0, Math.min(box.scrollHeight - box.clientHeight, box.scrollTop + delta))
    if (Math.abs(top - box.scrollTop) < 2) return
    box.scrollTo({ top, behavior: 'smooth' })
  }, [idx, playing])

  /* ── 이어듣기 위치 저장 ── */
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => saveResume(p.slug, t, dur), 5000)
    return () => window.clearInterval(id)
  }, [playing, p.slug, t, dur])

  /* ── 다음 화 카운트다운 ── */
  useEffect(() => {
    if (!ended || !autoNext || !p.next) return
    if (countdown <= 0) {
      goNext()
      return
    }
    const id = window.setTimeout(() => setCountdown((v) => v - 1), 1000)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ended, autoNext, countdown, p.next])

  const goNext = useCallback(() => {
    if (!p.next) return
    try {
      window.sessionStorage.setItem(SS_PLAY_ON_LOAD, p.next.slug)
    } catch {
      /* noop */
    }
    router.push(p.next.href)
  }, [p.next, router])

  const seek = (sec: number) => {
    const v = Math.max(0, Math.min(dur, sec))
    setT(v)
    setEnded(false)
    if (audioRef.current) audioRef.current.currentTime = v
  }

  const toggle = () => {
    if (!p.audio) {
      setPlaying((v) => !v)
      return
    }
    const a = audioRef.current
    if (!a) return
    if (a.paused) void a.play()
    else a.pause()
  }

  const chooseRate = (r: number) => {
    setRate(r)
    if (audioRef.current) audioRef.current.playbackRate = r
    try {
      window.localStorage.setItem(LS_RATE, String(r))
    } catch {
      /* noop */
    }
  }

  /** 연속 재생으로 다음 화에 넘어가도 같은 자막 설정을 쓰도록 기억한다 */
  const chooseLang = (k: SubtitleLang) => {
    setLang(k)
    try {
      window.localStorage.setItem(LS_LANG, k)
    } catch {
      /* noop */
    }
  }

  const chooseCapFont = (k: FontKey) => {
    setCapFont(k)
    try {
      window.localStorage.setItem(LS_CAPFONT, k)
    } catch {
      /* noop */
    }
  }

  const chooseFont = (k: FontKey) => {
    setFont(k)
    try {
      window.localStorage.setItem(LS_FONT, k)
    } catch {
      /* noop */
    }
  }

  const toggleAutoNext = () => {
    setAutoNext((v) => {
      try {
        window.localStorage.setItem(LS_AUTOPLAY, v ? '0' : '1')
      } catch {
        /* noop */
      }
      return !v
    })
  }

  const onEnded = () => {
    setPlaying(false)
    if (!doneRef.current) {
      doneRef.current = true
      track(p.slug, 'complete', lang)
      markDone(p.slug)
    }
    if (p.next) {
      setCountdown(NEXT_DELAY)
      setEnded(true)
    }
  }

  const pct = dur > 0 ? Math.min(100, (t / dur) * 100) : 0
  const paraStarts = useMemo(() => new Set(p.paraStarts ?? []), [p.paraStarts])
  const partLabel =
    p.part === 0 || p.part === 7
      ? p.partTitle
      : `PART ${p.part} · ${p.partTitle}`

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
      {/* 무대 */}
      <div className="overflow-hidden rounded-2xl bg-[var(--wp-bg)] shadow-xl">
        <div className="relative aspect-video bg-black">
          <Image
            src={p.heroImage}
            alt={p.question}
            fill
            priority
            sizes="(max-width:1024px) 100vw, 60vw"
            className="object-cover"
          />

          <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5 text-xs text-white backdrop-blur">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: isQuestion ? 'var(--wp-cue-q)' : 'var(--wp-cue-a)' }}
            />
            {isQuestion ? '진행자 질문' : '원장님 답변'}
          </div>

          {/* 영상 하단 자막 */}
          <div className="absolute inset-x-0 bottom-0 px-6 pb-6 pt-12 sm:px-8"
            style={{
              backgroundImage:
                'linear-gradient(to top,' +
                ' rgba(var(--wp-scrim),.88) 0%,' +
                ' rgba(var(--wp-scrim),.62) 45%,' +
                ' rgba(var(--wp-scrim),0) 100%)',
            }}>
            <p
              className="font-bold leading-snug text-white drop-shadow-lg"
              style={{ fontSize: `${lang === 'en' ? cfs.cap - 2 : cfs.cap}px` }}
            >
              {lang === 'en' ? en : ko}
            </p>
            {lang === 'both' && en && (
              <p
                className="mt-1.5 leading-snug text-[#FFE9C9] drop-shadow-lg"
                style={{ fontSize: `${cfs.capEn}px` }}
              >
                {en}
              </p>
            )}
          </div>

          {/* 재생 완료 → 다음 화 */}
          {ended && p.next && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[rgba(var(--wp-scrim),.94)] px-6 text-center backdrop-blur-sm">
              <p className="text-[11px] font-extrabold tracking-[0.2em] text-[var(--wp-accent)]">
                다음 질문
              </p>
              <p className="max-w-md text-base font-bold leading-snug text-white sm:text-lg">
                {p.next.question}
              </p>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={goNext}
                  className="rounded-full bg-[var(--w-rose)] px-5 py-2.5 text-sm font-bold text-white"
                >
                  {autoNext ? `${countdown}초 후 재생 · 지금 듣기` : '이어서 듣기'}
                </button>
                <button
                  onClick={() => setEnded(false)}
                  className="rounded-full border border-white/30 px-4 py-2.5 text-sm font-bold text-white/90"
                >
                  머무르기
                </button>
                <button
                  onClick={() => seek(0)}
                  className="rounded-full border border-white/30 px-4 py-2.5 text-sm font-bold text-white/90"
                >
                  다시 듣기
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 컨트롤 */}
        <div className="bg-[var(--wp-bg2)] px-4 pb-4 pt-3.5 text-[var(--wp-ink)]">
          {/* 진행 바 — 키보드로도 조작할 수 있게 slider 역할을 준다 */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="재생 위치"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(t)}
            aria-valuetext={`${fmt(t)} / ${fmt(dur)}`}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') { e.preventDefault(); seek(t + 5) }
              else if (e.key === 'ArrowLeft') { e.preventDefault(); seek(t - 5) }
              else if (e.key === 'Home') { e.preventDefault(); seek(0) }
              else if (e.key === 'End') { e.preventDefault(); seek(dur) }
              else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); toggle() }
            }}
            className="group relative -my-2 cursor-pointer py-2 outline-none focus-visible:ring-2 focus-visible:ring-[var(--w-gold)]"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect()
              seek(((e.clientX - r.left) / r.width) * dur)
            }}
          >
            <div className="h-1.5 rounded-full bg-[var(--wp-btn-on-bg)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--w-rose)] to-[var(--w-gold)]"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span
              className="pointer-events-none absolute top-1/2 -ml-2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-[var(--w-rose)] bg-[var(--wp-bg)] shadow"
              style={{ left: `${pct}%` }}
            />
          </div>

          {/* 주 컨트롤 — 재생 버튼을 가장 크게 */}
          <div className="mt-3.5 flex items-center gap-1.5">
            <button
              onClick={() => seek(t - 10)}
              aria-label="10초 뒤로"
              className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--wp-ink2)] hover:bg-[var(--wp-btn-on-bg)]"
            >
              <RotateCcw className="h-5 w-5" />
              <span className="absolute text-[8px] font-bold">10</span>
            </button>
            <button
              onClick={toggle}
              aria-label={playing ? '일시정지' : '재생'}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[var(--w-rose)] text-white shadow-lg transition hover:bg-[var(--w-rose-d)] sm:h-12 sm:w-12"
            >
              {playing ? (
                <Pause className="h-6 w-6 fill-current sm:h-5 sm:w-5" />
              ) : (
                <Play className="h-6 w-6 fill-current sm:h-5 sm:w-5" />
              )}
            </button>
            <button
              onClick={() => seek(t + 10)}
              aria-label="10초 앞으로"
              className="relative grid h-11 w-11 shrink-0 place-items-center rounded-full text-[var(--wp-ink2)] hover:bg-[var(--wp-btn-on-bg)]"
            >
              <RotateCw className="h-5 w-5" />
              <span className="absolute text-[8px] font-bold">10</span>
            </button>

            <span className="ml-1 font-mono text-xs text-[var(--wp-ink2)]">
              {fmt(t)} / {fmt(dur)}
            </span>

            {/* 배속 — 모바일에서는 한 개만 두고 눌러서 순환 */}
            <button
              onClick={() => chooseRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
              aria-label={`재생 속도 ${rate}배, 눌러서 변경`}
              className="ml-auto grid h-11 min-w-[52px] place-items-center rounded-lg border border-[var(--wp-btn-line)] text-[13px] font-bold text-[var(--wp-ink)] sm:hidden"
            >
              {rate}×
            </button>
            <span className="ml-auto hidden gap-1.5 sm:flex">
              {RATES.map((r) => (
                <button
                  key={r}
                  onClick={() => chooseRate(r)}
                  aria-pressed={rate === r}
                  className={`rounded-md border px-2.5 py-1.5 text-[12px] font-semibold ${
                    rate === r
                      ? 'border-[var(--wp-btn-on-line)] bg-[var(--wp-btn-on-bg)] text-[var(--wp-btn-on-ink)]'
                      : 'border-[var(--wp-btn-line)] text-[var(--wp-ink2)] hover:text-[var(--wp-ink)]'
                  }`}
                >
                  {r}×
                </button>
              ))}
            </span>
          </div>

          {/* 보조 컨트롤 — 반복 · 연속 재생 · 영상 자막 크기 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[var(--wp-line)] pt-3">
            <button
              onClick={() => setLoop((v) => !v)}
              aria-pressed={loop}
              className={`flex items-center gap-1.5 py-1.5 text-[12px] font-semibold ${
                loop ? 'text-[var(--wp-accent)]' : 'text-[var(--wp-ink2)] hover:text-[var(--wp-ink)]'
              }`}
            >
              <Repeat className="h-4 w-4" /> 한 편 반복
            </button>
            <button
              onClick={toggleAutoNext}
              aria-pressed={autoNext}
              className={`flex items-center gap-1.5 py-1.5 text-[12px] font-semibold ${
                autoNext ? 'text-[var(--wp-accent)]' : 'text-[var(--wp-ink2)] hover:text-[var(--wp-ink)]'
              }`}
            >
              <ListVideo className="h-4 w-4" /> 연속 재생
            </button>

            {/* 영상 자막 크기 — 오른쪽 빈 자리에 붙인다 */}
            <span className="ml-auto flex items-center gap-1" role="group" aria-label="영상 자막 크기">
              <Type className="mr-0.5 h-3.5 w-3.5 text-[var(--wp-ink2)]" aria-hidden />
              {FONTS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => chooseCapFont(f.key)}
                  aria-pressed={capFont === f.key}
                  className={`rounded-md border px-2.5 py-1.5 text-[12px] font-semibold transition ${
                    capFont === f.key
                      ? 'border-[var(--wp-btn-on-line)] bg-[var(--wp-btn-on-bg)] text-[var(--wp-btn-on-ink)]'
                      : 'border-[var(--wp-btn-line)] text-[var(--wp-ink2)] hover:text-[var(--wp-ink)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </span>
          </div>

          {!p.audio && (
            <p className="mt-3 text-[12px] text-[var(--wp-ink2)]">
              음성 준비 중입니다 — 지금은 자막 읽기 모드로 재생됩니다.
            </p>
          )}
        </div>

        {/* 이전 / 진도 / 다음 — 스크롤하지 않고 이동할 수 있게 플레이어에 붙인다 */}
        <div className="flex items-stretch border-t border-[var(--wp-line)] bg-[var(--wp-bg2)] text-[var(--wp-ink)]">
          {p.prev ? (
            <Link
              href={p.prev.href}
              className="flex min-w-0 flex-1 items-center gap-1.5 px-3 py-3 text-left transition hover:bg-[var(--wp-btn-on-bg)]"
            >
              <ChevronLeft className="h-4 w-4 shrink-0 text-[var(--wp-ink2)]" />
              <span className="min-w-0">
                <span className="block text-[10px] font-bold text-[var(--wp-ink2)]">이전</span>
                <span className="line-clamp-1 text-[12px] font-semibold">{p.prev.question}</span>
              </span>
            </Link>
          ) : (
            <span className="flex-1" />
          )}

          <span className="grid shrink-0 place-items-center border-x border-[var(--wp-line)] px-3 py-2 text-center">
            <span className="text-[9px] font-extrabold tracking-[0.12em] text-[var(--w-gold)]">
              {p.part === 0 || p.part === 7 ? p.partTitle : `PART ${p.part}`}
            </span>
            <span className="font-mono text-[12px] font-bold text-[var(--wp-ink)]">
              {p.partIndex}/{p.partTotal}
            </span>
          </span>

          {p.next ? (
            <Link
              href={p.next.href}
              className="flex min-w-0 flex-1 items-center justify-end gap-1.5 px-3 py-3 text-right transition hover:bg-[var(--wp-btn-on-bg)]"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-bold text-[var(--wp-ink2)]">다음</span>
                <span className="line-clamp-1 text-[12px] font-semibold">{p.next.question}</span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--wp-ink2)]" />
            </Link>
          ) : (
            <span className="flex-1" />
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
            onEnded={onEnded}
            onTimeUpdate={(e) => setT(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              setDur(e.currentTarget.duration || p.duration)
              e.currentTarget.playbackRate = rate
            }}
          />
        )}
      </div>

      {/* 답변 전문 — 재생 중에는 따라 읽는 자막, 멈추면 그냥 읽는 글 */}
      <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)]">
        <div className="border-b border-[var(--w-line)] px-5 py-4">
          <p className="text-[10px] font-extrabold tracking-[0.18em] text-[var(--w-gold)]">
            {partLabel}
          </p>
          <h1 className="mt-2 text-lg font-bold leading-snug text-[var(--w-ink)]">{p.question}</h1>
          <p className="mt-1 text-xs leading-relaxed text-[var(--w-ink2)]">{p.questionEn}</p>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="flex gap-1" role="group" aria-label="자막 언어">
              <Languages className="mr-0.5 h-3.5 w-3.5 self-center text-[var(--w-ink2)]" aria-hidden />
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => chooseLang(l.key)}
                  aria-pressed={lang === l.key}
                  className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold transition ${
                    lang === l.key
                      ? 'border-[var(--w-rose)] bg-[var(--w-rose-l)] text-[var(--w-rose-t)]'
                      : 'border-[var(--w-line)] text-[var(--w-ink2)] hover:bg-[var(--w-hover)]'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </span>
            <span className="flex gap-1" role="group" aria-label="글자 크기">
              <Type className="mr-0.5 h-3.5 w-3.5 self-center text-[var(--w-ink2)]" aria-hidden />
              {FONTS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => chooseFont(f.key)}
                  aria-pressed={font === f.key}
                  className={`rounded-md border px-2.5 py-1 text-[12px] font-semibold transition ${
                    font === f.key
                      ? 'border-[var(--w-rose)] bg-[var(--w-rose-l)] text-[var(--w-rose-t)]'
                      : 'border-[var(--w-line)] text-[var(--w-ink2)] hover:bg-[var(--w-hover)]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </span>
          </div>
        </div>

        {/* 데스크톱에서는 플레이어 옆에서 스크롤, 모바일에서는 전문을 그대로 펼친다 */}
        <div ref={scriptRef} className="max-h-[60vh] overflow-y-auto overscroll-contain p-2 lg:max-h-[560px]">
          {p.cues.map((c, i) => (
            <button
              key={i}
              data-cue={i}
              onClick={() => seek(timeline[i].start)}
              style={{ fontSize: `${fs.px}px`, lineHeight: fs.lh }}
              className={`block w-full rounded-lg px-3 py-2 text-left transition ${
                paraStarts.has(i) && i > 0 ? 'mt-4' : ''
              } ${
                i === idx
                  ? 'bg-[var(--w-rose-l)] font-semibold text-[var(--w-ink)]'
                  : 'text-[var(--w-body)] hover:bg-[var(--w-hover)]'
              }`}
            >
              <span
                className="mr-2 select-none font-mono text-[11px] text-[var(--w-ink2)]"
                aria-hidden
              >
                {fmt(timeline[i].start)}
              </span>
              {lang !== 'en' && c.ko}
              {lang === 'en' && (c.en || c.ko)}
              {lang === 'both' && c.en && (
                <span
                  className="mt-1 block font-normal text-[var(--w-ink2)]"
                  style={{ fontSize: `${fs.px - 3}px` }}
                >
                  {c.en}
                </span>
              )}
            </button>
          ))}

          {!!p.keywords?.length && (
            <div className="mt-5 flex flex-wrap gap-2 px-3 pb-1">
              {p.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-md bg-[var(--w-rose-l)] px-2.5 py-1 text-xs text-[var(--w-rose-t)]"
                >
                  #{k}
                </span>
              ))}
            </div>
          )}
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
