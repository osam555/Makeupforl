import Link from 'next/link'

export type FreePick = { slug: string; question: string; part: number; duration: number }

function partLabel(part: number) {
  if (part === 0) return '프롤로그'
  if (part === 7) return '에필로그'
  return `PART ${part}`
}

function fmt(sec: number) {
  const s = Math.round(sec)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * 무료로 열린 문항을 한 번에 보여 주는 카드.
 *
 * 전에는 NOW PLAYING 카드가 4초마다 문항을 하나씩 돌려 보여 줬다. 50~60대 손님이
 * 읽으려는 순간 다음 것으로 넘어가고, 다섯 개가 있다는 것도 점 다섯 개로만 알 수 있었다.
 * 돌리지 않고 전부 적는다 — 무엇이 공짜인지가 첫 화면에서 보여야 눌러 본다.
 */
export default function FreePicks({ items, className = '' }: { items: FreePick[]; className?: string }) {
  if (items.length === 0) return null
  return (
    <div
      className={`rounded-2xl border border-[var(--w-line)] bg-[var(--w-card)]/95 p-4 shadow-xl backdrop-blur ${className}`}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-[13px] font-extrabold tracking-[0.2em] text-[var(--w-rose)]">무료 공개</p>
        <p className="text-[13px] font-semibold text-[var(--w-mut)]">{items.length}개 · 로그인 없이</p>
      </div>
      {/* 넓은 화면은 두 줄로 — 일곱 줄을 한 줄로 세우면 히어로보다 길어진다 */}
      <ul className="mt-2 sm:grid sm:grid-cols-2 sm:gap-x-6">
        {items.map((x) => (
          <li key={x.slug} className="border-b border-[var(--w-line2)] last:border-0 sm:[&:nth-last-child(-n+2)]:border-0">
            <Link
              href={`/honjoo100/${x.slug}`}
              className="group flex items-center gap-3 py-2.5 transition hover:text-[var(--w-rose)]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--w-rose)] text-[12px] text-white transition group-hover:bg-[var(--w-rose-d)]">
                ▶
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-extrabold tracking-[0.12em]" style={{ color: `var(--w-p${x.part})` }}>
                  {partLabel(x.part)}
                </span>
                <span className="line-clamp-2 block text-[15px] font-bold leading-snug text-[var(--w-ink)]">
                  {x.question}
                </span>
              </span>
              <span className="shrink-0 text-[13px] tabular-nums text-[var(--w-mut)]">🎧 {fmt(x.duration)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
