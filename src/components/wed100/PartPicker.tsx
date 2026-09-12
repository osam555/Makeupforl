'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ChevronDown, Lock } from 'lucide-react'

export type PartRow = { slug: string; part: number; n: number; question: string; duration: number; locked: boolean }
export type PartInfo = { part: number; title: string; intro: string; count: number }

function fmt(sec: number) {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * 파트 고르기 — 파트 카드를 누르면 그 파트의 질문 전부가 한 줄씩 펼쳐진다.
 *
 * 전에는 카드가 아래 카드 격자의 앵커(#part-n)로 뛰었다. 사진 카드 102장 사이로
 * 떨어지니 "이 파트에 무슨 질문이 있나" 를 훑을 수가 없었고, 휴대전화에서는
 * 페이지가 6만 픽셀이라 어디로 갔는지도 몰랐다. 여기서 제목만 줄줄이 보여 주고,
 * 한 줄을 누르면 그 문항으로 간다.
 */
export default function PartPicker({ parts, items }: { parts: PartInfo[]; items: PartRow[] }) {
  const [open, setOpen] = useState<number | null>(null)
  const cur = parts.find((p) => p.part === open) ?? null
  const rows = open === null ? [] : items.filter((x) => x.part === open).sort((a, b) => a.n - b.n)

  return (
    <div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {parts.map((p) => {
          const on = p.part === open
          return (
            <button
              key={p.part}
              type="button"
              onClick={() => setOpen(on ? null : p.part)}
              aria-expanded={on}
              className={[
                'rounded-2xl border bg-[var(--w-card)] p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg',
                on ? 'border-[var(--w-rose)] shadow-lg' : 'border-[var(--w-line)]',
              ].join(' ')}
              style={{ borderTopColor: `var(--w-p${p.part})`, borderTopWidth: 3 }}
            >
              <p className="text-[13px] font-extrabold tracking-[0.22em]" style={{ color: `var(--w-p${p.part})` }}>
                PART {p.part}
              </p>
              <h3 className="mt-2 text-[17px] font-bold text-[var(--w-ink)]">{p.title}</h3>
              <p className="mt-2 line-clamp-2 text-[14px] leading-relaxed text-[var(--w-ink2)]">{p.intro}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-[14px] font-bold" style={{ color: `var(--w-p${p.part})` }}>
                질문 {p.count}개 {on ? '접기' : '보기'}
                <ChevronDown className={`h-4 w-4 transition-transform ${on ? 'rotate-180' : ''}`} />
              </p>
            </button>
          )
        })}
      </div>

      {cur && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)]">
          <div
            className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--w-line2)] px-5 py-3.5"
            style={{ borderTopColor: `var(--w-p${cur.part})`, borderTopWidth: 3 }}
          >
            <p className="text-[16px] font-extrabold text-[var(--w-ink)]">
              <span className="mr-2 tracking-[0.18em]" style={{ color: `var(--w-p${cur.part})` }}>
                PART {cur.part}
              </span>
              {cur.title}
            </p>
            <p className="text-[13px] text-[var(--w-mut)]">
              {rows.length}개 · 🔒 는 이용권 문항
            </p>
          </div>
          <ol>
            {rows.map((x) => (
              <li key={x.slug} className="border-b border-[var(--w-line2)] last:border-0">
                <Link
                  href={`/honjoo100/${x.slug}`}
                  className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-[var(--w-hover)]"
                >
                  <span
                    className="w-8 shrink-0 text-[14px] font-extrabold tabular-nums"
                    style={{ color: `var(--w-p${x.part})` }}
                  >
                    {String(x.n).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 text-[16px] font-medium leading-snug text-[var(--w-ink)]">
                    {x.question}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] tabular-nums text-[var(--w-mut)]">
                    {x.locked && <Lock className="h-3.5 w-3.5" />}
                    🎧 {fmt(x.duration)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
