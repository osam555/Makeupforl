'use client'

import AdminGate from '@/components/admin/AdminGate'
import Proposals, { type QuestionRef } from '@/components/admin/Proposals'
import { isOwner } from '@/lib/roles'

/**
 * 인증 껍데기.
 *
 * 역할(원장/매니저)을 여기서 정해 화면에 넘긴다. 화면이 역할을 아는 것은
 * 무엇을 보여 줄지 정하기 위해서지 권한을 지키기 위해서가 아니다 — 결재 권한은
 * /api/proposals 가 idToken 을 다시 풀어 확인한다. 여기서 owner 를 참으로
 * 바꿔치기해도 서버는 403 을 준다.
 */
export default function ProposalsGate({ questions }: { questions: QuestionRef[] }) {
  return (
    <AdminGate title="결재">
      {(ctx) => (
        <Proposals
          owner={isOwner(ctx.email)}
          me={ctx.email ?? ''}
          questions={questions}
          auth={async () => ({ idToken: await getIdToken() })}
        />
      )}
    </AdminGate>
  )
}

async function getIdToken(): Promise<string> {
  const { getFirebaseApp } = await import('@/lib/firebase/client')
  const app = getFirebaseApp()
  if (!app) return ''
  const { getAuth } = await import('firebase/auth')
  return (await getAuth(app).currentUser?.getIdToken()) ?? ''
}
