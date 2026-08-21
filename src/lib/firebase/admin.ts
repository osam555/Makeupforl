import type { App } from 'firebase-admin/app'
import type { Firestore } from 'firebase-admin/firestore'

/**
 * 서버 전용 Firebase Admin SDK.
 * 서비스 계정 키(FIREBASE_SERVICE_ACCOUNT)가 설정돼 있어야 하며,
 * 보안 규칙을 우회해 서버가 직접 Firestore에 쓸 수 있다.
 * → 비밀번호(8888) 로그인으로도 저장이 가능해진다.
 *
 * 값 형식: 서비스 계정 JSON 전체 문자열, 또는 그것을 base64로 인코딩한 문자열
 */
let cached: App | null = null

function parseServiceAccount(): Record<string, string> | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) return null
  const text = raw.trim().startsWith('{')
    ? raw
    : Buffer.from(raw, 'base64').toString('utf8')
  try {
    const json = JSON.parse(text)
    // Vercel 환경변수에 붙여넣으면 개행이 \\n 으로 들어오는 경우가 많다
    if (typeof json.private_key === 'string') {
      json.private_key = json.private_key.replace(/\\n/g, '\n')
    }
    return json
  } catch {
    return null
  }
}

export const adminConfigured = !!process.env.FIREBASE_SERVICE_ACCOUNT

export async function getAdminApp(): Promise<App | null> {
  if (cached) return cached
  const sa = parseServiceAccount()
  if (!sa) return null
  const { cert, getApps, initializeApp } = await import('firebase-admin/app')
  cached =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: sa.project_id,
        clientEmail: sa.client_email,
        privateKey: sa.private_key,
      }),
    })
  return cached
}

export async function getAdminDb(): Promise<Firestore | null> {
  const app = await getAdminApp()
  if (!app) return null
  const { getFirestore } = await import('firebase-admin/firestore')
  return getFirestore(app)
}

const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'makeupforl77@gmail.com,john.wu571@gmail.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export interface AuthPayload {
  password?: string
  idToken?: string
}

/**
 * 두 가지 인증을 모두 받아준다.
 *  - password : 기존 8888 방식 (서버 환경변수 WED100_ADMIN_PASSWORD 와 비교)
 *  - idToken  : 관리자 구글 로그인 토큰
 * 반환값은 로그(수정 이력)에 남길 편집자 표시.
 */
export async function verifyAdmin(auth: AuthPayload): Promise<string | null> {
  const expected = process.env.WED100_ADMIN_PASSWORD ?? '8888'
  if (auth.password && auth.password === expected) return '비밀번호 로그인'

  if (auth.idToken) {
    // 앱 초기화와 모듈 로딩까지 전부 감싼다.
    // 예전에는 getAdminApp() 과 import 가 try 밖에 있어서, 여기서 터지면
    // 라우트가 본문 없이 500 으로 죽고 화면에는
    // 'Unexpected end of JSON input' 만 보였다.
    try {
      const app = await getAdminApp()
      if (!app) return null
      const { getAuth } = await import('firebase-admin/auth')
      const decoded = await getAuth(app).verifyIdToken(auth.idToken)
      const email = (decoded.email ?? '').toLowerCase()
      if (ADMIN_EMAILS.includes(email)) return email
      return null
    } catch (e) {
      lastAuthError = e instanceof Error ? e.message : String(e)
      return null
    }
  }
  return null
}

/** 마지막 구글 로그인 검증 실패 사유 — 호출부가 화면에 보여 줄 수 있게 */
let lastAuthError = ''
export function takeAuthError(): string {
  const v = lastAuthError
  lastAuthError = ''
  return v
}
