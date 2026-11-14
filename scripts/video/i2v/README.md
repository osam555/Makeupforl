# 100문100답 i2v 쇼츠 도구

기획과 규칙은 `docs/video/wed100-shorts-i2v-plan.md`. 이 폴더는 2026-11-14 세션 스크래치패드에서 옮겨 왔다 —
스크래치패드는 세션이 정리되면 사라지므로 Flow 크레딧 읽기·초안 건너뛰기 같은 수정이 함께 날아갈 뻔했다.

순서 (파일 이름의 `free_` 는 무료 문항 5편 때 만든 이름이고, 다른 문항도 `specs/free5.json` 모양으로 적으면 그대로 돈다):

```bash
cd scripts/video/i2v
python3 free_imgs.py   [slug …]   # specs/free5.json → Flow 그림 (aside repl, 로그인된 Flow 필요)
python3 flow.py clip   <spec> <N> # 그림 → Veo 클립 (10크레딧 넘으면 멈춤)
TYPECAST_API_KEY=… python3 free_voice.py  [slug …]   # 음성 토막 + specs/<slug>.json
TYPECAST_API_KEY=… python3 free_bridge.py [slug …]   # 끝 「다음 질문은 잠겨 있어요」 화면·음성
python3 i2v_short.py specs/<slug>.json               # 조립 → video/out/shorts/i2v/<slug>_v1.mp4
python3 yt_upload.py <slug>                          # 일부 공개 업로드 + 고정 댓글 → uploads/up_<slug>.json
```

- 경로는 저장소 뿌리 기준 상대경로. 원재료(`video/work/i2v/`)와 완성본(`video/out/`)은 git 에 안 올린다.
- `font_dir` 은 아직 다른 저장소(`~/dev/speed-listening/…/fonts`)의 Pretendard 를 가리킨다.
- 키는 환경변수로만 받는다. 파일에 적지 말 것.
- 업로드는 늘 **일부 공개**. 공개 전환은 원장님 승인 사항이다.
