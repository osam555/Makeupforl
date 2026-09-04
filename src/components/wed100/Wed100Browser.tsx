'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Search, Play, List, LayoutGrid, Check, History } from 'lucide-react'


export interface BrowserItem {
  slug: string
  part: number
  n: number
  question: string
  question_en: string
  keywords: string[]
  thumbImage: string
  duration: number
  hasAudio: boolean
  /** 잠긴 문항 — 제목만 열려 있다 */
  locked?: boolean
}

const LS_RESUME = 'wed100:resume'
const LS_DONE = 'wed100:done'

interface Resume {
  slug: string
  t: number
  duration: number
}

function fmt(sec: number) {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** 프롤로그(part 0)·에필로그(part 7)는 PART 번호 대신 이름으로 표시 */
function partLabel(x: { part: number; n: number }): string {
  if (x.part === 0) return 'PROLOGUE'
  if (x.part === 7) return 'EPILOGUE'
  return `PART ${x.part} · ${String(x.n).padStart(2, '0')}`
}

export default function Wed100Browser({
  items,
  parts,
}: {
  items: BrowserItem[]
  parts: { part: number; title: string }[]
}) {
  const [part, setPart] = useState(-1)
  const [kw, setKw] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [done, setDone] = useState<Set<string>>(new Set())
  const [resume, setResume] = useState<Resume | null>(null)

  // 이어듣기 위치와 들은 문항은 이 브라우저에만 저장한다 (로그인 없이 동작)
  useEffect(() => {
    try {
      const d = window.localStorage.getItem(LS_DONE)
      if (d) setDone(new Set(JSON.parse(d) as string[]))
      const r = window.localStorage.getItem(LS_RESUME)
      if (r) {
        const v = JSON.parse(r) as Resume
        // 거의 다 들은 건 이어듣기로 안내하지 않는다
        if (v?.slug && v.t > 5 && v.t < (v.duration || 0) - 10) setResume(v)
      }
    } catch {
      /* 사파리 프라이빗 모드 등 */
    }
  }, [])

  const resumeItem = useMemo(
    () => (resume ? items.find((x) => x.slug === resume.slug) ?? null : null),
    [resume, items],
  )

  const rows = useMemo(() => {
    const q = kw.trim()
    return items.filter(
      (x) =>
        (part === -1 || x.part === part) &&
        (!q ||
          x.question.includes(q) ||
          x.question_en.toLowerCase().includes(q.toLowerCase()) ||
          x.keywords.some((k) => k.includes(q))),
    )
  }, [items, part, kw])

  return (
    <div>
      {resumeItem && resume && (
        <Link
          href={`/honjoo100/${resumeItem.slug}`}
          className="mt-5 flex items-center gap-3.5 rounded-2xl border border-[var(--w-rose)] bg-[var(--w-rose-l)] px-4 py-3.5 transition hover:shadow-md"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--w-rose)] text-white">
            <History className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-extrabold tracking-[0.1em] text-[var(--w-rose-t)]">
              이어듣기
            </span>
            <span className="mt-0.5 line-clamp-1 block text-sm font-bold text-[var(--w-ink)]">
              {resumeItem.question}
            </span>
          </span>
          <span className="shrink-0 font-mono text-xs font-bold text-[var(--w-rose-t)]">
            {fmt(resume.t)}부터
          </span>
        </Link>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-[var(--w-mut2)]" />
          <input
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="예: 한복, 가격, 올림머리, 예약 시기…"
            className="w-full rounded-xl border border-[var(--w-line)] bg-[var(--w-card)] py-3 pl-10 pr-4 text-sm outline-none focus:border-[var(--w-rose)]"
          />
        </div>
        <button
          onClick={() => setView(view === 'grid' ? 'list' : 'grid')}
          className="flex items-center gap-2 rounded-xl border border-[var(--w-line)] bg-[var(--w-card)] px-4 py-3 text-xs font-bold text-[var(--w-ink2)]"
        >
          {view === 'grid' ? <List className="h-4 w-4" /> : <LayoutGrid className="h-4 w-4" />}
          {view === 'grid' ? '목록으로' : '카드로'}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setPart(-1)}
          className={`rounded-full border px-3.5 py-2 text-xs transition ${
            part === -1
              ? 'border-[var(--w-rose)] bg-[var(--w-rose)] font-bold text-white'
              : 'border-[var(--w-line)] bg-[var(--w-card)] text-[var(--w-ink2)] hover:border-[var(--w-line)]'
          }`}
        >
          전체 {items.length}
        </button>
        {parts.map((p) => (
          <button
            key={p.part}
            onClick={() => setPart(p.part)}
            className={`rounded-full border px-3.5 py-2 text-xs transition ${
              part === p.part
                ? 'border-[var(--w-rose)] bg-[var(--w-rose)] font-bold text-white'
                : 'border-[var(--w-line)] bg-[var(--w-card)] text-[var(--w-ink2)] hover:border-[var(--w-line)]'
            }`}
          >
            {p.part === 0 || p.part === 7 ? p.title : `P${p.part}. ${p.title}`}
          </button>
        ))}
      </div>

      {rows.length === 0 && (
        <p className="mt-10 text-center text-sm text-[var(--w-mut)]">
          검색 결과가 없습니다. 다른 단어로 찾아보세요.
        </p>
      )}

      {view === 'grid' ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-5">
          {rows.map((x) => {
            return (
              <Link
                key={x.slug}
                href={`/honjoo100/${x.slug}`}
                id={`part-${x.part}`}
                className="group overflow-hidden rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)] transition hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="relative aspect-square bg-[var(--w-thumb-bg)]">
                  <Image
                    src={x.thumbImage}
                    alt={x.question}
                    fill
                    sizes="(max-width:640px) 100vw, 25vw"
                    className="object-cover"
                  />
                  <span className="absolute bottom-3 right-3 grid h-9 w-9 place-items-center rounded-full bg-[var(--w-card)]/95 text-[var(--w-rose)] shadow">
                    <Play className="h-3.5 w-3.5 fill-current" />
                  </span>
                  {done.has(x.slug) && (
                    <span
                      title="들은 질문"
                      className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-[var(--w-card)]/95 px-2 py-1 text-[12px] font-bold text-[var(--w-p4)] shadow"
                    >
                      <Check className="h-3 w-3" /> 들음
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p
                    className="text-[12px] font-extrabold tracking-[0.13em]"
                    style={{ color: `var(--w-p${x.part})` }}
                  >
                    {partLabel(x)}
                  </p>
                  <h3 className="mt-1.5 line-clamp-3 min-h-[60px] text-sm font-bold leading-snug text-[var(--w-ink)]">
                    {x.question}
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {x.keywords.slice(0, 3).map((k) => (
                      <span
                        key={k}
                        className="rounded bg-[var(--w-rose-l)] px-1.5 py-0.5 text-[12px] text-[var(--w-rose-t)]"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                  <p className="mt-2.5 text-[13px] text-[var(--w-ink2)]">
                    {x.locked
                      ? '🔒 준비중 — 제목만 공개'
                      : `🎧 ${fmt(x.duration)} · 자막 한/영${x.hasAudio ? '' : ' · 음성 준비중'}`}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)]">
          {rows.map((x) => (
            <Link
              key={x.slug}
              href={`/honjoo100/${x.slug}`}
              className="flex items-center gap-4 border-b border-[var(--w-line2)] px-5 py-3.5 text-sm last:border-0 hover:bg-[var(--w-hover)]"
            >
              <span
                className="w-14 shrink-0 text-[13px] font-extrabold tracking-wider"
                style={{ color: `var(--w-p${x.part})` }}
              >
                {x.part === 0 ? '프롤로그' : x.part === 7 ? '에필로그' : `P${x.part}·${String(x.n).padStart(2, '0')}`}
              </span>
              <span className="flex-1">
                <span className="block font-medium text-[var(--w-ink)]">{x.question}</span>
                <span className="mt-0.5 block text-[13px] text-[var(--w-ink2)]">{x.question_en}</span>
              </span>
              <span className="shrink-0 text-[13px] text-[var(--w-ink2)]">🎧 {fmt(x.duration)}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
