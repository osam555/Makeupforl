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
    try {
      const email = await emailFromIdToken(auth.idToken)
      if (email && ADMIN_EMAILS.includes(email)) return email
      if (email) lastAuthError = `${email} 은 관리자 목록에 없습니다.`
      return null
    } catch (e) {
      lastAuthError = e instanceof Error ? e.message : String(e)
      return null
    }
  }
  return null
}

/**
 * 구글 로그인 토큰에서 이메일을 꺼낸다 — Identity Toolkit REST 로 검증한다.
 *
 * firebase-admin/auth 를 쓰지 않는 이유:
 * 이 모듈이 ESM 전용인 jose 를 끌어오는데, 서버 번들에서는 require() 로 불려
 * ERR_REQUIRE_ESM 으로 통째로 터진다. 그러면 저장 API 가 본문 없는 500 을 뱉고
 * 화면에서는 원인을 알 수 없다. accounts:lookup 은 같은 검증을 해 주면서
 * 의존성이 전혀 없다 — 웹 API 키에 묶여 있어 다른 프로젝트 토큰은 통과하지 못한다.
 */
async function emailFromIdToken(idToken: string): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
  if (!key) {
    lastAuthError = 'NEXT_PUBLIC_FIREBASE_API_KEY 가 없어 구글 로그인을 확인할 수 없습니다.'
    return null
  }
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${key}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ idToken }),
    cache: 'no-store',
  })
  const body = (await res.json().catch(() => null)) as {
    users?: { email?: string; emailVerified?: boolean }[]
    error?: { message?: string }
  } | null
  if (!res.ok) {
    lastAuthError = body?.error?.message ?? `토큰 확인 실패 (HTTP ${res.status})`
    return null
  }
  const user = body?.users?.[0]
  if (!user?.email) {
    lastAuthError = '토큰에서 이메일을 찾지 못했습니다.'
    return null
  }
  if (user.emailVerified !== true) {
    lastAuthError = '이메일이 확인되지 않은 계정입니다.'
    return null
  }
  return user.email.toLowerCase()
}

/** 마지막 구글 로그인 검증 실패 사유 — 호출부가 화면에 보여 줄 수 있게 */
let lastAuthError = ''
export function takeAuthError(): string {
  const v = lastAuthError
  lastAuthError = ''
  return v
}
