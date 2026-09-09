'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'

import { SOURCE_LABEL, avgDwell, fmtDwell, sum, unkey, type DailyStat } from '@/lib/analytics'
import {
  SEO_TARGETS,
  readiness,
  upgrades,
  type SeoFacts,
  type SeoSnapshot,
} from '@/lib/seoTargets'

export interface QnaRow {
  slug: string
  question: string
  part: number
  open: boolean
  chars: number
  hasAudio: boolean
}

export interface Content {
  total: number
  open: number
  audioMinutes: number
  hubs: number
  sitemap: number
  members: number
  paywall: boolean
}

/**
 * 관리자 대시보드.
 *
 * 위에서 아래로 세 층이다.
 *
 *  1. 한눈에  — 지금 어떤 상태인가. 숫자 여섯 개
 *  2. 할 일   — 그래서 무엇을 하면 되는가. 효과가 큰 것부터
 *  3. 섹션별  — 왜 그런가. 방문 · 검색 · 콘텐츠 · 판매
 *
 * 숫자만 늘어놓으면 보고 나서 무엇을 해야 할지 모른다. 그래서 2층을 가운데 둔다.
 */
export default function Overview({
  days,
  facts,
  content,
  qna,
  history,
  auth,
}: {
  days: DailyStat[]
  facts: Record<string, SeoFacts>
  content: Content
  qna: QnaRow[]
  history: SeoSnapshot[]
  auth: () => Promise<{ idToken: string } | { password: string | null }>
}) {
  const last7 = days.slice(-7)
  const prev7 = days.slice(-14, -7)
  const a = sum(last7)
  const b = sum(prev7)

  const delta = (now: number, before: number) =>
    before === 0 ? null : Math.round(((now - before) / before) * 100)

  const scores = Object.fromEntries(
    SEO_TARGETS.map((t) => [t.term, readiness(facts[t.term]).score]),
  )
  const avgReady = Math.round(
    SEO_TARGETS.reduce((s, t) => s + scores[t.term], 0) / SEO_TARGETS.length,
  )
  const totalVolume = SEO_TARGETS.reduce((s, t) => s + t.volume, 0)

  /* 오늘치 준비도를 하루 한 번 남긴다. 문서 이름이 날짜라 여러 번 불러도 덮어쓴다 */
  const recorded = useRef(false)
  useEffect(() => {
    if (recorded.current) return
    recorded.current = true
    void (async () => {
      try {
        await fetch('/api/site/seo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...(await auth()), action: 'snapshot', readiness: scores }),
        })
      } catch {
        /* 기록이 실패해도 화면은 그대로 */
      }
    })()
  }, [auth, scores])

  /* 할 일 — 검색어별로 빠진 것을 모아 효과가 큰 순서로 */
  const todo = SEO_TARGETS.flatMap((t) =>
    upgrades(facts[t.term]).map((u) => ({ ...u, term: t.term, volume: t.volume })),
  )
    .sort((x, y) => y.gain * y.volume - x.gain * x.volume)
    .slice(0, 5)

  const noAudio = qna.filter((x) => !x.hasAudio).length
  const thin = qna.filter((x) => x.chars < 300).length

  return (
    <div className="space-y-6 pt-1">
      {/* ── 1. 한눈에 ───────────────────────────────── */}
      <section>
        <SectionTitle>한눈에</SectionTitle>
        {/* 좁은 화면에서 두 칸씩. 하나씩 떨어지면 여섯 칸이 화면 하나를 다 먹는다 */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          <Stat label="방문" value={a.visits.toLocaleString()} delta={delta(a.visits, b.visits)} hint="최근 7일" />
          <Stat label="조회" value={a.views.toLocaleString()} delta={delta(a.views, b.views)} hint="최근 7일" />
          <Stat
            label="평균 체류"
            value={fmtDwell(avgDwell(a.dwellMs, a.dwellCount))}
            hint={`${a.dwellCount.toLocaleString()}회 측정`}
          />
          <Stat label="검색어 준비도" value={`${avgReady}%`} hint={`월 ${totalVolume.toLocaleString()}회 겨냥`} />
          <Stat
            label="공개 / 유료"
            value={`${content.open} / ${content.total - content.open}`}
            hint={content.paywall ? '잠금 켜짐' : '잠금 꺼짐 — 전부 공개'}
            warn={!content.paywall}
          />
          <Stat label="열람 회원" value={`${content.members}명`} hint="유료 열람 계정" />
        </div>
      </section>

      {/* ── 2. 할 일 ───────────────────────────────── */}
      <section>
        <SectionTitle>
          지금 할 일
          <span className="ml-2 font-normal text-[#8A7A72]">
            · 검색량과 점수를 곱해 효과가 큰 것부터
          </span>
        </SectionTitle>
        {todo.length === 0 ? (
          <p className="rounded-xl border border-[#DCE8E0] bg-white p-4 text-[13px] text-[#3F6B57]">
            검색어 쪽에서 할 수 있는 것은 다 했습니다. 이제는 색인과 시간의 문제입니다 —
            4주 뒤 순위를 다시 재 보세요.
          </p>
        ) : (
          <ol className="space-y-2">
            {todo.map((u, i) => (
              <li
                key={i}
                className="rounded-xl border border-[#E0D6CC] bg-white p-3.5 text-[13px] leading-relaxed"
              >
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span className="rounded bg-[#F6E9ED] px-1.5 py-0.5 text-[11px] font-bold text-[#A63D5A]">
                    +{u.gain}%
                  </span>
                  <b className="text-[#2E2724]">{u.term}</b>
                  <span className="text-[11px] text-[#8A7A72]">
                    월 {u.volume.toLocaleString()}회
                  </span>
                  <span className="text-[#3A322E]">— {u.what}</span>
                </div>
                <p className="mt-1 text-[12px] text-[#6B5D57]">{u.how}</p>
              </li>
            ))}
          </ol>
        )}
        {(noAudio > 0 || thin > 0) && (
          <p className="mt-2 rounded-xl border border-[#E8DFD7] bg-white p-3 text-[12px] text-[#6B5D57]">
            콘텐츠 쪽에서도{' '}
            {noAudio > 0 && <b className="text-[#A63D5A]">음성 없는 문항 {noAudio}개</b>}
            {noAudio > 0 && thin > 0 && ' · '}
            {thin > 0 && <b>본문 300자 미만 {thin}개</b>}가 남아 있습니다.{' '}
            <Link href="/admin/wed100" className="font-bold text-[#A63D5A]">
              문항 관리 →
            </Link>
          </p>
        )}
      </section>

      {/* ── 3. 섹션별 ───────────────────────────────── */}
      <Panel title="방문" href="" hint="사람이 얼마나, 어디서 오는가">
        <div className="mb-4">
          <Bars days={days} />
        </div>
        {/*
          긴 주소가 칸을 밀어내던 자리.

          퍼센트로 인코딩된 한글 주소(/%ED%98%BC…)는 띄어쓰기가 없어 한 덩어리로
          취급된다. 그리드 칸은 기본이 min-width:auto 라 그 덩어리만큼 넓어지고,
          truncate 를 걸어 두어도 소용이 없다. 밀려난 만큼 오른쪽 숫자가 화면 밖으로
          나가 조회수와 체류시간이 아예 안 보였다. min-w-0 을 줘야 잘린다.
        */}
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <List
            title="많이 본 페이지"
            rows={Object.entries(a.pages)
              .sort((x, y) => y[1] - x[1])
              .slice(0, 8)
              .map(([k, n]) => ({
                left: decodePath(unkey(k)),
                mid: fmtDwell(avgDwell(a.pageDwellMs[k] ?? 0, a.pageDwellCount[k] ?? 0)),
                right: n.toLocaleString(),
              }))}
            empty="아직 기록이 없습니다"
          />
          <div className="min-w-0">
            <List
              title="어디서 왔나"
              rows={Object.entries(a.sources)
                .sort((x, y) => y[1] - x[1])
                .map(([k, n]) => ({
                  left: SOURCE_LABEL[k] ?? unkey(k),
                  right: n.toLocaleString(),
                }))}
              empty="아직 기록이 없습니다"
            />
            <p className="mt-3 text-[11px] leading-relaxed text-[#8A7A72]">
              사람을 식별하지 않습니다. 쿠키를 쓰지 않고 IP·기기 정보도 저장하지 않으며,
              관리자 화면은 세지 않습니다.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="검색" href="/admin/seo" hint="노린 말에 얼마나 준비됐는가">
        <div className="space-y-3 sm:space-y-2">
          {SEO_TARGETS.map((t) => (
            /*
              좁은 화면에서는 이름·검색량·점수를 한 줄에 올리고 막대를 아래로 내린다.
              한 줄에 넷을 욱여넣으면 막대가 손톱만 해져서 무엇을 보라는 것인지 모른다.
            */
            <div key={t.term} className="sm:flex sm:items-center sm:gap-3">
              <div className="flex items-baseline gap-2 sm:contents">
                <span className="text-xs font-bold text-[#3A322E] sm:w-24 sm:shrink-0">
                  {t.term}
                </span>
                <span className="text-[11px] tabular-nums text-[#8A7A72] sm:w-16 sm:shrink-0 sm:text-right">
                  {t.volume.toLocaleString()}
                </span>
                <span className="ml-auto text-[11px] font-bold tabular-nums text-[#2E2724] sm:order-last sm:ml-0 sm:w-10 sm:text-right">
                  {scores[t.term]}%
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#EFE7E1] sm:mt-0 sm:flex-1">
                <div
                  className="h-full rounded-full bg-[#A63D5A]"
                  style={{ width: `${scores[t.term]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5">
          <p className="mb-2 text-xs font-bold text-[#3A322E]">
            준비도 변화{' '}
            <span className="font-normal text-[#8A7A72]">
              · 어드민을 연 날만 기록됩니다
            </span>
          </p>
          <History history={history} />
        </div>
      </Panel>

      <Panel title="100문100답" href="/admin/wed100" hint="무엇이 읽히고 무엇이 팔리는가">
        <div className="grid min-w-0 gap-5 lg:grid-cols-2">
          <QnaList
            title={`무료 ${content.open}개가 읽히고 있나`}
            hint="안 읽히는 무료 문항은 맛보기 구실을 못 한다 — 바꿀 때가 된 것이다"
            rows={qna.filter((x) => x.open)}
            views={a.pages}
            empty="공개된 문항이 없습니다"
          />
          <QnaList
            title={`유료 ${content.total - content.open}개 중 많이 두드린 것`}
            hint="제목만 보고 들어온 문항이다. 위쪽이 다음에 무료로 열 후보이기도 하다"
            rows={qna.filter((x) => !x.open)}
            views={a.pages}
            empty="잠긴 문항이 없습니다"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-[#F0E9E3] pt-3 text-[11px] text-[#6B5D57]">
          <span>
            원장 음성 <b className="text-[#2E2724]">{content.audioMinutes}분</b>
          </span>
          <span>
            음성 없는 문항{' '}
            <b className={noAudio ? 'text-[#A63D5A]' : 'text-[#2E2724]'}>{noAudio}개</b>
          </span>
          <span>
            본문 300자 미만 <b className="text-[#2E2724]">{thin}개</b>
          </span>
          <span>
            파트별 무료{' '}
            <b className="text-[#2E2724]">
              {[1, 2, 3, 4, 5, 6]
                .map((p) => qna.filter((x) => x.open && x.part === p).length)
                .join(' · ')}
            </b>
          </span>
        </div>
      </Panel>

      <Panel title="사이트" href="" hint="검색엔진이 볼 수 있는 것">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
          <Stat label="색인 대상" value={`${content.sitemap}`} hint="사이트맵 등록 주소" />
          <Stat label="검색어 허브" value={`${content.hubs}장`} hint="주제별 모음 페이지" />
          <Stat
            label="유료 잠금"
            value={content.paywall ? '켜짐' : '꺼짐'}
            hint={content.paywall ? '무료 문항만 본문 공개' : '전 문항이 공개되어 있습니다'}
            warn={!content.paywall}
          />
        </div>
      </Panel>
    </div>
  )
}

/* ── 조각들 ─────────────────────────────────────── */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-sm font-extrabold text-[#2E2724]">{children}</h2>
}

function Panel({
  title,
  hint,
  href,
  children,
}: {
  title: string
  hint: string
  href: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-[#E0D6CC] bg-white p-3.5 sm:p-4">
      <div className="mb-3 flex flex-wrap items-baseline gap-2">
        <h2 className="text-sm font-extrabold text-[#2E2724]">{title}</h2>
        <span className="text-xs text-[#8A7A72]">{hint}</span>
        {href && (
          <Link href={href} className="ml-auto text-xs font-bold text-[#A63D5A]">
            자세히 →
          </Link>
        )}
      </div>
      {children}
    </section>
  )
}

function Stat({
  label,
  value,
  delta,
  hint,
  warn,
}: {
  label: string
  value: string
  delta?: number | null
  hint: string
  warn?: boolean
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-3.5 ${warn ? 'border-[#E8C7CF]' : 'border-[#E0D6CC]'}`}
    >
      <p className="text-[11px] font-bold tracking-wider text-[#8A7A72]">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-xl font-extrabold tabular-nums text-[#2E2724]">{value}</span>
        {delta !== null && delta !== undefined && delta !== 0 && (
          <span className={`text-xs font-bold ${delta > 0 ? 'text-[#3F6B57]' : 'text-[#A63D5A]'}`}>
            {delta > 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </p>
      <p className={`mt-0.5 text-[11px] ${warn ? 'text-[#A63D5A]' : 'text-[#8A7A72]'}`}>{hint}</p>
    </div>
  )
}

function List({
  title,
  rows,
  empty,
}: {
  title: string
  rows: { left: string; mid?: string; right: string }[]
  empty: string
}) {
  return (
    <div className="min-w-0">
      <p className="mb-2 text-xs font-bold text-[#3A322E]">{title}</p>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#9A8B84]">{empty}</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r, i) => (
            <li key={i} className="flex min-w-0 items-center gap-2 text-xs">
              <span className="min-w-0 flex-1 truncate text-[#3A322E]">{r.left}</span>
              {r.mid && <span className="shrink-0 text-[11px] text-[#8A7A72]">{r.mid}</span>}
              <b className="w-12 shrink-0 text-right tabular-nums text-[#2E2724]">{r.right}</b>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function QnaList({
  title,
  hint,
  rows,
  views,
  empty,
}: {
  title: string
  hint: string
  rows: QnaRow[]
  views: Record<string, number>
  empty: string
}) {
  const viewOf = (slug: string) => views[`_honjoo100_${slug}`] ?? 0
  const sorted = [...rows].sort((x, y) => viewOf(y.slug) - viewOf(x.slug) || x.part - y.part)
  const any = sorted.some((r) => viewOf(r.slug) > 0)

  return (
    <div className="min-w-0">
      <p className="text-xs font-bold text-[#3A322E]">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-[#8A7A72]">{hint}</p>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#9A8B84]">{empty}</p>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {sorted.slice(0, 8).map((r) => (
            <li key={r.slug} className="flex min-w-0 items-center gap-2 text-xs">
              <span className="w-8 shrink-0 text-[10px] font-extrabold text-[#8A7A72]">
                P{r.part}
              </span>
              <span className="min-w-0 flex-1 truncate text-[#3A322E]">{r.question}</span>
              <b className="w-10 shrink-0 text-right tabular-nums text-[#2E2724]">
                {any ? viewOf(r.slug).toLocaleString() : '—'}
              </b>
            </li>
          ))}
        </ul>
      )}
      {!any && sorted.length > 0 && (
        <p className="mt-2 text-[11px] text-[#8A7A72]">
          아직 조회 기록이 없습니다. 쌓이면 많이 본 순서로 정렬됩니다.
        </p>
      )}
    </div>
  )
}

/**
 * 일별 막대와 준비도 선.
 *
 * 라이브러리를 쓰지 않는다. 막대 서른 개와 선 하나를 그리려고 차트 묶음을 받아
 * 오면 관리자 화면이 무거워지고, 이 정도는 눈금 하나만 맞추면 된다.
 */
function Bars({ days }: { days: DailyStat[] }) {
  const max = Math.max(1, ...days.map((d) => d.views))
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]">
        {days.map((d) => (
          <div
            key={d.date}
            className="flex-1"
            title={`${d.date} · 방문 ${d.visits} · 조회 ${d.views}`}
          >
            <div
              className="w-full rounded-t-sm bg-[#A63D5A]"
              style={{
                height: `${Math.max(2, (d.views / max) * 96)}px`,
                opacity: d.views ? 1 : 0.15,
              }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[#8A7A72]">
        <span>{days[0]?.date.slice(5)}</span>
        <span>일별 조회 · 최대 {max.toLocaleString()}회</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}

function History({ history }: { history: SeoSnapshot[] }) {
  if (history.length < 2) {
    return (
      <p className="rounded-lg border border-[#E8DFD7] bg-[#FBF8F5] p-3 text-[11px] leading-relaxed text-[#8A7A72]">
        기록이 {history.length}일치입니다. 이 화면을 열 때마다 그날의 준비도가 한 번 남으므로,
        며칠 지나면 변화가 보입니다.
      </p>
    )
  }

  const avg = (s: SeoSnapshot) => {
    const v = Object.values(s.readiness ?? {})
    return v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0
  }
  const pts = history.map((s, i) => ({
    x: (i / (history.length - 1)) * 100,
    y: 100 - avg(s),
    date: s.date,
    v: Math.round(avg(s)),
  }))
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  return (
    <div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-24 w-full">
        {[0, 50, 100].map((y) => (
          <line key={y} x1="0" y1={y} x2="100" y2={y} stroke="#F0E9E3" strokeWidth="0.6" />
        ))}
        <path d={d} fill="none" stroke="#A63D5A" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
        {pts.map((p) => (
          <circle key={p.date} cx={p.x} cy={p.y} r="1.6" fill="#A63D5A">
            <title>{`${p.date} · 평균 준비도 ${p.v}%`}</title>
          </circle>
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] text-[#8A7A72]">
        <span>{history[0].date.slice(5)}</span>
        <span>평균 준비도 {pts[pts.length - 1].v}%</span>
        <span>{history[history.length - 1].date.slice(5)}</span>
      </div>
    </div>
  )
}

/** 퍼센트로 인코딩된 주소를 사람이 읽을 수 있게. 못 풀면 원래 것을 그대로 둔다 */
function decodePath(p: string): string {
  try {
    return decodeURIComponent(p)
  } catch {
    return p
  }
}
