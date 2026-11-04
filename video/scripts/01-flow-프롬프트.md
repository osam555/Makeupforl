# 01 소개형 — Flow 바탕 영상 프롬프트 (블록 ②③)

블록 ① 과 **같은 사람으로 보이게** 하는 것이 전부다. 그래서
- 반드시 **Frames to Video(첫 프레임 지정)** 로 만들고 첫 프레임은 `video/work/ref-face.png`
  (블록 ① Flow 클립의 첫 프레임) 한 장만 쓴다. 텍스트만으로 만들면 Flow 가 새 사람을 그린다.
- 목소리는 쓰지 않는다 — 복제한 원장님 목소리(`tts-solo.wav`)로 갈아 끼우고 입은 Wav2Lip 으로 맞춘다.
  그래서 대사를 프롬프트에 넣지 않고 「말하는 듯한 입 움직임」만 요구한다.
- 9:16, 8초. 음성은 ② 7.3초, ③ 7.3초라 8초면 남는다.

## 블록 ② — 「질문 백 가지를 / 백문백답에 모두 담았습니다」

```
Same woman as in the start frame, exactly the same face, hair and black pinstripe jacket with white top.
Solo shot, exactly one person in frame. Chest-up framing, facing the camera directly, eye level.
She speaks warmly and confidently to the camera, as if explaining something proud,
with natural mouth movement and one gentle open-palm gesture toward the camera at chest height.
Bright elegant wedding hall background, soft warm light, softly blurred, unchanged from the start frame.
Locked-off camera, no cuts, one continuous shot. No text, no captions, no other people.
```

## 블록 ③ — 「품위와 아름다움 모두 놓치지 마세요 / 혼주에 진심인 메이크업 포엘입니다」

```
Same woman as in the start frame, exactly the same face, hair and black pinstripe jacket with white top.
Solo shot, exactly one person in frame. Chest-up framing, facing the camera directly, eye level.
She speaks sincerely to the camera with natural mouth movement, hands resting together in front,
then finishes with a warm, gracious smile and a small polite nod, holding the smile for the last second.
Bright elegant wedding hall background, soft warm light, softly blurred, unchanged from the start frame.
Locked-off camera, no cuts, one continuous shot. No text, no captions, no other people.
```

## 받은 뒤

1. 두 클립을 `~/Downloads` 에 둔다(파일 이름은 아무거나).
2. 얼굴이 블록 ① 과 다르면(눈매·머리선·재킷) 버리고 다시 만든다 — 입맞춤으로는 고쳐지지 않는다.
3. `scripts/video/mouth_blend.py` 로 블록 ① 과 같은 방식으로 입을 맞춘다.

## 2026-11-04 — 블록 ③ 실제로 만든 것 (위 「대사를 넣지 않는다」는 낡은 방식)

10-15 시험으로 **한국어 대사를 프롬프트에 그대로 넣는** 쪽이 맞다고 확정됐다 — 넣지 않으면 영어로 아무 말이나 하고,
넣으면 영상 속 입이 같은 문장을 말해서 복제 음성을 입 박자에 맞추기만 하면 된다(`align_voice.py`, 입 선명도 손실 없음).

- 계정 john.wu571 (`flow.google.com/u/1/`), 프로젝트 「Nov 04 - 17:26」, Frames → 첫 프레임 `video/work/ref-face.png`
- Veo 3.1 - Quality · 9:16 · 8s · x1 = 100크레딧. 받기는 「1080p Upscaled」(무료)
- 결과 `video/raw/flow/block3-flow-korean-1080p.mp4`(7.85초) — 얼굴·머리선·재킷이 ①② 와 같다, 끝에 미소

```
Same woman as in the start frame, exactly the same face, short black hair and black pinstripe jacket with white top.
Solo shot, exactly one person in frame. Chest-up framing, facing the camera directly, eye level.
She speaks sincerely and warmly to the camera in Korean, saying exactly:
"결혼식 날, 품위와 아름다움 모두 놓치지 마세요. 혼주에 진심인, 메이크업포엘입니다."
Natural mouth movement matching the Korean words, hands resting together in front, then she finishes with a warm,
gracious smile and a small polite nod, holding the smile for the last second.
Bright elegant wedding hall background, soft warm light, softly blurred, unchanged from the start frame.
Locked-off camera, no cuts, one continuous shot. No text, no captions, no subtitles, no music, no other people.
```

입맞춤: whisper 낱말 11개가 양쪽에서 같았고, 늘인 비율이 최대 1.47배(혼주의 … 진심인)였지만 받아쓰기는 대본 그대로였다.
Flow 화면에는 「생성 전 확인」 설정이 보이지 않았다(11-04) — 생성 단추는 한 번만 누른다.
Aside REPL 은 세션 폴더 밖 파일을 올리지 못한다 → 이미지를 base64 로 넘겨 세션 폴더에 쓴 뒤 올렸다.
