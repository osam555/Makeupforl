import { revalidatePath } from 'next/cache'
import { NextResponse } from 'next/server'

import { adminConfigured, getAdminDb, takeAuthError, verifyAdmin } from '@/lib/firebase/admin'
import { canAutoApply } from '@/lib/proposals'
import {
  ackProposal,
  addNote,
  createProposal,
  decideProposal,
  listProposals,
  markDeployed,
} from '@/lib/proposals.server'
import { isOwner } from '@/lib/roles'

export const runtime = 'nodejs'

const NOT_CONFIGURED =
  'FIREBASE_SERVICE_ACCOUNT 환경변수가 없어 결재함을 쓸 수 없습니다. ' +
  '결재는 시드 폴백이 없습니다 — Firestore 가 있어야 제안이 어디에도 사라지지 않고 남습니다.'

/**
 * 결재함 API.
 *
 * 읽기까지 POST 인 것은 idToken 을 본문으로 받기 때문이다. 이 저장소의 다른
 * 어드민 라우트와 같은 모양을 지킨다 — 토큰을 주소줄에 실으면 브라우저 기록과
 * 서버 로그에 그대로 남는다.
 *
 * 권한이 두 겹이다. verifyAdmin 이 "관리자인가" 를 보고, isOwner 가 "결재권자인가"
 * 를 본다. 화면에서 단추를 감추는 것과 별개로 여기서 반드시 다시 본다 —
 * 매니저가 직접 이 주소로 결재를 찔러 넣을 수 있으면 결재는 없는 것과 같다.
 *
 * POST { idToken, action: 'list' | 'create' | 'note' | 'decide' | 'ack' | 'deployed', ... }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))

  let editor: string | null = null
  try {
    editor = await verifyAdmin({ idToken: body?.idToken })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: `인증 처리 중 오류 — ${e instanceof Error ? e.message : String(e)}` },
      { status: 500 },
    )
  }

  if (!editor) {
    const why = takeAuthError()
    return NextResponse.json(
      { ok: false, error: why ? `구글 로그인 확인 실패 — ${why}` : '관리자 계정이 아닙니다.' },
      { status: 401 },
    )
  }

  if (!(await getAdminDb())) {
    return NextResponse.json(
      { ok: false, error: adminConfigured ? '서비스 계정 키를 읽을 수 없습니다.' : NOT_CONFIGURED },
      { status: 503 },
    )
  }

  const owner = isOwner(editor)

  try {
    if (body?.action === 'list') {
      const items = await listProposals()
      return NextResponse.json({ ok: true, items, editor, owner })
    }

    if (body?.action === 'create') {
      const p = await createProposal(body?.draft, editor)
      return NextResponse.json({ ok: true, item: p, editor, owner })
    }

    /*
      의견은 원장·매니저 둘 다 남긴다. 결재와 달리 권한을 가르지 않는 이유는,
      한쪽만 말할 수 있으면 그건 대화가 아니라 지시이기 때문이다. 상태는 그대로다.
    */
    if (body?.action === 'note') {
      const note = await addNote(body?.id, body?.text, editor)
      return NextResponse.json({ ok: true, note, editor, owner })
    }

    /* 결재 결과를 읽었다는 표시. 올린 사람이 누른다 */
    if (body?.action === 'ack') {
      await ackProposal(body?.id, editor)
      return NextResponse.json({ ok: true, editor, owner })
    }

    /* 'code' 제안을 배포하고 나서 누른다 — 승인만으로는 사이트가 안 바뀐다 */
    if (body?.action === 'deployed') {
      await markDeployed(body?.id, editor)
      return NextResponse.json({ ok: true, editor, owner })
    }

    if (body?.action === 'decide') {
      if (!owner) {
        return NextResponse.json(
          { ok: false, error: '결재는 원장님 계정으로만 할 수 있습니다.' },
          { status: 403 },
        )
      }
      const decision = body?.decision
      if (decision !== 'approved' && decision !== 'rejected') {
        return NextResponse.json({ ok: false, error: '승인 또는 반려만 됩니다.' }, { status: 400 })
      }

      const p = await decideProposal(body?.id, decision, editor, body?.comment)

      /*
        반영됐을 때만 캐시를 뚫는다. 반려나 'code' 제안에서 재검증을 돌리면
        바뀐 것도 없이 공개 페이지가 다시 만들어진다.
      */
      if (p.applied && canAutoApply(p.kind)) {
        revalidatePath('/honjoo100', 'layout')
        revalidatePath('/honjoo100/[slug]', 'page')
        revalidatePath('/[topic]', 'page')
        revalidatePath('/')
      }
      return NextResponse.json({ ok: true, item: p, editor, owner })
    }

    return NextResponse.json({ ok: false, error: '알 수 없는 요청입니다.' }, { status: 400 })
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    )
  }
}
