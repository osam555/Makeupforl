import Link from 'next/link'

/**
 * 관리 화면이 함께 쓰는 조각들.
 *
 * 화면이 하나씩 늘 때마다 그 화면 안에서 카드와 제목을 새로 그렸다. 100문100답이
 * 먼저 있었고 통계가 붙었고 예약과 영상과 검색어가 따로 붙었다. 그래서 같은
 * 관리 화면인데 카드 모서리가 12px 과 16px 로 다르고, 제목이 sm 과 3xl 로 다르고,
 * 흐린 글씨가 회색과 갈색으로 달랐다. 넘어갈 때마다 다른 프로그램 같았다.
 *
 * 여기 모아 둔 것을 쓰면 다음에 화면을 하나 더 붙여도 같은 모습이 된다.
 * 새 모양이 필요하면 이 파일을 고친다 — 화면 쪽에서 값을 새로 적지 않는다.
 */

/** 무엇에 대한 묶음인지 — 카드 바깥에 놓는 제목 */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-sm font-extrabold text-[var(--a-2e2724)]">{children}</h2>
}

/** 하얀 판 하나. 제목·설명·"자세히" 링크까지가 한 벌이다 */
export function Panel({
  title,
  hint,
  href,
  action,
  children,
}: {
  title: string
  hint?: string
  /** 있으면 오른쪽 위에 '자세히 →' 가 붙는다 */
  href?: string
  /** 링크 대신 단추를 놓아야 할 때 */
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 className="text-sm font-extrabold text-[var(--a-2e2724)]">{title}</h2>
        {hint && <span className="text-xs text-[var(--a-8a7a72)]">{hint}</span>}
        {href && (
          <Link href={href} className="ml-auto text-xs font-bold text-[var(--a-a63d5a)]">
            자세히 →
          </Link>
        )}
        {action && <span className="ml-auto">{action}</span>}
      </div>
      {children}
    </section>
  )
}

/**
 * 숫자 한 칸.
 *
 * 이름표는 작고 흐리게, 숫자는 크고 진하게. 아래 한 줄은 그 숫자를 어떻게 읽어야
 * 하는지 — 숫자만 있으면 큰지 작은지 알 수 없다.
 */
export function Stat({
  label,
  value,
  delta,
  hint,
  warn,
  wide,
}: {
  label: string
  value: string
  /** 지난 기간과 견준 변화(%) — 0 이거나 없으면 표시하지 않는다 */
  delta?: number | null
  hint?: string
  warn?: boolean
  /** 마지막 칸이 홀로 남지 않게 두 칸 너비로 (한 줄에 다 들어가는 화면에서는 한 칸) */
  wide?: boolean
}) {
  return (
    <div
      className={[
        'rounded-xl border bg-white p-3.5',
        warn ? 'border-[var(--a-e8c7cf)]' : 'border-[var(--a-e0d6cc)]',
        wide ? 'col-span-2 lg:col-span-1' : '',
      ].join(' ')}
    >
      <p className="text-[0.6875rem] font-bold tracking-wider text-[var(--a-8a7a72)]">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-extrabold tabular-nums text-[var(--a-2e2724)]">{value}</span>
        {delta !== null && delta !== undefined && delta !== 0 && (
          <span
            className={`text-xs font-bold ${
              delta > 0 ? 'text-[var(--a-3f6b57)]' : 'text-[var(--a-a63d5a)]'
            }`}
          >
            {delta > 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </p>
      {hint && (
        <p
          className={`mt-0.5 text-[0.6875rem] ${
            warn ? 'text-[var(--a-a63d5a)]' : 'text-[var(--a-8a7a72)]'
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  )
}

/**
 * 고르는 단추 한 줄 (기간·상태 거르기).
 *
 * 화면마다 다르게 생겼던 것 중 하나다 — 어디는 검은 띠 위의 동그란 알약,
 * 어디는 shadcn 기본 단추였다. 하나로 맞춘다.
 */
export function Chips<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T
  onChange: (v: T) => void
  options: readonly (readonly [T, string])[]
}) {
  return (
    <div className="inline-flex gap-1 rounded-lg border border-[var(--a-e0d6cc)] bg-white p-1">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={value === v}
          className={`rounded-md px-3 py-1.5 text-xs font-bold whitespace-nowrap transition-colors ${
            value === v
              ? 'bg-[var(--a-2e2724)] text-white'
              : 'text-[var(--a-6b5d57)] hover:bg-[var(--a-f4f1ee)]'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** 알림 한 줄 — 저장했다, 못 읽었다, 아직 없다 */
export function Note({
  kind = 'info',
  children,
}: {
  kind?: 'ok' | 'err' | 'info'
  children: React.ReactNode
}) {
  const tone =
    kind === 'ok'
      ? 'border-[var(--a-dce8e0)] text-[var(--a-3f6b57)]'
      : kind === 'err'
        ? 'border-[var(--a-e8c7cf)] text-[var(--a-a63d5a)]'
        : 'border-[var(--a-e8dfd7)] text-[var(--a-6b5d57)]'
  return (
    <div className={`rounded-xl border bg-white p-3 text-xs leading-relaxed ${tone}`}>
      {children}
    </div>
  )
}

/** 아직 아무것도 없을 때 — 빈 화면에 이유를 적어 둔다 */
export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-xs text-[var(--a-9a8b84)]">{children}</p>
}
