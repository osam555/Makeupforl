# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

메이크업포엘(강남 메이크업샵) 웹사이트. Next.js 16 App Router + React 19 + Tailwind v4 + Firebase,
Vercel(icn1) 배포. 도메인은 makeupforl.co.kr.

## 명령

```bash
npm run dev          # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드 — 타입 오류를 여기서 잡는다
npm run lint         # eslint (eslint.config.mjs, next/core-web-vitals)
```

테스트 프레임워크는 없다. 검증은 `npm run build` + 실제 화면 확인이다.

```bash
# Firebase 보안 규칙 배포 (규칙 원본은 firebase/*.rules — 콘솔에서 직접 고치지 말 것)
firebase deploy --only firestore:rules,storage
python3 scripts/deploy-rules.py [firestore|storage]     # FIREBASE_SERVICE_ACCOUNT 필요

# 100문100답 콘텐츠 파이프라인 (파일 이름의 번호 = 실행 순서)
python3 scripts/wed100/1_parse_docx.py
python3 scripts/wed100/3_gen_tts.py {slug} --force      # 자막 40개 넘어 어드민 TTS 가 타임아웃될 때
python3 scripts/wed100/4_build_photos.py --src <사진폴더>
python3 scripts/wed100/5_assign_photos.py [--firestore]
GOOGLE_APPLICATION_CREDENTIALS=<키> python3 scripts/wed100/sync_seed.py   # 푸시 전 Firestore → 시드 JSON
```

로컬 `.env.local` 에는 공개 키(`NEXT_PUBLIC_FIREBASE_*`)만 둔다.
`FIREBASE_SERVICE_ACCOUNT` 를 넣으면 로컬 개발이 운영 Firestore 에 그대로 쓴다 — 방문 통계가
오염되고 문항을 덮어쓸 수 있다. 키가 없으면 읽기는 전부 되고 저장 API 만 503 으로 막히는데,
이건 고장이 아니라 설계된 길이다(아래 폴백 참고). `vercel env pull` 로는 값을 못 가져온다
(Secret 타입) — `firebase apps:sdkconfig WEB --project makeupforl` 을 쓴다.

환경변수 전체 목록과 Firebase 초기 세팅은 `FIREBASE_SETUP.md`.
100문100답 사진·음성 운영은 `docs/wed100-사진과-음성.md`.

## 뼈대

### Firestore 우선 · 시드 JSON 폴백

이 저장소의 가장 중요한 규칙이다. **Firebase 가 하나도 세팅되지 않아도 사이트는 전부 동작해야 한다.**
데이터를 읽는 lib 함수는 예외 없이 이 순서를 탄다:

1. Admin SDK(`getAdminDb()`) — 서버, 보안 규칙 우회
2. 클라이언트 SDK(`getDb()`) — 브라우저 또는 서비스 계정 미설정 환경
3. `src/data/*.json` 시드 — 위가 비었거나 던졌을 때

`src/lib/wed100.ts` 의 `getWed100Items()` 가 표준 구현이다. 새 데이터 소스를 추가할 때 이 모양을 따를 것.
실패는 삼키고 폴백한다 — 장애 때 화면이 비는 쪽이 옛 데이터가 잠깐 보이는 쪽보다 손해가 크다.

Firestore 에서 고친 내용은 `scripts/wed100/sync_seed.py` 로 시드에 되돌려 넣어야
폴백했을 때도 같은 내용이 보인다.

### `.server.ts` 분리

`firebase-admin` 을 끌어오는 코드는 반드시 `*.server.ts` 로 나눈다
(`wed100Access.ts` / `wed100Access.server.ts`, `analytics.ts` / `analytics.server.ts`,
`seoTargets.ts` / `seoTargets.server.ts`).
`.server.ts` 를 클라이언트 컴포넌트에서 import 하면 서버 SDK 가 브라우저 번들에 딸려 들어가 빌드가 깨진다.
화면에서도 쓰는 순수 함수·타입·상수는 짝이 되는 일반 파일에 둔다.

### 어드민 인증

- **구글 계정 로그인만** 받는다. 비밀번호(8888) 로그인은 보안 문제로 제거됐다 — 되살리지 말 것.
- 서버 저장 API 는 전부 `verifyAdmin({ idToken })` 를 먼저 통과시킨다. Admin SDK 는 보안 규칙을
  우회하므로, 이 확인을 빠뜨리면 그 라우트는 그대로 뚫린다.
- 토큰 검증은 `firebase-admin/auth` 가 아니라 Identity Toolkit REST(`accounts:lookup`)로 한다.
  `firebase-admin/auth` 는 ESM 전용 `jose` 를 끌어와 서버 번들에서 `ERR_REQUIRE_ESM` 으로 터진다.
- 관리자 이메일은 **네 곳**에 있다. 추가·변경 시 전부 맞춰야 한다:
  `firebase/firestore.rules`, `firebase/storage.rules`,
  `src/lib/firebase/auth.ts`·`src/lib/firebase/admin.ts` 의 기본값,
  그리고 이들을 덮어쓰는 Vercel 환경변수 `NEXT_PUBLIC_ADMIN_EMAILS`.

### 화면 두 갈래 — 손님용과 관리용

- 손님용은 `SiteShell` 이 감싸고, 옛 PHP 사이트에서 이식한 `src/styles/mfl-original.css` 가 적용된다.
  이 CSS 는 `.mfl-site` 로 스코프되지만 캐스케이드 레이어 밖이라 명시도가 낮아도 Tailwind 유틸리티를 이긴다.
- `/admin/*` 는 `SiteShell` 을 씌우지 않는다(그 CSS 와 싸우지 않기 위해서). 대신
  `src/app/admin/layout.tsx` 의 `AdminTheme`(색·글자 크기) + `AdminAuthProvider`(로그인)가 감싸고,
  각 페이지는 `AdminShell`(제목·새로고침·설정·탭, 화면 위에 붙박이)을 쓴다.
  어드민 색은 `src/styles/admin-theme.css` 의 변수 표 — **스크립트로 생성한 부분은 손으로 고치지 말 것**
  (파일 맨 아래 손글씨 규칙만 예외).

### 100문100답 (wed100 / honjoo100)

이 사이트의 핵심 콘텐츠이자 유일한 유료 상품. 주소는 `/honjoo100`, 코드·컬렉션 이름은 `wed100`
(옛 `/wed100` 주소는 next.config 에서 301).

- 콘텐츠: Firestore `wed100_questions`(문서 ID = slug, 예 `p1-01`) ↔ 시드 `src/data/wed100.json`
- 잠금(유료): Firestore `site_config/wed100` — `paywall`, 무료 문항 `freeQna`(5개),
  구매자 `members[]`(이메일 + `until` 날짜, 기본 3개월). 설정을 못 읽으면 **잠그지 않는다**.
- 음성: 답변은 edge-tts(원장님, 1.25배속), MC 질문은 Typecast(`TYPECAST_API_KEY`).
  두 소스를 이어붙이므로 **24kHz / 48kbps / 모노 mp3** 규격을 반드시 맞춘다 — 어긋나면 자막 타임코드가 밀린다.
- 자막 `cues` 는 답변 텍스트와 `syncCuesWithAnswer()` 로 맞춘다. 저장 시 이전 값은
  `wed100Versions.ts` 가 스냅샷으로 남긴다.
- 사진은 `photoAuto: false` 면 자동 배정 스크립트가 건드리지 않는다.

### SEO — 건드리면 유입이 사라지는 것들

- `src/lib/hubs.ts`: 검색어 허브. 실제 검색어를 그대로 한 칸짜리 주소로 쓴다(`/혼주한복`).
  `src/app/[topic]/page.tsx` 가 `dynamicParams = false` + `generateStaticParams()` 로 받으므로
  목록에 없는 말은 404 다. 허브 본문은 문항의 답을 그대로 옮기지 않는다 — 유료 상품이 남아야 한다.
- `next.config.ts` 의 redirects: 옛 PHP 사이트 76건의 301 표. 지우면 검색 순위와 유입이 함께 사라진다.
- `src/lib/site.ts` 의 `SITE_URL` 이 metadata·sitemap·robots 의 기준이다(`NEXT_PUBLIC_SITE_URL` 로 덮어씀).
- 루트 layout 의 `naver-site-verification` 태그는 확인이 끝나도 지우면 안 된다.
- `src/lib/seoTargets.ts`: 검색어 목표와 "준비도" 계산(순위가 아니라 우리가 할 수 있는 것의 달성도).
  실측 순위는 사람이 재서 적고 잰 날짜를 함께 남긴다.

### 캐싱과 재검증

- 공개 페이지는 `export const revalidate = 3600`. 어드민 저장 API 는 저장 뒤 `revalidatePath()` 로 뚫는다.
- 어드민 페이지는 `dynamic = 'force-dynamic'`, API 라우트는 `runtime = 'nodejs'`
  (무거운 것은 `maxDuration = 60`).
- `public/sw.js`: HTML 은 항상 네트워크 우선(캐시는 오프라인용), 해시 붙은 정적 파일만 캐시 우선,
  API·이미지 최적화·Firestore 는 아예 손대지 않는다. 캐시를 갈아엎으려면 `VERSION` 을 올린다.

### 그 밖에

- CSS `background-image` 는 `bgImage(url)` 로 감싼다 — `/_next/image` 를 경유시켜 WebP/AVIF 로 내린다.
  `<Image>` 와 달리 배경은 자동 최적화가 안 걸린다.
- 방문 기록(`/api/track`)은 사람을 식별하지 않는다. 쿠키·IP·UA 를 저장하지 않고 날짜별 문서 하나에
  증가값만 쌓는다. 개인정보처리방침과 어긋나므로 식별 가능한 값을 추가하지 말 것.
- UI 프리미티브는 `src/components/ui/*` (shadcn 스타일, Radix + CVA + `cn()`).

## 이 저장소의 글쓰기

코드 주석은 한국어로, **무엇을 하는지가 아니라 왜 그렇게 했는지**를 쓴다 — 어떤 방식을 버렸고 왜 버렸는지,
무엇이 깨졌었는지까지. 기존 파일 상단의 주석 블록이 본보기다. 커밋 메시지도 한국어 평서문
(예: "어드민 여섯 화면을 한 껍데기로 — 윗줄 여섯 줄을 두 줄로").

`DEPLOYMENT.md` 는 오래된 문서다 — Supabase 를 쓴다고 적혀 있으나 백엔드는 Firebase 다.
