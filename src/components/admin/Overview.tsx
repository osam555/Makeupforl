'use client'

import Link from 'next/link'

import {
  SOURCE_LABEL,
  avgDwell,
  fmtDwell,
  sum,
  unkey,
  type DailyStat,
} from '@/lib/analytics'
import { SEO_TARGETS, readiness, type SeoFacts } from '@/lib/seoTargets'

/**
 * 종합 대시보드.
 *
 * 세 가지를 한 화면에 놓는다 — 사람이 얼마나 오는가(방문), 올 준비는 됐는가(검색어
 * 준비도), 팔 물건은 어떤 상태인가(콘텐츠). 따로 보면 각각은 숫자일 뿐이지만,
 * 나란히 놓으면 "준비는 됐는데 아직 안 온다" 인지 "오는데 준비가 안 됐다" 인지가
 * 보인다. 그 둘은 다음에 할 일이 전혀 다르다.
 */
export interface QnaRow {
  slug: string
  question: string
  part: number
  open: boolean
  chars: number
  hasAudio: boolean
}

export default function Overview({
  days,
  facts,
  content,
  qna,
}: {
  days: DailyStat[]
  facts: Record<string, SeoFacts>
  content: { total: number; open: number; audioMinutes: number; hubs: number; sitemap: number }
  qna: QnaRow[]
}) {
  const last7 = days.slice(-7)
  const prev7 = days.slice(-14, -7)
  const a = sum(last7)
  const b = sum(prev7)

  const delta = (now: number, before: number) => {
    if (before === 0) return now > 0 ? null : 0
    return Math.round(((now - before) / before) * 100)
  }

  const avgReady = Math.round(
    SEO_TARGETS.reduce((s, t) => s + readiness(facts[t.term]).score, 0) / SEO_TARGETS.length,
  )
  const totalVolume = SEO_TARGETS.reduce((s, t) => s + t.volume, 0)
  const hasTraffic = days.some((d) => d.views > 0)

  const topPages = Object.entries(a.pages)
    .sort((x, y) => y[1] - x[1])
    .slice(0, 8)
  const sources = Object.entries(a.sources).sort((x, y) => y[1] - x[1])

  return (
    <div className="space-y-5">
      {!hasTraffic && (
        <div className="rounded-xl border border-[#E8DFD7] bg-white p-4 text-[13px] leading-relaxed text-[#6B5D57]">
          <b className="text-[#2E2724]">아직 방문 기록이 없습니다.</b> 기록은 이 기능을 켠
          뒤부터 쌓입니다. 검색엔진에 올라간 지 얼마 되지 않아 며칠은 0에 가까울 수 있습니다 —
          그동안은 아래 <b>검색어 준비도</b>를 보시면 됩니다.
        </div>
      )}

      {/* 최근 7일 */}
      <section>
        <h2 className="mb-2 text-sm font-extrabold text-[#2E2724]">
          최근 7일{' '}
          <span className="font-normal text-[#8A7A72]">· 괄호는 그 앞 7일 대비</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-4">
          {(
            [
              ['방문', a.visits, delta(a.visits, b.visits), '창을 새로 연 횟수'],
              ['조회', a.views, delta(a.views, b.views), '페이지를 본 횟수'],
            ] as const
          ).map(([label, value, d, hint]) => (
            <Stat key={label} label={label} value={value.toLocaleString()} delta={d} hint={hint} />
          ))}
          <Stat
            label="평균 체류"
            value={fmtDwell(avgDwell(a.dwellMs, a.dwellCount))}
            delta={null}
            hint={`${a.dwellCount.toLocaleString()}회 측정`}
          />
          <Stat
            label="방문당 조회"
            value={a.visits > 0 ? (a.views / a.visits).toFixed(1) : '—'}
            delta={null}
            hint="한 번 와서 몇 장을 보나"
          />
        </div>
      </section>

      {/* 일별 그래프 */}
      <section className="rounded-xl border border-[#E0D6CC] bg-white p-4">
        <h2 className="mb-3 text-sm font-extrabold text-[#2E2724]">
          일별 방문 <span className="font-normal text-[#8A7A72]">· 최근 30일</span>
        </h2>
        <Bars days={days} />
      </section>

      {/* 검색어 준비도 */}
      <section className="rounded-xl border border-[#E0D6CC] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-extrabold text-[#2E2724]">검색어 준비도</h2>
          <span className="text-xs text-[#8A7A72]">
            노리는 검색량 월 {totalVolume.toLocaleString()}회 · 평균 {avgReady}%
          </span>
          <Link href="/admin/seo" className="ml-auto text-xs font-bold text-[#A63D5A]">
            자세히 →
          </Link>
        </div>
        <div className="space-y-2">
          {SEO_TARGETS.map((t) => {
            const r = readiness(facts[t.term])
            return (
              <div key={t.term} className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-xs font-bold text-[#3A322E]">{t.term}</span>
                <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-[#8A7A72]">
                  {t.volume.toLocaleString()}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EFE7E1]">
                  <div
                    className="h-full rounded-full bg-[#A63D5A]"
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-[11px] font-bold tabular-nums text-[#2E2724]">
                  {r.score}%
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 많이 본 페이지 */}
        <section className="rounded-xl border border-[#E0D6CC] bg-white p-4">
          <h2 className="mb-3 text-sm font-extrabold text-[#2E2724]">
            많이 본 페이지 <span className="font-normal text-[#8A7A72]">· 최근 7일</span>
          </h2>
          {topPages.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#9A8B84]">아직 기록이 없습니다</p>
          ) : (
            <ul className="space-y-1.5">
              {topPages.map(([k, n]) => {
                const path = unkey(k)
                const sec = avgDwell(a.pageDwellMs[k] ?? 0, a.pageDwellCount[k] ?? 0)
                return (
                  <li key={k} className="flex items-center gap-2 text-xs">
                    <span className="min-w-0 flex-1 truncate text-[#3A322E]">{path}</span>
                    <span className="shrink-0 text-[11px] text-[#8A7A72]">{fmtDwell(sec)}</span>
                    <b className="w-12 shrink-0 text-right tabular-nums text-[#2E2724]">
                      {n.toLocaleString()}
                    </b>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* 어디서 왔나 */}
        <section className="rounded-xl border border-[#E0D6CC] bg-white p-4">
          <h2 className="mb-3 text-sm font-extrabold text-[#2E2724]">
            어디서 왔나 <span className="font-normal text-[#8A7A72]">· 최근 7일</span>
          </h2>
          {sources.length === 0 ? (
            <p className="py-6 text-center text-xs text-[#9A8B84]">아직 기록이 없습니다</p>
          ) : (
            <ul className="space-y-1.5">
              {sources.map(([k, n]) => (
                <li key={k} className="flex items-center gap-2 text-xs">
                  <span className="min-w-0 flex-1 truncate text-[#3A322E]">
                    {SOURCE_LABEL[k] ?? unkey(k)}
                  </span>
                  <b className="w-12 shrink-0 text-right tabular-nums text-[#2E2724]">
                    {n.toLocaleString()}
                  </b>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-[#8A7A72]">
            사람을 식별하지 않습니다. 쿠키를 쓰지 않고 IP·기기 정보도 저장하지 않습니다.
          </p>
        </section>
      </div>

      {/*
        100문100답 사용 현황.

        공개 일곱과 유료 아흔다섯을 나눠 보는 것만으로는 부족하다. 방문 기록에
        문항별 조회수가 이미 쌓이므로 그것과 붙인다 — 무료 문항이 실제로 읽히고
        있는지, 유료 문항 중 어느 것이 문을 두드리게 하는지가 여기서 보인다.

        무료 문항은 "잘 고른 것인가" 를, 유료 문항은 "무엇을 사고 싶어 하는가" 를
        말해 준다. 둘은 다른 이야기라 나눠 놓는다.
      */}
      <section className="rounded-xl border border-[#E0D6CC] bg-white p-4">
        <div className="mb-3 flex flex-wrap items-baseline gap-2">
          <h2 className="text-sm font-extrabold text-[#2E2724]">100문100답 사용 현황</h2>
          <span className="text-xs text-[#8A7A72]">
            무료 {content.open}개 · 유료 {content.total - content.open}개 · 최근 7일 조회 기준
          </span>
          <Link href="/admin/wed100" className="ml-auto text-xs font-bold text-[#A63D5A]">
            문항 관리 →
          </Link>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <QnaList
            title="무료 문항이 읽히고 있나"
            hint="안 읽히는 무료 문항은 맛보기 구실을 못 한다 — 다른 문항으로 바꿀 때가 된 것이다"
            rows={qna.filter((x) => x.open)}
            views={a.pages}
            empty="공개된 문항이 없습니다"
          />
          <QnaList
            title="유료 문항 중 많이 두드린 것"
            hint="제목만 보고도 들어온 문항이다. 여기 위쪽이 무료로 열 다음 후보이기도 하다"
            rows={qna.filter((x) => !x.open)}
            views={a.pages}
            empty="잠긴 문항이 없습니다"
          />
        </div>

        {/* 품질 점검 — 조회수와 무관하게 봐야 하는 것 */}
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-[#F0E9E3] pt-3 text-[11px] text-[#6B5D57]">
          <span>
            음성 없는 문항{' '}
            <b className={qna.some((x) => !x.hasAudio) ? 'text-[#A63D5A]' : 'text-[#2E2724]'}>
              {qna.filter((x) => !x.hasAudio).length}개
            </b>
          </span>
          <span>
            본문 300자 미만{' '}
            <b className="text-[#2E2724]">{qna.filter((x) => x.chars < 300).length}개</b>
          </span>
          <span>
            파트별 무료 문항{' '}
            <b className="text-[#2E2724]">
              {[1, 2, 3, 4, 5, 6]
                .map((p) => qna.filter((x) => x.open && x.part === p).length)
                .join(' · ')}
            </b>
            <span className="text-[#8A7A72]"> (PART 1~6)</span>
          </span>
        </div>
      </section>

      {/* 콘텐츠 상태 */}
      <section className="rounded-xl border border-[#E0D6CC] bg-white p-4">
        <h2 className="mb-3 text-sm font-extrabold text-[#2E2724]">콘텐츠</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <Stat
            label="100문100답"
            value={`${content.open} / ${content.total}`}
            delta={null}
            hint="공개 / 전체"
          />
          <Stat
            label="원장 음성"
            value={`${content.audioMinutes}분`}
            delta={null}
            hint="전 문항 녹음"
          />
          <Stat label="검색어 허브" value={`${content.hubs}장`} delta={null} hint="주제별 모음" />
          <Stat
            label="색인 대상"
            value={`${content.sitemap}`}
            delta={null}
            hint="사이트맵 등록 주소"
          />
        </div>
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  delta,
  hint,
}: {
  label: string
  value: string
  delta: number | null
  hint: string
}) {
  return (
    <div className="rounded-xl border border-[#E0D6CC] bg-white p-4">
      <p className="text-[11px] font-bold tracking-wider text-[#8A7A72]">{label}</p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-extrabold tabular-nums text-[#2E2724]">{value}</span>
        {delta !== null && delta !== 0 && (
          <span
            className={`text-xs font-bold ${delta > 0 ? 'text-[#3F6B57]' : 'text-[#A63D5A]'}`}
          >
            {delta > 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </p>
      <p className="mt-1 text-[11px] text-[#8A7A72]">{hint}</p>
    </div>
  )
}

/**
 * 일별 막대.
 *
 * 라이브러리를 쓰지 않는다. 막대 서른 개를 그리려고 차트 묶음을 받아 오면 관리자
 * 화면이 무거워지고, 이 정도는 눈금 하나만 맞추면 된다.
 */
function Bars({ days }: { days: DailyStat[] }) {
  const max = Math.max(1, ...days.map((d) => d.views))
  return (
    <div>
      <div className="flex h-28 items-end gap-[3px]">
        {days.map((d) => (
          <div key={d.date} className="group relative flex-1" title={`${d.date} · 조회 ${d.views}`}>
            <div
              className="w-full rounded-t-sm bg-[#A63D5A]"
              style={{ height: `${Math.max(2, (d.views / max) * 112)}px`, opacity: d.views ? 1 : 0.15 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[#8A7A72]">
        <span>{days[0]?.date.slice(5)}</span>
        <span>최대 {max.toLocaleString()}회</span>
        <span>{days[days.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  )
}

/** 문항 목록 — 조회수 순. 기록이 없으면 조회수 대신 안내를 보여 준다 */
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
  const sorted = [...rows].sort((a, b) => viewOf(b.slug) - viewOf(a.slug) || a.part - b.part)
  const any = sorted.some((r) => viewOf(r.slug) > 0)

  return (
    <div>
      <p className="text-xs font-bold text-[#3A322E]">{title}</p>
      <p className="mt-0.5 text-[11px] leading-relaxed text-[#8A7A72]">{hint}</p>
      {sorted.length === 0 ? (
        <p className="py-6 text-center text-xs text-[#9A8B84]">{empty}</p>
      ) : (
        <ul className="mt-2.5 space-y-1.5">
          {sorted.slice(0, 8).map((r) => (
            <li key={r.slug} className="flex items-center gap-2 text-xs">
              <span
                className="w-9 shrink-0 text-[10px] font-extrabold"
                style={{ color: `var(--w-p${r.part}, #7A6A5F)` }}
              >
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
