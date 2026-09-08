import Link from 'next/link'
import Image from 'next/image'

/**
 * 잠긴 문항 화면.
 *
 * 본문과 음성은 아예 그리지 않는다. 화면에서 가리기만 하면 HTML 에는 그대로 남아
 * 검색엔진과 소스 보기로 다 읽힌다. 제목만 검색에 걸리게 하는 게 목적이므로
 * 서버에서 답변을 넘기지 않는 쪽이 맞다.
 */
export default function Wed100Locked({
  question,
  questionEn,
  part,
  partTitle,
  n,
  keywords,
  heroImage,
  storeUrl,
  notice,
  freeSample,
  totals,
  unlock,
}: {
  question: string
  questionEn?: string
  part: number
  partTitle: string
  n: number
  keywords: string[]
  heroImage: string
  storeUrl: string
  notice: string
  freeSample: { slug: string; question: string }[]
  /** 무엇을 사는 것인지 숫자로 보여 준다 */
  totals: { count: number; minutes: number; chars: number }
  /** 로그인해서 여는 자리. 문지기(Wed100Gate)가 넣어 준다 */
  unlock?: React.ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-3xl border border-[var(--w-line)] bg-[var(--w-card)]">
      <div className="relative aspect-[16/7] bg-[var(--w-thumb-bg)]">
        <Image src={heroImage} alt={question} fill sizes="100vw" className="object-cover" priority />
      </div>

      <div className="px-6 py-8 sm:px-10 sm:py-10">
        <p
          className="text-[12px] font-extrabold tracking-[0.13em]"
          style={{ color: `var(--w-p${part})` }}
        >
          {part === 0
            ? 'PROLOGUE'
            : part === 7
              ? 'EPILOGUE'
              : `PART ${part} · ${String(n).padStart(2, '0')}`}
          <span className="ml-2 font-bold text-[var(--w-mut)]">{partTitle}</span>
        </p>

        <h1 className="mt-3 text-[22px] font-extrabold leading-snug text-[var(--w-ink)] sm:text-[28px]">
          {question}
        </h1>
        {questionEn && <p className="mt-1.5 text-sm text-[var(--w-mut)]">{questionEn}</p>}

        {keywords.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-1.5">
            {keywords.slice(0, 8).map((k) => (
              <li
                key={k}
                className="rounded-full bg-[var(--w-thumb-bg)] px-2.5 py-1 text-[12px] text-[var(--w-ink2)]"
              >
                #{k}
              </li>
            ))}
          </ul>
        )}

        {/*
          잠금 안내.

          전에는 "답변은 준비 중입니다" 라고 했다. 그러면 아직 안 만든 것처럼 읽혀
          기다렸다 오라는 말이 된다. 실제로는 다 만들어 두고 파는 물건이므로,
          무엇을 받게 되는지 숫자로 보여 주고 지금 할 수 있는 일을 준다.

          구조화 데이터(isAccessibleForFree:false)가 이 영역(.paywall)을 가리키므로
          클래스 이름을 바꾸려면 페이지의 JSON-LD 도 같이 고쳐야 한다.
        */}
        <div className="paywall mt-7 rounded-2xl border border-[var(--w-line)] bg-[var(--w-bg)] p-6 sm:p-8">
          <p className="text-[15px] font-bold text-[var(--w-ink)]">
            이 답변은 100문 100답 전체 보기에 들어 있습니다
          </p>
          <p className="mt-2 text-[14px] leading-[1.8] text-[var(--w-ink2)]">
            {notice ||
              '25년간 1만 명의 혼주님을 만난 대표원장 김성희가 가장 많이 받은 질문에 하나씩 답했습니다. 검색으로는 나오지 않는, 상담실에서만 드리던 이야기입니다.'}
          </p>

          {/* 무엇을 받게 되는지 — 말보다 숫자가 낫다 */}
          <dl className="mt-5 grid grid-cols-3 gap-3 border-y border-[var(--w-line2)] py-4">
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-[var(--w-mut)]">문항</dt>
              <dd className="mt-0.5 text-[19px] font-extrabold text-[var(--w-ink)]">
                {totals.count}개
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-[var(--w-mut)]">원장 음성</dt>
              <dd className="mt-0.5 text-[19px] font-extrabold text-[var(--w-ink)]">
                {totals.minutes}분
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-[var(--w-mut)]">본문</dt>
              <dd className="mt-0.5 text-[19px] font-extrabold text-[var(--w-ink)]">
                {Math.round(totals.chars / 1000)}천 자
              </dd>
            </div>
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {storeUrl ? (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[var(--w-rose)] px-6 py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
              >
                전체 보기 신청
              </a>
            ) : (
              /* 판매 주소가 아직 없으면 이 집이 실제로 상담받는 창구로 보낸다 */
              <a
                href="tel:02-323-3321"
                className="inline-flex items-center rounded-full bg-[var(--w-rose)] px-6 py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
              >
                전화로 문의 02-323-3321
              </a>
            )}
            <Link
              href="/consultation"
              className="inline-flex items-center rounded-full border border-[var(--w-line)] px-6 py-3 text-[14px] font-bold text-[var(--w-ink)] transition-colors hover:border-[var(--w-rose)] hover:text-[var(--w-rose)]"
            >
              1:1 사전컨설팅
            </Link>
            <Link
              href="/honjoo100"
              className="inline-flex items-center rounded-full border border-[var(--w-line)] px-6 py-3 text-[14px] font-bold text-[var(--w-ink)] transition-colors hover:border-[var(--w-rose)] hover:text-[var(--w-rose)]"
            >
              전체 목록 보기
            </Link>
          </div>

          {unlock}
        </div>

        {freeSample.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[15px] font-bold text-[var(--w-ink)]">
              먼저 읽어 보실 수 있는 문항
            </h2>
            <ul className="mt-3 space-y-2">
              {freeSample.map((x) => (
                <li key={x.slug}>
                  <Link
                    href={`/honjoo100/${x.slug}`}
                    className="flex items-start gap-2 rounded-xl border border-[var(--w-line)] px-4 py-3 text-[14px] text-[var(--w-ink)] transition-colors hover:border-[var(--w-rose)] hover:text-[var(--w-rose)]"
                  >
                    <span className="font-bold text-[var(--w-rose)]">Q</span>
                    <span>{x.question}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </article>
  )
}
