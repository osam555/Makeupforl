import SubTabs from './SubTabs'

/**
 * 원본 .sub-visual + #lnb 그대로.
 *  .sub-visual { height:350px } / .tit { 30px, 500, #fff, 세로 중앙 }
 *  #lnb { max-width:1460px; padding:0 30px; margin:50px auto 60px }
 *
 * image 를 넘기지 않으면 사진 없이 제목만 있는 띠로 그린다.
 * 브랜드소개처럼 인물 사진이 내용과 맞지 않는 페이지에 쓴다.
 *
 * 탭은 SubTabs 가 헤더 메뉴에서 자동으로 만든다. 예전에는 페이지마다 직접 넘겨야 해서
 * 브랜드소개에만 붙어 있었고, 활성 항목도 문자열로 고정돼 눌러도 바뀌지 않았다.
 */
export default function SubHero({ title, image }: { title: string; image?: string }) {
  return (
    <>
      {image ? (
        <div className="sub-visual">
          <div
            className="background"
            style={{ backgroundImage: `url(${image})` }}
            role="img"
            aria-label={title}
          />
          <p className="tit">{title}</p>
        </div>
      ) : (
        <div className="border-b border-gray-100 bg-[#FDF4F3] py-14 text-center sm:py-20">
          <p className="text-[12px] font-semibold tracking-[0.28em] text-[#F46E65]">
            MAKEUP FOR L
          </p>
          <h2 className="mt-3 text-[26px] font-bold text-gray-900 sm:text-[34px]">{title}</h2>
        </div>
      )}
      <SubTabs />
    </>
  )
}
