# ✅ MakeupForL 설정 체크리스트

프로젝트 설정을 단계별로 완료하세요.

## 1단계: Supabase 프로젝트 생성 (5분)

### 1-1. Supabase 접속
- [ ] https://app.supabase.com/ 접속
- [ ] GitHub 계정으로 로그인

### 1-2. 새 프로젝트 생성
- [ ] "New Project" 클릭
- [ ] Organization 선택 (없으면 자동 생성됨)
- [ ] Project name: `makeupforl` 입력
- [ ] Database Password: **강력한 비밀번호 생성 후 저장!** 📝
- [ ] Region: `Northeast Asia (Seoul)` 선택
- [ ] Pricing Plan: `Free` 선택
- [ ] "Create new project" 클릭
- [ ] ⏳ 약 2분 대기 (프로젝트 생성 중...)

### 1-3. API 키 복사
프로젝트 생성 완료 후:
- [ ] 좌측 메뉴 "Settings" 클릭
- [ ] "API" 탭 클릭
- [ ] **Project URL** 복사 → 메모장에 저장
- [ ] **anon public** 키 복사 → 메모장에 저장

### 1-4. 환경변수 설정
터미널에서 실행:
```bash
cd /Users/osam/dev/Makeupforl/makeupforl-app
```

`.env.local` 파일 열어서 수정:
```bash
NEXT_PUBLIC_SUPABASE_URL=복사한_프로젝트_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=복사한_anon_키
```

예시:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 2단계: 데이터베이스 스키마 생성 (3분)

### 2-1. SQL Editor 접속
- [ ] Supabase 대시보드에서 좌측 메뉴 "SQL Editor" 클릭
- [ ] "+ New query" 버튼 클릭

### 2-2. 스키마 실행
- [ ] `supabase/schema.sql` 파일 열기
- [ ] **전체 내용 복사** (Cmd/Ctrl + A → Cmd/Ctrl + C)
- [ ] SQL Editor에 붙여넣기 (Cmd/Ctrl + V)
- [ ] **"Run"** 버튼 클릭 (또는 Cmd/Ctrl + Enter)
- [ ] ✅ 성공 메시지 확인: "Success. No rows returned"

### 2-3. 테이블 확인
- [ ] 좌측 메뉴 "Table Editor" 클릭
- [ ] 다음 테이블들 확인:
  - [ ] `categories` (7개 행)
  - [ ] `galleries`
  - [ ] `images`
  - [ ] `reviews`
  - [ ] `bookings`
  - [ ] `pages`

### 2-4. 카테고리 데이터 확인
`categories` 테이블 클릭 후 확인:
- [ ] 혼주
- [ ] 가족 및 하객
- [ ] 웨딩
- [ ] 남자 메이크업
- [ ] 기업행사&영상메이크업
- [ ] 화보 & 프로필
- [ ] 패션쇼

## 3단계: Storage 버킷 생성 (2분)

### 3-1. 갤러리 이미지 버킷
- [ ] 좌측 메뉴 "Storage" 클릭
- [ ] "Create a new bucket" 클릭
- [ ] Name: `gallery-images`
- [ ] ✅ "Public bucket" 체크
- [ ] "Create bucket" 클릭

### 3-2. 후기 이미지 버킷
- [ ] "Create a new bucket" 클릭
- [ ] Name: `review-images`
- [ ] ✅ "Public bucket" 체크
- [ ] "Create bucket" 클릭

### 3-3. Storage 정책 설정
각 버킷에 대해:
- [ ] `gallery-images` 클릭 → "Policies" 탭
- [ ] "New Policy" → "Get started quickly" → "Allow public access" 선택
- [ ] "Review" → "Save policy"
- [ ] `review-images` 버킷도 동일하게 반복

## 4단계: 로컬 개발 서버 테스트 (1분)

### 4-1. 개발 서버 실행
터미널에서:
```bash
cd /Users/osam/dev/Makeupforl/makeupforl-app
npm run dev
```

### 4-2. 브라우저 확인
- [ ] http://localhost:3000 접속
- [ ] Next.js 기본 페이지 확인
- [ ] 개발자 도구 (F12) → Console 탭
- [ ] ❌ 에러가 없는지 확인

### 4-3. Supabase 연결 테스트
브라우저 콘솔에서 실행:
```javascript
// 콘솔에 붙여넣기
fetch('복사한_SUPABASE_URL/rest/v1/categories', {
  headers: {
    'apikey': '복사한_ANON_KEY',
    'Authorization': 'Bearer 복사한_ANON_KEY'
  }
}).then(r => r.json()).then(console.log)
```

- [ ] 7개 카테고리 데이터 출력 확인
- [ ] ✅ 연결 성공!

## ✅ 설정 완료!

모든 체크박스가 체크되었다면 다음 단계로:
```bash
# 터미널에서 Claude에게 알려주세요
"Supabase 설정 완료! 다음 단계 진행해주세요"
```

## 🆘 문제 해결

### ❌ 프로젝트가 생성되지 않음
- 이메일 인증 완료 확인
- 브라우저 새로고침 (Cmd/Ctrl + R)

### ❌ SQL 실행 실패
```
ERROR: relation "categories" already exists
```
→ 이미 테이블이 생성됨. Table Editor에서 확인

### ❌ 401 Unauthorized
```
Invalid API key
```
→ `.env.local` 파일 확인:
  - API 키가 정확한지
  - 파일 저장했는지
  - 개발 서버 재시작 (Ctrl+C 후 `npm run dev`)

### ❌ CORS 에러
```
blocked by CORS policy
```
→ SUPABASE_URL이 `https://`로 시작하는지 확인

## 📊 최종 확인

설정이 완료되면:
- ✅ Supabase 프로젝트 생성됨
- ✅ 6개 테이블 + 7개 카테고리 데이터
- ✅ 2개 Storage 버킷
- ✅ 환경변수 설정됨
- ✅ 로컬 개발 서버 작동

**다음: 레이아웃 & 홈페이지 컴포넌트 개발 시작!** 🚀
