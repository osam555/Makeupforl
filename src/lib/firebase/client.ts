import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'

/**
 * Firebase 초기화 (클라이언트/서버 공용 — 웹 모듈러 SDK는 Node에서도 동작)
 * 환경변수가 없으면 null 을 반환해 호출부가 시드 JSON 폴백을 쓰게 한다.
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

export const firebaseConfigured = !!config.apiKey && !!config.projectId

let app: FirebaseApp | null = null

export function getFirebaseApp(): FirebaseApp | null {
  if (!firebaseConfigured) return null
  if (!app) {
    app = getApps()[0] ?? initializeApp(config)
  }
  return app
}

export function getDb(): Firestore | null {
  const a = getFirebaseApp()
  return a ? getFirestore(a) : null
}

/** 100문100답 사진 업로드 — hero/thumb 을 같은 이름으로 올린다 */
export async function uploadWed100Photo(
  kind: 'hero' | 'thumb',
  name: string,
  blob: Blob,
): Promise<string> {
  const app = getFirebaseApp()
  if (!app) throw new Error('Firebase 환경변수가 설정되지 않았습니다.')
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage')
  const r = ref(getStorage(app), `wed100/photo/${kind}/${name}.webp`)
  await uploadBytes(r, blob, { contentType: 'image/webp', cacheControl: 'public,max-age=31536000' })
  return getDownloadURL(r)
}

/** Firebase Storage (오디오 업로드용) */
export async function uploadAudio(slug: string, blob: Blob): Promise<string> {
  const app = getFirebaseApp()
  if (!app) throw new Error('Firebase 환경변수가 설정되지 않았습니다.')
  const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage')
  const r = ref(getStorage(app), `wed100/audio/${slug}.mp3`)
  await uploadBytes(r, blob, { contentType: 'audio/mpeg', cacheControl: 'public,max-age=31536000' })
  return getDownloadURL(r)
}
