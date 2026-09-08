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

/*
  ── 100문100답 전체 열람 ─────────────────────────────────────────
  위쪽 관리자용과 달리 여기서는 로그인 자체를 막지 않는다. 누가 값을 냈는지는
  서버가 명단으로 판단할 일이고, 화면에서 미리 잘라 내면 "왜 안 되는지"를
  말해 줄 기회조차 없어진다. 로그인은 시켜 주고, 권한은 서버가 답한다.
*/

/** 구글 계정으로 로그인 (허용 목록 검사 없음) */
export async function signInUser(): Promise<{ email: string; idToken: string }> {
  const app = getFirebaseApp()
  if (!app) throw new Error('로그인을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.')

  const { GoogleAuthProvider, getAuth, signInWithPopup } = await import('firebase/auth')
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })

  const cred = await signInWithPopup(getAuth(app), provider)
  return { email: cred.user.email ?? '', idToken: await cred.user.getIdToken() }
}

export async function signOutUser(): Promise<void> {
  const app = getFirebaseApp()
  if (!app) return
  const { getAuth, signOut } = await import('firebase/auth')
  await signOut(getAuth(app))
}

/** 로그인 상태 구독 — 이미 로그인해 둔 사람은 버튼을 누르지 않아도 열려야 한다 */
export async function watchUser(
  cb: (v: { email: string; idToken: string } | null) => void,
): Promise<() => void> {
  const app = getFirebaseApp()
  if (!app) {
    cb(null)
    return () => {}
  }
  const { getAuth, onAuthStateChanged } = await import('firebase/auth')
  return onAuthStateChanged(getAuth(app), (u) => {
    if (!u) return cb(null)
    void u.getIdToken().then((idToken) => cb({ email: u.email ?? '', idToken }))
  })
}
