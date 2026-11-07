import { Composition } from "remotion";
import { Teaser, TeaserProps, DEMO } from "./Teaser";

/*
  잠금 문항 쇼츠의 본편(훅 → 원장님 한마디 → 답 앞부분 → 잠금 화면). 끝 카드·소리·음량은 붙이지 않는다 —
  그건 scripts/video/top10_short.py 가 앞선 여섯 편과 같은 ending()·loudnorm 으로 붙인다(16편의 끝이 같아야 해서).
  길이는 props 의 duration 으로 정한다 — 문항마다 들려줄 답의 길이가 다르다.
*/
export const RemotionRoot: React.FC = () => (
  <Composition
    id="Teaser"
    component={Teaser}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={30 * 20}
    defaultProps={DEMO}
    calculateMetadata={({ props }: { props: TeaserProps }) => ({
      durationInFrames: Math.round(props.duration * 30),
    })}
  />
);
