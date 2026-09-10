/**
 * 누가 제안하고 누가 결재하는가.
 *
 * 지금까지 관리자는 평평했다. makeupforl77(원장)과 john.wu571(사이트 매니저)이
 * 똑같은 권한으로 무엇이든 바로 고칠 수 있었다. 그래서 "매니저가 안을 올리고
 * 원장이 정한다" 는 실제 일하는 방식이 시스템에 없었고, 콘텐츠를 바꾸려면
 * 카톡으로 물어보고 구두로 승낙받은 뒤 손으로 고치는 수밖에 없었다.
 *
 * 여기서 하는 일은 딱 하나 — 이미 관리자인 사람들을 둘로 가른다.
 * 문을 여는 것은 여전히 ADMIN_EMAILS(firebase/auth.ts, firebase/admin.ts)다.
 * 이 파일은 문 안에서의 역할만 정한다. 그래서 Firestore·Storage 보안 규칙은
 * 건드릴 필요가 없다 — 결재 관련 쓰기는 전부 Admin SDK 라우트를 지난다.
 *
 * 클라이언트에서도 봐야 해서(화면을 역할별로 다르게 그린다) NEXT_PUBLIC_ 이다.
 * 이 값이 새어 나가도 손해가 없다 — 권한은 서버가 idToken 으로 다시 확인한다.
 * 화면에서 단추를 감추는 것은 편의이지 보안이 아니다.
 */

export type Role = 'owner' | 'manager'

/** 결재권자. 목록에 없는 관리자는 전부 매니저(제안만 가능) */
export const OWNER_EMAILS = (process.env.NEXT_PUBLIC_OWNER_EMAILS ?? 'makeupforl77@gmail.com')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)

export function isOwner(email: string | null | undefined): boolean {
  return !!email && OWNER_EMAILS.includes(email.toLowerCase())
}

/**
 * 역할.
 *
 * 관리자인지 아닌지는 여기서 판단하지 않는다 — 이 함수를 부르기 전에 이미
 * 관리자임이 확인됐다는 전제다. 관리자가 아닌 사람에게 'manager' 를 돌려주는
 * 실수를 막으려고, 이메일이 없으면 null 을 준다.
 */
export function roleOf(email: string | null | undefined): Role | null {
  if (!email) return null
  return isOwner(email) ? 'owner' : 'manager'
}

export const ROLE_LABEL: Record<Role, string> = {
  owner: '원장',
  manager: '사이트 매니저',
}
