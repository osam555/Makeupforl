# 🚀 Vercel 배포 가이드

## 빠른 배포 (5분)

### 1단계: Vercel 계정 생성

1. https://vercel.com 접속
2. **Sign Up** 클릭
3. **Continue with GitHub** 선택 (가장 쉬움)
4. GitHub 계정으로 로그인

### 2단계: 프로젝트 Import

1. Vercel 대시보드에서 **Add New** → **Project** 클릭
2. **Import Git Repository** 섹션에서 `Makeupforl` 저장소 찾기
3. **Import** 클릭

### 3단계: 프로젝트 설정

**Framework Preset:** Next.js (자동 감지됨)

**Root Directory:** `makeupforl-app` 입력 ⚠️ 중요!

**Build and Output Settings:** (기본값 사용)
- Build Command: `next build`
- Output Directory: `.next`
- Install Command: `npm install`

**Environment Variables:** (Supabase 설정 후 추가)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4단계: 배포

1. **Deploy** 클릭
2. ⏳ 약 2-3분 대기 (빌드 중...)
3. ✅ 배포 완료!
4. Vercel이 자동으로 URL 생성: `https://makeupforl-xxx.vercel.app`

---

## 환경변수 추가 (Supabase 설정 후)

### Vercel 대시보드에서:

1. 프로젝트 선택
2. **Settings** → **Environment Variables** 클릭
3. 다음 변수 추가:

```bash
# Production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Preview (선택사항)
# Development (선택사항)
```

4. **Save** 클릭
5. 프로젝트 재배포:
   - **Deployments** 탭
   - 최신 배포 찾기
   - **... 메뉴** → **Redeploy**

---

## 커스텀 도메인 연결 (선택사항)

### 도메인이 있는 경우:

1. Vercel 프로젝트 → **Settings** → **Domains**
2. 도메인 입력 (예: makeupforl.co.kr)
3. **Add** 클릭
4. DNS 설정 안내 따라하기:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

5. ⏳ DNS 전파 대기 (10분~24시간)
6. ✅ 도메인 연결 완료!

---

## 자동 배포 설정

✅ **이미 설정됨!**

GitHub의 `main` 브랜치에 push하면:
- Vercel이 자동으로 감지
- 자동으로 빌드
- 자동으로 배포

```bash
git add .
git commit -m "Update homepage"
git push

# 30초 후 자동 배포 완료! 🎉
```

---

## 배포 상태 확인

### Vercel 대시보드:
- **Deployments** 탭에서 모든 배포 기록 확인
- 빌드 로그 확인
- 배포 URL 확인

### GitHub:
- Commit 옆에 ✅ 또는 ❌ 표시
- 클릭하면 Vercel 배포 상태로 이동

---

## 문제 해결

### ❌ Build Failed
```
Error: Cannot find module 'next'
```
**해결:** Root Directory가 `makeupforl-app`으로 설정되었는지 확인

### ❌ 환경변수 오류
```
Error: Missing NEXT_PUBLIC_SUPABASE_URL
```
**해결:**
1. Settings → Environment Variables 확인
2. 변수 추가 후 재배포

### ❌ 404 Not Found (페이지)
**해결:**
- Vercel에서 Next.js 프레임워크 감지 확인
- Framework Preset: Next.js로 설정

---

## 성능 최적화

Vercel이 자동으로 처리:
- ✅ 글로벌 CDN
- ✅ 자동 HTTPS
- ✅ 이미지 최적화
- ✅ Edge Functions
- ✅ Serverless Functions

---

## Analytics (선택사항)

### Vercel Analytics 활성화:

1. 프로젝트 → **Analytics** 탭
2. **Enable** 클릭
3. 무료 플랜: 2,500 페이지뷰/월

트래픽, 성능, Core Web Vitals 확인 가능!

---

## 비용

**Hobby (무료 플랜):**
- 무제한 배포
- 100GB 대역폭/월
- 충분한 빌드 시간
- 자동 HTTPS

**Pro ($20/월):**
- 1TB 대역폭
- Analytics Pro
- 팀 협업
- 우선 지원

**일반적으로 무료 플랜으로 충분합니다!**

---

## 다음 단계

배포 완료 후:
1. ✅ 배포된 URL 방문
2. ✅ 모든 페이지 작동 확인
3. ✅ 모바일에서 테스트
4. ✅ Supabase 연동 (환경변수 추가)
5. ✅ 커스텀 도메인 연결 (선택)

🎉 완료!
