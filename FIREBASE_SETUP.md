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
| `WED100_ADMIN_PASSWORD` | (직접 정하는 어드민 비밀번호) |

로컬 개발용은 `.env.local` 에 같은 키로 넣으세요.

## 3단계: Firestore 데이터베이스 생성
1. 빌드 → **Firestore Database** → 데이터베이스 만들기
2. 위치: `asia-northeast3 (Seoul)` → **프로덕션 모드**로 시작
3. **규칙 탭** → `firebase/firestore.rules` 파일 내용 붙여넣기 → 게시

## 4단계: 100문100답 데이터 넣기
1. 배포된 사이트에서 `/admin/wed100` 접속 → 관리자 비밀번호 로그인
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

## 사진 업로드 (이미지 교체)
1. 빌드 → **Storage** → 시작하기 (Seoul)
2. 파일 업로드 후 URL 복사 → `/admin/wed100` 편집 화면의 이미지 URL 칸에 붙여넣기

## 운영 보안 강화 (권장, 추후)
현재 어드민은 비밀번호 게이트 + 느슨한 쓰기 규칙입니다. 트래픽이 늘면:
1. Firebase Authentication 활성화 (이메일/비밀번호)
2. 원장님 계정에 admin 커스텀 클레임 부여
3. `firestore.rules` 의 `allow write: if true` → `if request.auth != null` 로 교체
