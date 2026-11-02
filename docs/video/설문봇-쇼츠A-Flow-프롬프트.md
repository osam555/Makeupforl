# 설문봇 쇼츠 A — Flow(Veo) 생성 컷 프롬프트

> 2026-11-02. 그래픽 장면(시계·알림·숫자·엔드카드)과 B롤은 **Google Flow** 로 만든다 — 사장님 결정.
> 원장님 얼굴·목소리는 여전히 생성하지 않는다(`docs/video/README.md` 1절 — Flow 는 컷마다 새 사람을 그린다).
> 그래서 아래 컷에는 **사람 얼굴이 없다.** 손·뒷모습·물건·공간만 쓴다. 규격은 `book/promo/영상제작-규칙.md` §5 (9:16, 1080×1920, 24fps, 클립 4~6초, 따뜻한 베이지·크림).

가편집(`video/out/설문봇-쇼츠A-draft.mp4`)에서 HTML 로 그린 장면을 이 컷으로 **바꾸거나 밑에 깐다.** 자막·숫자·엔드카드 글자는 Flow 에 맡기지 않고(한글이 깨진다) 그대로 ffmpeg/HTML 로 얹는다.

## 공통 꼬리 (모든 프롬프트 끝에 붙인다)

```
vertical 9:16, 1080x1920, 24fps, cinematic, soft warm beige and cream palette, shallow depth of field,
no people's faces, no text, no logos, no watermarks, one continuous shot, locked-off or extremely slow camera move
```

네거티브: `faces, person looking at camera, text, letters, captions, logo, watermark, flicker, multiple cuts`

## 컷 목록

| # | 쓰이는 자리 | 길이 | 프롬프트 (영어) | 비고 |
|---|---|---|---|---|
| F1 | 0:00–0:03 시계 장면 **밑에** | 5s | Night bedroom, a smartphone face-up on a wooden nightstand next to a folded crimson hanbok jacket; the phone screen lights up with a soft notification glow, illuminating the fabric; warm dim lamp, deep shadows, extremely slow push-in | 시계 글자 "22:40" 과 알림 카드는 위에 얹는다 |
| F2 | 0:03 직전 1초 전환 | 4s | Close-up of a woman's hand in her 50s with a simple gold ring, thumb hovering over a smartphone screen, about to tap; screen is a soft blurred pink-white glow; bedside lamp light, no face visible | 녹화로 넘어가는 다리 |
| F3 | 0:13–0:19 「한복 색」 답 구간 **옆/뒤 B롤**(선택) | 5s | Three hanbok jeogori in jade green, deep plum, and ivory hanging side by side on a wooden rack in a bright dressing room; a hand slowly lifts the sleeve of the plum one; soft window light, no face | 손님 걱정 장면의 숨 고르기. 넣으면 녹화 구간이 5초 길어진다 |
| F4 | 0:26–0:31 어드민 접수 장면 **밑에** | 5s | Early morning makeup salon, sunlight through sheer curtains onto a vanity with brushes and a mirror; a smartphone on the counter lights up with a notification, screen glow on white marble; extremely slow dolly, no people | 어드민 목록·폰 알림 그래픽을 위에 얹는다 |
| F5 | 0:31–0:35 숫자 장면 **밑에** | 5s | Abstract slow-motion: a single drop of rose-colored ink blooming in clear water, lit from behind, cream background, calm and elegant | "1건" 숫자가 선명히 읽히게 어둡지 않게. 대안: F4 의 마지막 프레임을 그대로 멈춤 |
| F6 | 0:35–0:40 엔드카드 **밑에** | 6s | Wide shot of a quiet, elegant beauty salon interior at golden hour, empty styling chairs, warm cream walls, soft bokeh; very slow push-in | 엔드카드 글자는 위에 |
| F7 (선택) | 원장님 컷 대신 쓸 **뒷모습** | 5s | Over-the-shoulder view from behind a hairstylist in a navy jacket, back of head only, black bob hair, looking at a phone on the vanity; morning light, no face visible at any point | 원장님 실제 촬영 전까지의 자리 표시. 실제 촬영이 되면 뺀다 |

## Flow 에서 할 때

1. **스틸 먼저, 영상은 그다음.** Flow 의 이미지 생성(Imagen)으로 각 컷 스틸을 2~3장 뽑아 고른 뒤 그 스틸을 시작 프레임으로 영상화한다 — `영상제작-규칙.md` §7 과 같은 길. 바로 텍스트→영상으로 가면 색과 소품이 컷마다 달라진다.
2. 스틸을 고를 때 볼 것: 손이 둘 이상 아닌지, 얼굴·눈이 걸리지 않는지, 글자가 생기지 않았는지(폰 화면 UI 가 가짜 글자를 만든다 — 폰 화면은 "soft blurred glow" 로 요구한 이유).
3. 색 맞추기: 뽑힌 클립이 손님 화면(장미색 `#9b2b4a`, 크림 `#f6f3ef`)과 어긋나면 ffmpeg `colorbalance` 로 워밍(§7-4 값에서 시작).
4. 파일 이름 `video/raw/flow/F1-a.mp4` 식으로 두고 커밋하지 않는다. 어떤 프롬프트로 뽑았는지는 이 파일에 적는다.

## 조립에 반영하는 법

`video/work/survey/assemble.sh` 의 입력에서 `rec/clock.mp4`·`rec/admin.mp4`·`rec/number.mp4`·`rec/end.mp4` 를
각각 Flow 클립으로 바꾸고, `scenes.html` 장면은 **배경을 투명(`background:transparent`)** 으로 바꿔 PNG 시퀀스로 뽑아 `overlay` 로 얹는다.
녹화(`rec/survey.mp4`)는 그대로 둔다 — 실제 화면이라는 점이 이 영상의 증거다.
