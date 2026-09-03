import SubTabs from './SubTabs'

/**
 * 원본 .sub-visual + #lnb 그대로.
 *  .sub-visual { height:350px } / .tit { 30px, 500, #fff, 세로 중앙 }
 *  #lnb { max-width:1460px; padding:0 30px; margin:50px auto 60px }
 *
 * image 를 넘기지 않으면 비주얼 영역을 아예 그리지 않고 탭만 남긴다.
 * 브랜드소개처럼 바로 아래에 대표원장 인사말과 사진이 오는 페이지에 쓴다.
 *
 * 탭은 SubTabs 가 헤더 메뉴에서 자동으로 만든다. 예전에는 페이지마다 직접 넘겨야 해서
 * 브랜드소개에만 붙어 있었고, 활성 항목도 문자열로 고정돼 눌러도 바뀌지 않았다.
 */
export default function SubHero({ title, image }: { title: string; image?: string }) {
  return (
    <>
      {image && (
        <div className="sub-visual">
          <div
            className="background"
            style={{ backgroundImage: `url(${image})` }}
            role="img"
            aria-label={title}
          />
          <p className="tit">{title}</p>
        </div>
      )}
      {/* 사진이 없으면 그 자리를 비워둘 이유가 없어 탭 여백을 줄인다 */}
      <SubTabs compact={!image} />
    </>
  )
}
