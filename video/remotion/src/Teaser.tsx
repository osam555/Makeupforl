import React from "react";
import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/*
  화면 모양은 앞선 무료 문항 쇼츠(scripts/video/wed100_short.py)를 그대로 옮겼다 — 같은 채널에 나란히 걸리므로
  머리글 위치·사진 패널 자리·자막 상자가 다르면 다른 사람이 만든 영상처럼 보인다.
  PIL 그림 + ffmpeg 겹치기로는 장면마다 다른 움직임(Flow 컷 위 자막, 사진 넘김)을 넣을 때마다 필터 그래프를 새로 짜야 했다.
  여기서는 장면을 props 의 목록으로 받아 같은 틀로 10편을 찍는다.

  소리는 넣지 않는다. 영상만 그리고, 소리는 top10_short.py 가 numpy 로 섞어 마지막 ffmpeg 에서 합친다 —
  목소리를 한 음색으로 바꾸는 단계(ChatterboxVC)가 섞은 뒤에 한 번 돌아야 해서다.
*/

const W = 1080;
const PHOTO_Y = 420;
const PHOTO_H = 1160;
const SUB_CY = 1455;
const CREAM = "#F7F1E8";
const CREAM2 = "#EEE5D7";
const GOLD = "#B08D57";
const INK = "#2E2622";
const SUB = "#7A624A";
const NAVY = "#22262E";

export type Segment =
  | { kind: "scene"; src: string; from: number; to: number } // HyperFrames 로 그린 장면(훅·잠금) — 화면 전체
  | { kind: "flow"; src: string; from: number; to: number; mediaStart: number } // Flow 원장님 컷 — 화면 전체
  | {
      kind: "photo";
      src: string;
      iw: number;
      ih: number;
      from: number;
      to: number;
      crop?: [number, number]; // 가로 구간(0~1) — 콜라주·세로 사진에서 한 칸만
      pan: number;
    };

export type TeaserProps = {
  duration: number;
  part: string;
  question: string;
  segments: Segment[];
  subs: { text: string; from: number; to: number }[];
};

export const DEMO: TeaserProps = {
  duration: 6,
  part: "PART 4 · 헤어",
  question: "혼주 한복에는 반드시 올림머리를 해야 하나요?",
  segments: [],
  subs: [{ text: "자막 미리보기", from: 0, to: 6 }],
};

/* 폰트를 다 받기 전에 첫 프레임을 찍으면 자막이 대체 글꼴로 나온다 */
const fontHandle = delayRender("Pretendard");
Promise.all(
  [
    ["700", "Pretendard-Bold.otf"],
    ["900", "Pretendard-Black.otf"],
  ].map(([w, f]) => {
    const ff = new FontFace("P", `url(${staticFile("fonts/" + f)})`, { weight: w });
    return ff.load().then((x) => document.fonts.add(x));
  }),
).then(() => continueRender(fontHandle));

const shadow = "0 2px 6px rgba(0,0,0,.35)";

const Header: React.FC<{ light: boolean }> = ({ light }) => {
  const st: React.CSSProperties = {
    position: "absolute",
    top: 62,
    fontFamily: "P",
    fontWeight: 700,
    fontSize: 38,
    color: light ? "#fff" : NAVY,
    textShadow: light ? shadow : "none",
  };
  return (
    <>
      <div style={{ ...st, left: 44 }}>메이크업포엘</div>
      <div style={{ ...st, right: 44 }}>혼주 메이크업 100문 100답</div>
    </>
  );
};

const PhotoPanel: React.FC<Extract<Segment, { kind: "photo" }>> = ({ src, iw, ih, from, to, crop, pan }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const dx = interpolate(t, [0, to - from], [0, -pan], { extrapolateRight: "clamp" });
  const [a, b] = crop ?? [0, 1];
  const cw = (b - a) * iw;
  // 한 칸을 패널 안에 다 보이게(contain) — 꽉 채워 자르면 콜라주 이음매나 얼굴이 잘렸다(wed100_short --crop 과 같은 이유)
  const s = crop ? Math.min(W / cw, PHOTO_H / ih) * 1.0 : Math.max(W / iw, PHOTO_H / ih);
  const fw = (crop ? cw : iw) * s;
  const fh = ih * s;
  return (
    <div style={{ position: "absolute", left: 0, top: PHOTO_Y, width: W, height: PHOTO_H, overflow: "hidden" }}>
      <Img
        src={staticFile(src)}
        style={{ position: "absolute", inset: -60, width: W + 120, height: PHOTO_H + 120, objectFit: "cover", filter: "blur(28px)", opacity: 0.8 }}
      />
      <div
        style={{
          position: "absolute",
          left: (W - fw) / 2 + (crop ? 0 : dx + pan / 2),
          top: (PHOTO_H - fh) / 2,
          width: fw,
          height: fh,
          overflow: "hidden",
        }}
      >
        <Img src={staticFile(src)} style={{ position: "absolute", left: -a * iw * s, top: 0, width: iw * s, height: fh }} />
      </div>
    </div>
  );
};

const AnswerFrame: React.FC<{ part: string; question: string }> = ({ part, question }) => (
  <>
    <div style={{ position: "absolute", left: 0, right: 0, top: 176, textAlign: "center", fontFamily: "P", fontWeight: 700, fontSize: 34, color: GOLD }}>
      {part}
    </div>
    <div
      style={{
        position: "absolute", left: 60, right: 60, top: 222, height: 170, display: "flex", alignItems: "center",
        justifyContent: "center", textAlign: "center", fontFamily: "P", fontWeight: 900, fontSize: 62, lineHeight: 1.25,
        color: INK, wordBreak: "keep-all",
      }}
    >
      Q. {question}
    </div>
    <div style={{ position: "absolute", left: 0, width: W, top: PHOTO_Y - 6, height: 5, background: GOLD }} />
    <div style={{ position: "absolute", left: 0, width: W, top: PHOTO_Y + PHOTO_H, height: 5, background: GOLD }} />
    <div style={{ position: "absolute", left: 0, right: 0, top: PHOTO_Y + PHOTO_H + 46, textAlign: "center", fontFamily: "P", fontWeight: 700, fontSize: 32, color: SUB }}>
      전체 답변 · makeupforl.co.kr/honjoo100
    </div>
  </>
);

const Subtitle: React.FC<{ text: string }> = ({ text }) => (
  <div style={{ position: "absolute", left: 0, right: 0, top: SUB_CY, display: "flex", justifyContent: "center", transform: "translateY(-50%)" }}>
    <div
      style={{
        background: "rgba(255,255,255,.5)", color: "#101010", fontFamily: "P", fontWeight: 700, fontSize: 68,
        padding: "16px 30px", borderRadius: 12, whiteSpace: "nowrap", maxWidth: W - 40,
      }}
    >
      {text}
    </div>
  </div>
);

export const Teaser: React.FC<TeaserProps> = ({ part, question, segments, subs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const f = (s: number) => Math.round(s * fps);
  const cur = segments.find((s) => t >= s.from && t < s.to);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${CREAM}, ${CREAM2})` }}>
      {segments.map((s, i) => (
        <Sequence key={i} from={f(s.from)} durationInFrames={Math.max(1, f(s.to) - f(s.from))}>
          {s.kind === "photo" ? (
            <AbsoluteFill style={{ background: `linear-gradient(${CREAM}, ${CREAM2})` }}>
              <AnswerFrame part={part} question={question} />
              <PhotoPanel {...s} />
            </AbsoluteFill>
          ) : s.kind === "flow" ? (
            // Veo 워터마크가 오른쪽 아래에 박혀 있다 — 6% 키워 가장자리째 밀어낸다(소개 쇼츠와 같은 처리)
            <AbsoluteFill style={{ overflow: "hidden" }}>
              <OffthreadVideo src={staticFile(s.src)} startFrom={f(s.mediaStart)} muted
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scale(1.06)", transformOrigin: "40% 40%" }} />
            </AbsoluteFill>
          ) : (
            <OffthreadVideo src={staticFile(s.src)} muted style={{ width: "100%", height: "100%" }} />
          )}
        </Sequence>
      ))}
      {/* 머리글은 잠금 화면에서 빼 그 화면의 금색 띠·질문과 겹치지 않게 한다 */}
      {cur && !(cur.kind === "scene" && cur.src.endsWith("lock.mp4")) && <Header light={cur.kind !== "photo"} />}
      {subs.map((s, i) => (
        <Sequence key={"s" + i} from={f(s.from)} durationInFrames={Math.max(1, f(s.to) - f(s.from))}>
          <Subtitle text={s.text} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
