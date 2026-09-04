import Link from 'next/link'

/**
 * 100문100답 문항 카드.
 *
 * 홈 아래쪽 섹션과 히어로 미리보기가 같은 모양을 써야 해서 한곳에 둔다.
 * 한쪽만 손대면 같은 내용이 위아래에서 다르게 보인다.
 */
export default function QnaCard({ slug, question }: { slug: string; question: string }) {
  return (
    <Link
      href={`/honjoo100/${slug}`}
      className="group flex h-full items-start gap-3 rounded-2xl bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
    >
      <span className="mt-0.5 shrink-0 text-[17px] font-bold text-[#F46E65]">Q</span>
      <span className="text-[16px] font-medium leading-[1.6] text-gray-800 transition-colors group-hover:text-[#F46E65]">
        {question}
      </span>
    </Link>
  )
}
