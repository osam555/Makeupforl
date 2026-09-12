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

/*
  ── 이메일 링크 로그인 ─────────────────────────────────────────
  구글 계정만 받으면 네이버 메일을 쓰는 손님(대부분 50~60대)이 못 들어온다.
  비밀번호를 만들게 하지 않는다 — 한 번 볼 3개월짜리 이용권에 비밀번호는 잊히기만 한다.
  이메일로 온 링크를 누르면 그 자리에서 로그인되고, 서버는 그 이메일이 명단에 있는지만 본다.

  링크를 다른 브라우저(메일 앱 안의 브라우저)에서 열면 처음 적은 이메일을 모르므로
  다시 묻는다. 그래서 보낼 때 이메일을 localStorage 에 남긴다.
*/
const EMAIL_KEY = 'mfl:signin-email'

export async function sendEmailLink(email: string, url: string): Promise<void> {
  const app = getFirebaseApp()
  if (!app) throw new Error('로그인을 준비하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  const { getAuth, sendSignInLinkToEmail } = await import('firebase/auth')
  await sendSignInLinkToEmail(getAuth(app), email, { url, handleCodeInApp: true })
  try {
    localStorage.setItem(EMAIL_KEY, email)
  } catch {
    /* 저장이 막혀 있으면 링크를 열 때 이메일을 다시 묻는다 */
  }
}

/** 주소창에 로그인 링크가 들어 있으면 마무리한다. 아니면 null */
export async function completeEmailLink(): Promise<{ email: string } | null> {
  const app = getFirebaseApp()
  if (!app || typeof window === 'undefined') return null
  const { getAuth, isSignInWithEmailLink, signInWithEmailLink } = await import('firebase/auth')
  const auth = getAuth(app)
  const href = window.location.href
  if (!isSignInWithEmailLink(auth, href)) return null

  let email = ''
  try {
    email = localStorage.getItem(EMAIL_KEY) ?? ''
  } catch {
    /* 아래에서 묻는다 */
  }
  if (!email) email = window.prompt('로그인 링크를 받으신 이메일 주소를 적어 주세요.') ?? ''
  if (!email) return null

  const cred = await signInWithEmailLink(auth, email.trim().toLowerCase(), href)
  try {
    localStorage.removeItem(EMAIL_KEY)
  } catch {
    /* 무시 */
  }
  // 주소창의 일회용 코드는 지운다 — 새로고침하면 "이미 쓴 링크" 오류가 뜬다
  const clean = new URL(href)
  for (const k of ['apiKey', 'oobCode', 'mode', 'lang', 'continueUrl']) clean.searchParams.delete(k)
  window.history.replaceState(null, '', clean.toString())
  return { email: cred.user.email ?? email }
}
