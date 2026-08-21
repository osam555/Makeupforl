import { getFirebaseApp } from './client'

/** 어드민 허용 계정 (쉼표로 여러 명 지정 가능) */
export const ADMIN_EMAILS = (
  process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? 'makeupforl77@gmail.com,john.wu571@gmail.com'
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export function isAdminEmail(email?: string | null): boolean {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase())
}

/** Google 계정으로 로그인 → 허용 목록에 없으면 즉시 로그아웃하고 오류 반환 */
export async function signInAdmin(): Promise<{ email: string }> {
  const app = getFirebaseApp()
  if (!app) throw new Error('Firebase 환경변수가 설정되지 않았습니다.')

  const { GoogleAuthProvider, getAuth, signInWithPopup, signOut } = await import('firebase/auth')
  const auth = getAuth(app)
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const cred = await signInWithPopup(auth, provider)
  const email = cred.user.email ?? ''
  if (!isAdminEmail(email)) {
    await signOut(auth)
    throw new Error(`${email} 계정은 관리자로 등록되어 있지 않습니다.`)
  }
  return { email }
}

export async function signOutAdmin(): Promise<void> {
  const app = getFirebaseApp()
  if (!app) return
  const { getAuth, signOut } = await import('firebase/auth')
  await signOut(getAuth(app))
}

/** 로그인 상태 구독. Firebase 미설정 시 즉시 null 통보 */
export async function watchAdmin(cb: (email: string | null) => void): Promise<() => void> {
  const app = getFirebaseApp()
  if (!app) {
    cb(null)
    return () => {}
  }
  const { getAuth, onAuthStateChanged } = await import('firebase/auth')
  return onAuthStateChanged(getAuth(app), (u) => {
    cb(u && isAdminEmail(u.email) ? u.email : null)
  })
}
