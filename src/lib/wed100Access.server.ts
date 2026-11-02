import {
  DEFAULT_ACCESS,
  WED100_CONFIG_DOC,
  normalizeMembers,
  type Wed100Access,
} from '@/lib/wed100Access'
import { MEMBERS_COLLECTION, mergeMembers } from '@/lib/wed100Members'

/**
 * 100문100답 공개 범위 읽기 (서버 전용).
 *
 * firebase-admin 을 끌어오므로 이 파일을 클라이언트 컴포넌트에서 import 하면
 * 브라우저 번들에 서버 SDK 가 통째로 딸려 들어가 빌드가 깨진다.
 * 화면 쪽에서 필요한 순수 함수는 wed100Access.ts 에 있다.
 *
 * 유료 전환은 되돌릴 여지를 두고 켜고 끌 수 있어야 해서 Firestore 에 둔다.
 * 설정을 읽지 못하면 잠그지 않는다 — 장애 때 멀쩡한 문항까지 막히는 쪽이
 * 잠깐 더 열려 있는 쪽보다 손해가 크다.
 */
export async function getWed100Access(): Promise<Wed100Access> {
  try {
    const { getAdminDb } = await import('@/lib/firebase/admin')
    const adb = await getAdminDb()
    if (adb) {
      const snap = await adb.collection(WED100_CONFIG_DOC.collection).doc(WED100_CONFIG_DOC.doc).get()
      /*
        회원은 두 곳에 있다: 옛 공개 명단(site_config.members)과 어드민 등록 명단
        (wed100_members, 이름·전화 포함이라 관리자만 읽음). 둘을 합쳐서 본다.
      */
      const recs = await adb
        .collection(MEMBERS_COLLECTION)
        .get()
        .then((q) => normalizeMembers(q.docs.map((x) => x.data())))
        .catch(() => [])
      if (!snap.exists && recs.length) return { ...DEFAULT_ACCESS, members: recs }
      if (snap.exists) {
        const d = snap.data() as Partial<Wed100Access>
        return {
          paywall: d.paywall === true,
          freeQna: Array.isArray(d.freeQna) ? d.freeQna.map(String) : [],
          storeUrl: typeof d.storeUrl === 'string' ? d.storeUrl : '',
          notice: typeof d.notice === 'string' ? d.notice : '',
          members: mergeMembers(normalizeMembers(d.members), recs),
        }
      }
    }
  } catch {
    /* 설정을 못 읽어도 문항은 떠야 한다 */
  }
  return DEFAULT_ACCESS
}

