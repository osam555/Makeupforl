'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Search, X } from 'lucide-react'

import type { Wed100Item } from '@/types/wed100'

/**
 * 문항 고르기.
 *
 * 홈에 띄울 문항과 무료로 열 문항을 같은 방식으로 고른다. 102개를 훑어야 하므로
 * 검색과 파트 좁히기를 함께 둔다.
 *
 * ordered 를 켜면 고른 순서가 그대로 노출 순서가 되어 위/아래로 옮길 수 있다.
 * 홈 슬라이드는 도는 차례가 곧 중요도라서 순서를 눈에 보이게 다뤄야 한다.
 */
export default function QuestionPicker({
  items,
  value,
  onChange,
  max,
  ordered = false,
}: {
  items: Wed100Item[]
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  ordered?: boolean
}) {
  const [q, setQ] = useState('')
  const [part, setPart] = useState<number | 'all'>('all')

  const parts = useMemo(
    () => [...new Set(items.map((x) => x.part ?? 0))].sort((a, b) => a - b),
    [items],
  )

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return items
      .filter((x) => (part === 'all' ? true : (x.part ?? 0) === part))
      .filter(
        (x) =>
          !needle ||
          (x.question ?? '').toLowerCase().includes(needle) ||
          x.slug.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.slug.localeCompare(b.slug))
  }, [items, q, part])

  const byslug = useMemo(() => new Map(items.map((x) => [x.slug, x])), [items])
  const full = max !== undefined && value.length >= max

  const toggle = (slug: string) => {
    if (value.includes(slug)) onChange(value.filter((s) => s !== slug))
    else if (!full) onChange([...value, slug])
  }

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= value.length) return
    const next = [...value]
    ;[next[i], next[j]] = [next[j], next[i]]
    onChange(next)
  }

  return (
    <div>
      {/* 고른 것 — 순서가 중요한 경우 여기서 바로 옮긴다 */}
      <div className="rounded-lg border border-[#E8DFD7] bg-white p-2">
        {value.length === 0 ? (
          <p className="px-1 py-2 text-xs text-[#8A7A72]">아직 고른 문항이 없습니다.</p>
        ) : (
          <ul className="space-y-1">
            {value.map((slug, i) => {
              const it = byslug.get(slug)
              return (
                <li key={slug} className="flex items-center gap-1.5 rounded bg-[#FBF8F5] px-2 py-1.5">
                  <span className="w-5 shrink-0 text-center text-[11px] font-bold text-[#A63D5A]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs text-[#3A322E]">
                    <span className="text-[#8A7A72]">{slug}</span>
                    {it ? ` · ${it.question}` : ' · (없는 문항)'}
                  </span>
                  {ordered && (
                    <>
                      <button
                        type="button"
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        aria-label="위로"
                        className="rounded p-0.5 text-[#8A7A72] hover:bg-white disabled:opacity-30"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(i, 1)}
                        disabled={i === value.length - 1}
                        aria-label="아래로"
                        className="rounded p-0.5 text-[#8A7A72] hover:bg-white disabled:opacity-30"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => toggle(slug)}
                    aria-label="빼기"
                    className="rounded p-0.5 text-[#8A7A72] hover:bg-white hover:text-red-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* 찾아서 더하기 */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className="relative">
          <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#B3A69F]" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="질문 검색"
            className="h-8 w-44 rounded-md border border-[#D4C7BE] bg-white pl-7 pr-2 text-xs outline-none focus:border-[#A63D5A]"
          />
        </span>
        <button
          type="button"
          onClick={() => setPart('all')}
          className={`h-7 rounded-md px-2 text-[11px] ${
            part === 'all' ? 'bg-[#221D1B] text-white' : 'bg-white text-[#6B5D57] hover:bg-[#F5EFE9]'
          }`}
        >
          전체
        </button>
        {parts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPart(p)}
            className={`h-7 rounded-md px-2 text-[11px] ${
              part === p ? 'bg-[#221D1B] text-white' : 'bg-white text-[#6B5D57] hover:bg-[#F5EFE9]'
            }`}
          >
            {p === 0 ? '프롤로그' : `P${p}`}
          </button>
        ))}
        {max !== undefined && (
          <span className={`ml-auto text-[11px] ${full ? 'font-bold text-[#A63D5A]' : 'text-[#8A7A72]'}`}>
            {value.length} / {max}
          </span>
        )}
      </div>

      <div className="mt-1.5 max-h-52 overflow-auto rounded-lg border border-[#E8DFD7] bg-white">
        {shown.length === 0 && <p className="px-3 py-3 text-xs text-[#8A7A72]">찾는 문항이 없습니다.</p>}
        {shown.map((x) => {
          const on = value.includes(x.slug)
          return (
            <label
              key={x.slug}
              className={`flex cursor-pointer items-start gap-2 border-b border-[#F0EAE4] px-3 py-1.5 last:border-0 hover:bg-[#FBF8F5] ${
                !on && full ? 'opacity-40' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={on}
                disabled={!on && full}
                onChange={() => toggle(x.slug)}
                className="mt-0.5"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-[#3A322E]">
                <span className="text-[#8A7A72]">{x.slug}</span> · {x.question}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}
