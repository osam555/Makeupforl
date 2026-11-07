'use client'

import AdminGate from '@/components/admin/AdminGate'
import AdminView, { getIdToken } from '@/components/admin/AdminView'
import Proposals from '@/components/admin/Proposals'
import { isOwner } from '@/lib/roles'

/**
 * 인증 껍데기.
 *
 * 역할(원장/매니저)을 여기서 정해 화면에 넘긴다. 화면이 역할을 아는 것은
 * 무엇을 보여 줄지 정하기 위해서지 권한을 지키기 위해서가 아니다 — 결재 권한은
 * /api/proposals 가 idToken 을 다시 풀어 확인한다. 여기서 owner 를 참으로
 * 바꿔치기해도 서버는 403 을 준다.
 *
 * 문항 목록(답변 전문 = 유료 본문)은 로그인을 확인한 뒤에 받는다. 서버 페이지가
 * props 로 넘기던 때는 로그인 없이 HTML 만 받아도 103개 답이 통째로 읽혔다.
 */
export default function ProposalsGate() {
  return (
    <AdminGate title="결재">
      {(ctx) => (
        <AdminView view="proposals">
          {({ questions }) => (
            <Proposals
              owner={isOwner(ctx.email)}
              me={ctx.email ?? ''}
              questions={questions}
              auth={async () => ({ idToken: await getIdToken() })}
            />
          )}
        </AdminView>
      )}
    </AdminGate>
  )
}
