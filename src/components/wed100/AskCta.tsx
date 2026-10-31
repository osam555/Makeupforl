import Link from 'next/link'

/** 설문(/honjoo100#ask)으로 가는 주소 — 입구가 여러 곳이라 한 곳에 둔다 */
export const ASK_HREF = '/honjoo100#ask'

/**
 * "원장님께 물어보기" 입구.
 *
 * 설문은 /honjoo100 한 곳에만 있어서 링크를 받은 사람만 닿았다(2026-10-31).
 * 손님이 실제로 많이 들어오는 문항 상세·검색어 허브 끝에 이 상자를 둔다.
 * 매출은 이용권보다 예약에서 나므로, 읽고 난 자리에서 연락처를 받는 쪽이 중요하다.
 */
export default function AskCta({ title = '이 고민, 원장님께 직접 물어보세요' }: { title?: string }) {
  return (
    <div className="rounded-xl border border-[var(--w-line)] bg-[var(--w-card2)] p-6 text-center">
      <p className="text-lg font-extrabold text-[var(--w-ink)]">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-[15px] leading-relaxed text-[var(--w-ink2)]">
        몇 가지만 고르시면 맞는 답을 바로 보여 드리고, 원하시면 대표원장이 직접 연락드립니다. 30초면 됩니다.
      </p>
      <Link
        href={ASK_HREF}
        className="mt-4 inline-flex rounded-full bg-[var(--w-cta-bg)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
      >
        원장님께 물어보기
      </Link>
    </div>
  )
}
