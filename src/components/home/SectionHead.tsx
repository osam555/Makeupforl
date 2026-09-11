/**
 * 홈 절 제목 — 한 가지 모양으로.
 *
 * 절마다 제목 체계가 달랐다. WHY 는 "영문 눈썹 + 한글 제목", 서비스는 제목만,
 * GALLERY 는 영문 대문자만, 고객후기는 한글만 — 옛 PHP 절과 새로 붙인 절이 섞인
 * 흔적이라 한 페이지가 두 사이트처럼 읽혔다. 눈썹 + 제목 + (한 줄 설명) 으로 맞춘다.
 *
 * 글자 크기는 옛 사이트의 .sec-tit(35px) 에 맞췄다 — 새 절만 30px 로 두니 그 절이
 * 한 단계 작아 보였다.
 */
export default function SectionHead({
  eyebrow,
  title,
  sub,
  light,
}: {
  eyebrow: string
  title: string
  sub?: string
  /** 어두운 사진 위에 놓을 때 */
  light?: boolean
}) {
  return (
    <div className="text-center">
      <p
        className={[
          'text-[13px] font-semibold tracking-[0.28em] sm:text-[14px]',
          light ? 'text-white/80' : 'text-[#F46E65]',
        ].join(' ')}
      >
        {eyebrow}
      </p>
      <h2
        className={[
          'mt-3 text-[28px] font-semibold leading-[1.2] sm:text-[35px]',
          light ? 'text-white' : 'text-[#242424]',
        ].join(' ')}
      >
        {title}
      </h2>
      {sub && (
        <p
          className={[
            'mx-auto mt-3 max-w-[640px] text-[16px] leading-[1.8] sm:text-[17px]',
            light ? 'text-white/85' : 'text-gray-600',
          ].join(' ')}
        >
          {sub}
        </p>
      )}
    </div>
  )
}
