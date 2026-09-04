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
          잠금 안내. 구조화 데이터(isAccessibleForFree:false)가 이 영역을 가리키므로
          클래스 이름을 바꾸려면 페이지의 JSON-LD 도 같이 고쳐야 한다.
        */}
        <div className="paywall mt-7 rounded-2xl border border-[var(--w-line)] bg-[var(--w-bg)] p-6 sm:p-8">
          <p className="text-[15px] font-bold text-[var(--w-ink)]">
            이 문항의 답변은 준비 중입니다
          </p>
          <p className="mt-2 text-[14px] leading-[1.8] text-[var(--w-ink2)]">
            {notice ||
              '원장이 직접 답한 본문과 음성은 정식 공개 뒤 보실 수 있습니다. 먼저 열어 둔 문항으로 어떤 내용인지 확인해 보세요.'}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {storeUrl && (
              <a
                href={storeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center rounded-full bg-[var(--w-rose)] px-6 py-3 text-[14px] font-bold text-white transition-opacity hover:opacity-90"
              >
                전체 보기 신청
              </a>
            )}
            <Link
              href="/honjoo100"
              className="inline-flex items-center rounded-full border border-[var(--w-line)] px-6 py-3 text-[14px] font-bold text-[var(--w-ink)] transition-colors hover:border-[var(--w-rose)] hover:text-[var(--w-rose)]"
            >
              전체 목록 보기
            </Link>
            <Link
              href="/consultation"
              className="inline-flex items-center rounded-full border border-[var(--w-line)] px-6 py-3 text-[14px] font-bold text-[var(--w-ink)] transition-colors hover:border-[var(--w-rose)] hover:text-[var(--w-rose)]"
            >
              1:1 사전컨설팅
            </Link>
          </div>
        </div>

        {freeSample.length > 0 && (
          <div className="mt-8">
            <h2 className="text-[15px] font-bold text-[var(--w-ink)]">지금 바로 보실 수 있는 문항</h2>
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
