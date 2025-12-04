# 🗄️ Supabase 설정 가이드

MakeupForL 프로젝트의 Supabase 데이터베이스 설정 가이드입니다.

## 1단계: Supabase 프로젝트 생성

1. **Supabase 접속**
   - https://app.supabase.com/ 접속
   - GitHub 계정으로 로그인

2. **새 프로젝트 생성**
   - "New Project" 클릭
   - Project name: `makeupforl`
   - Database Password: 안전한 비밀번호 생성 (저장 필수!)
   - Region: `Northeast Asia (Seoul)` 선택
   - "Create new project" 클릭

## 2단계: 데이터베이스 스키마 생성

1. **SQL Editor 접속**
   - 좌측 메뉴에서 "SQL Editor" 클릭
   - "New query" 클릭

2. **스키마 실행**
   - `supabase/schema.sql` 파일 내용 전체 복사
   - SQL Editor에 붙여넣기
   - "Run" 버튼 클릭 (또는 Cmd/Ctrl + Enter)
   - 성공 메시지 확인: "Success. No rows returned"

3. **테이블 확인**
   - 좌측 메뉴에서 "Table Editor" 클릭
   - 다음 테이블들이 생성되었는지 확인:
     - categories (7개 카테고리 초기 데이터 포함)
     - galleries
     - images
     - reviews
     - bookings
     - pages

## 3단계: API 키 가져오기

1. **Settings > API 접속**
   - 좌측 메뉴에서 "Settings" 클릭
   - "API" 탭 클릭

2. **환경변수 복사**
   - Project URL 복사
   - `anon` `public` 키 복사

3. **`.env.local` 파일 업데이트**
   ```bash
   # /Users/osam/dev/Makeupforl/makeupforl-app/.env.local
   NEXT_PUBLIC_SUPABASE_URL=your_project_url_here
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## 4단계: 스토리지 버킷 생성 (이미지 업로드용)

1. **Storage 접속**
   - 좌측 메뉴에서 "Storage" 클릭
   - "Create a new bucket" 클릭

2. **갤러리 이미지 버킷**
   - Name: `gallery-images`
   - Public bucket: ✅ 체크 (공개 접근 허용)
   - "Create bucket" 클릭

3. **후기 이미지 버킷**
   - Name: `review-images`
   - Public bucket: ✅ 체크
   - "Create bucket" 클릭

4. **버킷 정책 설정**
   - 각 버킷 클릭 → "Policies" 탭
   - "New Policy" → "For full customization" 선택
   - 다음 정책 추가:

   ```sql
   -- 모든 사용자 읽기 허용
   CREATE POLICY "Public Access"
   ON storage.objects FOR SELECT
   USING ( bucket_id = 'gallery-images' );

   -- 인증된 사용자 업로드 허용
   CREATE POLICY "Authenticated users can upload"
   ON storage.objects FOR INSERT
   WITH CHECK (
     bucket_id = 'gallery-images'
     AND auth.role() = 'authenticated'
   );
   ```

## 5단계: 로컬 개발 서버 실행

```bash
cd /Users/osam/dev/Makeupforl/makeupforl-app
npm run dev
```

브라우저에서 http://localhost:3000 접속

## 6단계: 데이터베이스 연결 테스트

개발자 도구 콘솔에서 에러가 없는지 확인:
- ✅ Supabase 연결 성공
- ❌ 401 Unauthorized → API 키 확인
- ❌ CORS 에러 → URL 확인

## 📊 초기 데이터 확인

Supabase Table Editor에서:
- `categories` 테이블: 7개 카테고리 확인
  1. 혼주
  2. 가족 및 하객
  3. 웨딩
  4. 남자 메이크업
  5. 기업행사&영상메이크업
  6. 화보 & 프로필
  7. 패션쇼

## 🔐 보안 설정

### Row Level Security (RLS) 정책

스키마에 이미 포함된 정책:

1. **Public Read (공개 읽기)**
   - categories, galleries, images, pages: 모든 사용자 읽기 가능
   - reviews: published = true인 것만 읽기 가능

2. **Public Write (공개 쓰기)**
   - bookings: 모든 사용자 예약 생성 가능

3. **Authenticated Only (인증 필요)**
   - bookings 읽기: 인증된 관리자만 가능
   - 모든 테이블 수정/삭제: 인증된 사용자만 가능

## 🆘 문제 해결

### 연결 오류
```
Error: Invalid API key
```
**해결**: `.env.local`의 API 키가 정확한지 확인

### CORS 에러
```
Access to fetch blocked by CORS policy
```
**해결**: Supabase URL이 정확한지 확인 (https:// 포함)

### 테이블이 안 보임
```
relation "categories" does not exist
```
**해결**: schema.sql을 SQL Editor에서 다시 실행

### RLS 정책 에러
```
Row level security policy violation
```
**해결**:
1. Table Editor에서 해당 테이블 선택
2. "RLS disabled" 확인 → "Enable RLS" 클릭
3. schema.sql의 정책 부분 다시 실행

## 📚 다음 단계

✅ Supabase 설정 완료 후:
1. 홈페이지 컴포넌트 개발
2. 갤러리 시스템 구축
3. 예약 폼 구현
4. 관리자 대시보드 개발

## 🔗 유용한 링크

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js + Supabase 가이드](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Row Level Security 가이드](https://supabase.com/docs/guides/auth/row-level-security)
