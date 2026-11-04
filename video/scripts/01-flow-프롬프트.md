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
