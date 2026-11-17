# 리메이크 쇼츠·롱폼 도구 (2026-11-16)

조회수 탑20 리메이크(쇼츠 25편, 롱폼 4편)를 만들고 올릴 때 쓴 도구다. 세션 스크래치패드에만 있으면 지워지므로 옮겨 왔다.
기획은 `docs/video/top5-remake-plan.md`, `top6-10-remake-plan.md`, `top12-20-remake-plan.md`, 롱폼은 브랜치 `claude/top20-longform-*` 의 `docs/video/top20-longform-*-plan.md`.

| 파일 | 하는 일 |
|---|---|
| `narrate.py` | 소리 글(`video/scripts/top5/narration-*.json`) → Typecast Yunjeong 토막, 48kHz 24-bit 모노, 쉼 0.35초 |
| `asr_check.py` | 토막을 whisper medium(ko)으로 받아써 대본과 견준다 |
| `recandidate.py` | 틀린 토막만 후보 3개를 만들고 받아쓰기 일치율을 찍는다 |
| `shorts_pipeline.py` | 쇼츠 단계 묶음 — `voice` / `flow` / `imgs` / `clips` / `render` |
| `check_short.py` | 완성본 검사 — 길이·해상도·음량·무음·프레임 6장·통째 받아쓰기 |
| `upload_short.py` | 쇼츠 공개 업로드 + 설명·AI 표시·고정 댓글 |
| `publish_short_draft.py` | 초안으로 남은 쇼츠를 공개로 게시(광고 적합성 설문 체크가 풀리는 문제를 고친 판) |
| `upload_longform.py` | 롱폼 업로드 — `fast`(업로드~저장) · `ab`(설명 정정 + 썸네일 A/B) · `pin`(고정 댓글) |

## 알아 둘 것

- **경로가 박혀 있다.** 워크트리(`.claude/worktrees/top6-10-remake-cf9a7d`)와 i2v 도구 폴더를 그대로 가리킨다. 다시 쓸 때 맨 위 경로 상수부터 고친다. `shorts_pipeline.py`·`upload_short.py` 는 `scripts/video/i2v/` 의 `flow.py`·`i2v_short.py`·`yt_upload.py` 를 import 하므로 그 폴더에서 돌린다.
- **키는 환경변수로만** 받는다(`TYPECAST_API_KEY`). 파일에 적지 않는다.
- **Aside REPL 한 번은 120초에서 끊긴다.** 롱폼 업로드를 여러 실행으로 나누면 실행이 끝날 때 업로드 창이 사라지고 초안도 남지 않았다. 그래서 `fast` 는 업로드부터 저장까지를 50초 안팎으로 한 번에 끝낸다.
- **REPL·`setFiles` 는 실행마다 새로 생기는 세션 폴더 밖 파일을 못 읽는다.** 큰 영상은 base64 로 싣지 않고, 실행이 시작되면 새로 생긴 세션 폴더를 찾아 하드링크를 건다(`run_with_file`). Aside 가 출력을 끝까지 모아 둘 때가 있어 `PWD` 줄을 기다리지 않는다.
- **롱폼은 업로드 창에 「수익 창출」 단계가 있다.** 광고 「사용」은 사용자 결정(2026-11-16)이다.
- **업로드 창에서 설명란에 쓰면 채널 기본 설명과 섞인다.** `ab` 단계가 수정 화면에서 전부 지우고 다시 쓴다.
- **같은 Aside 브라우저를 다른 채널 작업과 함께 쓰면 YouTube 계정이 바뀌어 Studio 가 「Oops」를 띄운다.** 올리기 전에 Studio 첫 화면이 혼주메이크업으로 열리는지 확인한다(`fast` 가 확인하고 멈춘다).
- 업로드는 사용자 지시가 있을 때만 하고, 결과는 `video/uploaded.json` 에 남긴다.
