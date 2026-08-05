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
