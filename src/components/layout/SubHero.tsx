import SubTabs from './SubTabs'

/**
 * 원본 .sub-visual + #lnb 그대로.
 *  .sub-visual { height:350px } / .tit { 30px, 500, #fff, 세로 중앙 }
 *  #lnb { max-width:1460px; padding:0 30px; margin:50px auto 60px }
 *  .lnb ul li { max-width:230px } / a { height:60px; radius:30px; font-size:20px }
 *
 * 탭은 SubTabs 가 헤더 메뉴에서 자동으로 만든다. 예전에는 페이지마다 직접 넘겨야 해서
 * 브랜드소개에만 붙어 있었고, 활성 항목도 문자열로 고정돼 눌러도 바뀌지 않았다.
 */
export default function SubHero({ title, image }: { title: string; image: string }) {
  return (
    <>
      <div className="sub-visual">
        <div
          className="background"
          style={{ backgroundImage: `url(${image})` }}
          role="img"
          aria-label={title}
        />
        <p className="tit">{title}</p>
      </div>
      <SubTabs />
    </>
  )
}
