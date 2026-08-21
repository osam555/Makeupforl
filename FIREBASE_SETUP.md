# 🔥 Firebase 설정 가이드

메이크업포엘 사이트의 백엔드는 Firebase(Firestore)입니다.
**Firebase 세팅 전에도 사이트는 리포에 포함된 시드 JSON으로 전부 동작합니다.**
세팅하면 어드민 편집·예약 접수·통계 집계가 활성화됩니다.

## 1단계: Firebase 프로젝트 생성
1. https://console.firebase.google.com 접속 (Google 계정 로그인)
2. **프로젝트 추가** → 이름 `makeupforl` → (애널리틱스는 선택) → 만들기

## 2단계: 웹 앱 등록 + 환경변수
1. 프로젝트 개요 → **웹(</>) 앱 추가** → 닉네임 `makeupforl-web` → 등록
2. 표시되는 `firebaseConfig` 값을 Vercel 환경변수로 등록
   (Vercel → 프로젝트 → Settings → Environment Variables):

| Vercel 환경변수 | firebaseConfig 키 |
|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | apiKey |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | authDomain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | projectId |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | storageBucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | messagingSenderId |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | appId |
| `NEXT_PUBLIC_ADMIN_EMAILS` | `makeupforl77@gmail.com,john.wu571@gmail.com` (쉼표로 여러 명) |
| `WED100_ADMIN_PASSWORD` | 관리자 비밀번호 (미설정 시 `8888`) |
| `FIREBASE_SERVICE_ACCOUNT` | 서비스 계정 키 JSON (7단계 참고) |

로컬 개발용은 `.env.local` 에 같은 키로 넣으세요.

## 3단계: 관리자 로그인(Authentication) 설정
1. 빌드 → **Authentication** → 시작하기
2. Sign-in method 탭 → **Google** 사용 설정 → 프로젝트 지원 이메일 선택 → 저장
3. Settings → 승인된 도메인에 `makeupforl.vercel.app` 추가 (없으면)
4. 관리자 계정: **makeupforl77@gmail.com**, **john.wu571@gmail.com** — 이 계정으로만 `/admin`, `/admin/wed100`, `/admin/dashboard` 접근 및 저장이 가능합니다

## 4단계: Firestore 데이터베이스 생성
1. 빌드 → **Firestore Database** → 데이터베이스 만들기
2. 위치: `asia-northeast3 (Seoul)` → **프로덕션 모드**로 시작
3. **규칙 탭** → `firebase/firestore.rules` 파일 내용 붙여넣기 → 게시
   - 또는 CLI 로 한 번에: `python3 scripts/deploy-rules.py` (아래 참고)

## 5단계: 100문100답 데이터 넣기
1. 배포된 사이트에서 `/admin/wed100` 접속 → **관리자 구글 계정으로 로그인**
2. 상단 **[DB에 시드 넣기]** 클릭 → 105문이 Firestore에 입력됨
3. 이후 어드민에서 수정하면 Firestore에 저장되고, 사이트에 최대 1시간 내 반영

## 컬렉션 구조
| 컬렉션 | 문서 ID | 용도 |
|---|---|---|
| `wed100_questions` | slug (예: p1-01) | 100문100답 콘텐츠 (질문/답변/자막/오디오/이미지) |
| `wed100_events` | 자동 | 조회·재생·완청·CTA 이벤트 (대시보드 집계) |
| `bookings` | 자동 | 예약 신청 (BookingForm → /admin) |
| `reviews` | 자동 | 고객 후기 (published: true 만 노출) |
| `gallery_images` | 자동 | 갤러리 (url, alt_text, category, order_position) |

## 색인(Index) 안내
다음 복합 색인이 필요할 수 있습니다. 해당 화면 첫 사용 시 콘솔 오류 메시지에
**색인 생성 링크가 자동 표시**되므로 클릭 한 번으로 만들면 됩니다.
- `bookings`: status ASC + created_at DESC (어드민 상태 필터)
- `gallery_images`: category ASC + order_position ASC
- `reviews`: published ASC + created_at DESC

## 6단계: Storage 설정 (음성 재생성 · 사진 교체에 필요)
1. 빌드 → **Storage** → 시작하기 (위치: asia-northeast3)
2. **Rules 탭** → `firebase/storage.rules` 내용 붙여넣기 → 게시

### 어드민 [음성 재생성] 사용법
`/admin/wed100` 에서 질문·답변·자막을 고친 뒤 **[음성 재생성]** 버튼을 누르면
서버가 음성을 다시 합성해 Storage에 올리고 자막 타임코드까지 갱신합니다.
그 다음 **[저장]** 을 눌러야 사이트에 반영됩니다.
- 화자: 진행자(여성, +18Hz) 질문 → 원장님(여성, 1.25배속) 답변
- 자막이 40개를 넘으면 시간 초과가 날 수 있으니, 답변을 나누거나 로컬 스크립트
  (`python3 scripts/wed100/3_gen_tts.py {slug} --force`)를 사용하세요

### 사진으로 이미지 교체
Storage에 업로드 → 다운로드 URL 복사 → `/admin/wed100` 편집 화면의 이미지 URL 칸에 붙여넣기

## 규칙 배포 — 세 가지 방법
콘솔에 붙여넣는 것 말고도 CLI 로 한 번에 올릴 수 있다.

```bash
npm i -g firebase-tools
firebase login                                    # 프로젝트 권한이 있는 구글 계정
firebase deploy --only firestore:rules,storage    # 두 규칙을 한 번에
```

`firebase.json` 과 `.firebaserc` 가 저장소에 있어서 추가 설정은 필요 없다.
서비스 계정 키가 있다면 `python3 scripts/deploy-rules.py` 도 같은 일을 한다.

## 관리자 계정 추가/변경
**네 곳을 함께** 고쳐야 한다. 하나라도 빠지면 화면은 열리는데 저장이 막히는 식으로 어긋난다.

1. `firebase/firestore.rules` 의 `isAdmin()` 이메일 목록 → 콘솔 **Firestore > 규칙** 에 다시 붙여넣기
2. `firebase/storage.rules` 의 `isAdmin()` 이메일 목록 → 콘솔 **Storage > Rules** 에 다시 붙여넣기
3. `src/lib/firebase/auth.ts` 와 `src/lib/firebase/admin.ts` 의 기본값 (환경변수가 없을 때 쓰인다)
4. Vercel 환경변수 `NEXT_PUBLIC_ADMIN_EMAILS` — **설정되어 있으면 3번 기본값을 덮어쓴다.**
   등록돼 있다면 여기에도 쉼표로 추가하고 재배포할 것

1·2 는 DB/파일 쓰기 권한, 3·4 는 어드민 화면 접근과 서버 저장 API 인증이다.

## 7단계: 서비스 계정 키 (비밀번호 로그인으로도 저장하려면 필수)

어드민은 **두 가지 로그인**을 지원합니다.

| 로그인 | 저장 방식 | 필요한 설정 |
|---|---|---|
| 관리자 구글 계정 | 서버가 ID 토큰 검증 후 저장 | 3단계(Authentication) |
| 비밀번호(기본 8888) | 서버가 비밀번호 검증 후 저장 | **이 7단계** |

두 방식 모두 **서버(Admin SDK)가 대신 쓰기** 때문에 Firestore 보안 규칙은 잠긴 채로 둘 수 있습니다.

1. Firebase Console → ⚙️ 프로젝트 설정 → **서비스 계정** 탭
2. **새 비공개 키 생성** → JSON 파일 다운로드
3. 파일 내용을 그대로 복사해 Vercel 환경변수 `FIREBASE_SERVICE_ACCOUNT` 에 붙여넣기
   - 붙여넣기가 어려우면 base64 로 인코딩한 값도 인식합니다
     (`base64 -i serviceAccount.json | pbcopy`)
4. 비밀번호를 바꾸려면 `WED100_ADMIN_PASSWORD` 도 함께 설정 → 재배포

> 서비스 계정 키는 절대 GitHub에 올리지 마세요. Vercel 환경변수에만 보관합니다.
> 키가 없으면 비밀번호 로그인은 화면 확인만 가능하고, 저장은 구글 계정으로만 됩니다.

## 보안 규칙을 CLI 로 배포하기

콘솔에 붙여넣는 대신 스크립트로 배포할 수 있습니다. `firebase/*.rules` 를 고친 뒤:

```bash
export FIREBASE_SERVICE_ACCOUNT="$(cat serviceAccount.json)"   # base64 값도 인식
export NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=makeupforl.firebasestorage.app

python3 scripts/deploy-rules.py             # firestore + storage 둘 다
python3 scripts/deploy-rules.py firestore   # 하나만
```

필요 패키지: `pip install google-auth`
규칙 파일이 곧 배포본이 되므로, 콘솔에서 직접 고치지 말고 리포의 `.rules` 파일을 고쳐 배포하세요.
