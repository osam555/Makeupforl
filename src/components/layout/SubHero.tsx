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
          {/*
            페이지 제목은 h1 이다.

            전에는 헤더 로고가 h1 이라 페이지마다 h1 이 둘이었다. 로고를 빼고 나니
            이번에는 이 페이지들에 h1 이 하나도 없었다. 잘못된 h1 을 뺐으면 각
            페이지가 자기 제목을 h1 으로 가져야 한다.
            보이는 모습은 .sub-visual .tit 가 정하므로 화면은 달라지지 않는다.
          */}
          <h1 className="tit">{title}</h1>
        </div>
      )}
      {/*
        사진이 없으면 그 자리를 비워둘 이유가 없어 탭 여백을 줄인다.

        다만 제목은 남겨야 한다. 사진이 있을 때만 제목을 그리다 보니 브랜드소개와
        개인정보처리방침에는 h1 이 아예 없었다 — 검색엔진에 이 페이지가 무엇에
        대한 것인지 말해 주는 문장이 한 줄도 없는 셈이다. 화면에는 이미 각 페이지가
        자기 제목을 크게 쓰고 있으므로, 여기서는 읽어 주기만 하고 보이지는 않는다.
      */}
      {!image && <h1 className="blind">{title}</h1>}
      <SubTabs compact={!image} />
    </>
  )
}
