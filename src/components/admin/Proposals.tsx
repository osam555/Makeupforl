'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Check,
  ExternalLink,
  FileText,
  Inbox,
  MessageSquare,
  Plus,
  Rocket,
  Wand2,
  X,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Empty, Note, SectionTitle } from '@/components/admin/AdminUI'
import {
  KIND_LABEL,
  TYPE_LABEL,
  appliedMatches,
  canAutoApply,
  inboxOf,
  pendingOf,
  statusLabel,
  typeOf,
  viewHref,
  validateDraft,
  type Proposal,
  type ProposalDraft,
  type ProposalNote,
  type ProposalKind,
  type ItemType,
} from '@/lib/proposals'

export interface QuestionRef {
  slug: string
  question: string
  answer: string
}

type Auth = () => Promise<{ idToken: string } | { password: string | null }>

/**
 * 결재 화면.
 *
 * 한 화면에 두 사람이 들어온다. 원장님은 "정하러" 오고 매니저는 "올리러" 온다.
 * 화면을 둘로 나누지 않고 역할에 따라 순서를 바꾼다 — 원장님에게는 결재할 것이
 * 맨 위에, 매니저에게는 새 제안 쓰기가 맨 위에 온다. 각자 온 이유가 첫 화면에 있다.
 *
 * 원장님은 컴퓨터를 잘 아시는 분이 아니다. 그래서 결재 카드에서는
 *  - 글자를 크게 두고 (설정의 글자 크기와 별개로 이 화면은 기본이 크다)
 *  - 고를 것을 [승인] [반려] 둘로만 두고
 *  - '무엇이 어떻게 바뀌는지' 를 전/후 두 줄로만 보인다.
 * 용어(slug, Firestore, 배포)는 카드 겉면에 쓰지 않는다.
 */
export default function Proposals({
  owner,
  me,
  questions,
  auth,
}: {
  owner: boolean
  me: string
  questions: QuestionRef[]
  auth: Auth
}) {
  const [items, setItems] = useState<Proposal[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const call = useCallback(
    async (payload: Record<string, unknown>) => {
      const a = await auth()
      const res = await fetch('/api/proposals', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ...a, ...payload }),
      })
      const json = await res.json().catch(() => ({ ok: false, error: '응답을 읽을 수 없습니다.' }))
      if (!json.ok) throw new Error(json.error ?? '알 수 없는 오류')
      return json
    },
    [auth],
  )

  const load = useCallback(async () => {
    setError(null)
    try {
      const json = await call({ action: 'list' })
      setItems(json.items as Proposal[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setItems([])
    }
  }, [call])

  useEffect(() => {
    void load()
  }, [load])

  const role: 'owner' | 'manager' = owner ? 'owner' : 'manager'

  /** [제안으로 만들기] 를 누른 요청 — 새 제안 폼을 이걸로 채워 연다 */
  const [seed, setSeed] = useState<Proposal | null>(null)

  const inbox = useMemo(() => (items ? inboxOf(items, role) : []), [items, role])
  const pending = useMemo(() => (items ? pendingOf(items) : []), [items])
  const done = useMemo(() => (items ? items.filter((p) => p.status !== 'pending') : []), [items])
  const mineWaiting = useMemo(
    () => (items ? items.filter((p) => typeOf(p) === 'request' && p.status === 'pending' && p.toRole !== role) : []),
    [items, role],
  )

  async function decide(id: string, decision: 'approved' | 'rejected', comment: string) {
    setBusy(true)
    setError(null)
    try {
      await call({ action: 'decide', id, decision, comment })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function note(id: string, text: string) {
    setBusy(true)
    setError(null)
    try {
      await call({ action: 'note', id, text })
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  async function simple(action: 'ack' | 'deployed', id: string) {
    setBusy(true)
    setError(null)
    try {
      await call({ action, id })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function closeReq(id: string, done: boolean) {
    setBusy(true)
    setError(null)
    try {
      await call({ action: 'closeRequest', id, done })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  async function create(draft: ProposalDraft) {
    setBusy(true)
    setError(null)
    try {
      await call({ action: 'create', draft })
      await load()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  const decisions = (
    <section className="flex flex-col gap-3">
      <SectionTitle>
        {owner ? '결재해 주세요' : '결재를 기다리는 제안'}
        {pending.length > 0 && (
          <span className="ml-2 rounded-full bg-[var(--a-a63d5a)] px-2 py-0.5 text-xs font-bold text-white">
            {pending.length}
          </span>
        )}
      </SectionTitle>

      {items === null && <Note>불러오는 중…</Note>}
      {items !== null && pending.length === 0 && (
        <Empty>결재를 기다리는 제안이 없습니다.</Empty>
      )}
      {pending.map((p) => (
        <Card key={p.id} p={p} owner={owner} me={me} busy={busy} onDecide={decide}
          onNote={note}
          onSimple={simple}
          onClose={closeReq}
          onSeed={setSeed}
          role={role}
        />
      ))}
    </section>
  )

  const requests = (
    <section className="flex flex-col gap-3">
      <SectionTitle>
        <Inbox className="mr-1.5 inline h-4 w-4" />
        나에게 온 요청
        {inbox.length > 0 && (
          <span className="ml-2 rounded-full bg-[var(--a-a63d5a)] px-2 py-0.5 text-xs font-bold text-white">
            {inbox.length}
          </span>
        )}
      </SectionTitle>
      {items !== null && inbox.length === 0 && <Empty>받은 요청이 없습니다.</Empty>}
      {inbox.map((p) => (
        <Card
          key={p.id}
          p={p}
          owner={owner}
          me={me}
          busy={busy}
          onDecide={decide}
          onNote={note}
          onSimple={simple}
          onClose={closeReq}
          onSeed={setSeed}
          role={role}
        />
      ))}
      {mineWaiting.length > 0 && (
        <p className="text-xs text-[var(--a-8a7b73)]">
          내가 보낸 요청 {mineWaiting.length}건이 상대편 답을 기다리는 중입니다.
        </p>
      )}
    </section>
  )

  const form = (
    <NewItem
      key={seed?.id ?? 'new'}
      questions={questions}
      busy={busy}
      owner={owner}
      seed={seed}
      onClearSeed={() => setSeed(null)}
      onSubmit={create}
    />
  )

  return (
    <div className="flex flex-col gap-8 pb-16">
      {error && (
        <p className="rounded-xl border border-[var(--a-a63d5a)] bg-[var(--a-a63d5a)]/10 px-4 py-3 text-sm font-semibold text-[var(--a-a63d5a)]">
          {error}
        </p>
      )}

      {/*
        온 이유가 먼저 보이게 순서를 바꾼다.

        원장은 정하러 온다 — 결재가 맨 위. 매니저는 받은 요청을 처리하러 오거나
        올리러 온다 — 요청함이 맨 위. 화면을 둘로 나누지 않고 순서만 바꾸는 이유는,
        두 사람이 같은 것을 보고 이야기할 수 있어야 하기 때문이다.
      */}
      {owner ? (
        <>
          {decisions}
          {requests}
          {form}
        </>
      ) : (
        <>
          {requests}
          {form}
          {decisions}
        </>
      )}

      <section className="flex flex-col gap-3">
        <SectionTitle>지난 결재</SectionTitle>
        {done.length === 0 ? (
          <Empty>아직 결재한 제안이 없습니다.</Empty>
        ) : (
          done.map((p) => (
            <Card key={p.id} p={p} owner={false} me={me} busy={busy} onDecide={decide}
          onNote={note}
          onSimple={simple}
          onClose={closeReq}
          onSeed={setSeed}
          role={role}
        />
          ))
        )}
      </section>

      <p className="text-xs leading-relaxed text-[var(--a-8a7b73)]">
        {me} 님으로 보고 계십니다 ({owner ? '원장 — 결재할 수 있습니다' : '사이트 매니저 — 제안만 올릴 수 있습니다'}).
      </p>
    </div>
  )
}

/**
 * 제안 한 장.
 *
 * 전/후를 위아래로 놓는다. 좌우로 놓으면 휴대전화에서 두 칸이 다 좁아져
 * 긴 문장이 세로로 흘러 버리고, 무엇이 '지금' 이고 무엇이 '바꿀 것' 인지 헷갈린다.
 */
function Card({
  p,
  owner,
  me,
  busy,
  onDecide,
  onNote,
  onSimple,
  onClose,
  onSeed,
  role,
}: {
  p: Proposal
  owner: boolean
  me: string
  busy: boolean
  onDecide: (id: string, d: 'approved' | 'rejected', comment: string) => void
  onNote: (id: string, text: string) => Promise<boolean>
  onSimple: (action: 'ack' | 'deployed', id: string) => void
  onClose: (id: string, done: boolean) => void
  onSeed: (p: Proposal) => void
  role: 'owner' | 'manager'
}) {
  const [comment, setComment] = useState('')
  const live = p.status === 'pending'
  const notes = p.notes ?? []
  /** 나에게 온 요청인가 — 받은 사람만 닫을 수 있다 */
  const mineToClose = live && p.toRole === role

  return (
    <Board>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[1.0625rem] leading-snug font-extrabold text-[var(--a-2e2724)]">
              {p.title}
            </h3>
            <p className="mt-1 text-xs text-[var(--a-8a7b73)]">
              {typeOf(p) === 'request'
                ? TYPE_LABEL.request
                : (p.kind && KIND_LABEL[p.kind]) || TYPE_LABEL.proposal}
              {' · '}
              {p.createdBy} · {p.createdAt.slice(0, 10)}
            </p>
          </div>
          <StatusChip p={p} />
        </div>

        <div className="rounded-xl bg-[var(--a-f4f1ee)] px-4 py-3">
          <p className="text-xs font-bold tracking-wider text-[var(--a-8a7b73)]">
            {typeOf(p) === 'request' ? '무엇이 필요한가' : '왜 바꾸나'}
          </p>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--a-2e2724)]">{p.reason}</p>
        </div>

        {(typeOf(p) === 'request' ? [] : p.changes).map((c, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="text-xs font-bold tracking-wider text-[var(--a-8a7b73)]">{c.label}</p>
            <div className="rounded-lg border border-[var(--a-e7ddd4)] px-3 py-2">
              <p className="text-[0.6875rem] font-bold text-[var(--a-8a7b73)]">지금</p>
              <p className="mt-0.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-[var(--a-8a7b73)] line-through decoration-[var(--a-e7ddd4)]">
                {c.before || '(비어 있음)'}
              </p>
            </div>
            <div className="rounded-lg border-2 border-[var(--a-a63d5a)] px-3 py-2">
              <p className="text-[0.6875rem] font-bold text-[var(--a-a63d5a)]">이렇게 바꾸면</p>
              <p className="mt-0.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap font-medium text-[var(--a-2e2724)]">
                {c.after}
              </p>
            </div>
          </div>
        ))}

        {typeOf(p) === 'proposal' && !canAutoApply(p.kind) && live && (
          <Note>
            이건 승인하셔도 사이트에 바로 바뀌지는 않습니다. 승인 표시가 남으면 매니저가 올립니다.
          </Note>
        )}

        {p.applyError && (
          <p className="rounded-lg bg-[var(--a-a63d5a)]/10 px-3 py-2 text-sm font-semibold text-[var(--a-a63d5a)]">
            승인은 됐지만 반영에 실패했습니다 — {p.applyError}
          </p>
        )}

        <Verify p={p} me={me} busy={busy} onSimple={onSimple} />

        {notes.length > 0 && (
          <div className="flex flex-col gap-2 border-t border-[var(--a-e7ddd4)] pt-3">
            <p className="text-xs font-bold tracking-wider text-[var(--a-8a7b73)]">오간 의견</p>
            {[...notes]
              .sort((a, b) => a.at.localeCompare(b.at))
              .map((n, i) => (
                <NoteLine key={`${n.at}-${i}`} n={n} mine={n.by === me} />
              ))}
          </div>
        )}

        {live && (
          <div className="flex flex-col gap-3 border-t border-[var(--a-e7ddd4)] pt-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold tracking-wider text-[var(--a-8a7b73)]">
                하실 말씀
              </span>
              <textarea
                id={`comment-${p.id}`}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={2}
                className="rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-[0.9375rem] leading-relaxed text-[var(--a-2e2724)]"
                placeholder={
                  owner
                    ? "예: 좋은데 '잔머리' 말고 '뒷머리' 로 해 주세요"
                    : '원장님 물음에 답하거나, 덧붙일 말을 적습니다'
                }
              />
            </label>

            {/*
              의견만 남기는 길을 승인·반려와 같은 자리에 둔다.

              "좋은데 이 낱말만" 이 제일 흔한데, 그때 반려밖에 없으면 반려를 누르시게
              된다. 반려는 제안을 닫아 버려 매니저가 처음부터 다시 올려야 한다.
              의견을 남기면 제안은 대기인 채로 있고 그 밑에 말이 쌓인다.
            */}
            <Button
              onClick={async () => {
                if (await onNote(p.id, comment)) setComment('')
              }}
              disabled={busy || !comment.trim()}
              variant="outline"
              className="h-11 w-full border-[var(--a-e7ddd4)] font-bold text-[var(--a-6b5d57)]"
            >
              <MessageSquare className="mr-1.5 h-4 w-4" />
              의견만 남기기 (아직 정하지 않음)
            </Button>

            {/*
              요청은 받은 사람이 닫는다. 결재와 권한이 다르다 — 원장이 매니저에게
              보낸 요청은 매니저가 닫는다. 원장만 닫게 하면 매니저가 다 해 놓고도
              기다려야 하고, 그 사이 목록에는 안 끝난 일로 남는다.
            */}
            {typeOf(p) === 'request' && mineToClose && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onSeed(p)}
                  disabled={busy}
                  className="h-11 flex-1 bg-[var(--a-a63d5a)] font-bold hover:opacity-90"
                >
                  <Wand2 className="mr-1.5 h-4 w-4" />
                  제안으로 만들기
                </Button>
                <Button
                  onClick={() => onClose(p.id, true)}
                  disabled={busy}
                  variant="outline"
                  className="h-11 border-[var(--a-e7ddd4)] font-bold text-[var(--a-6b5d57)]"
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  처리했습니다
                </Button>
                <Button
                  onClick={() => onClose(p.id, false)}
                  disabled={busy}
                  variant="outline"
                  className="h-11 border-[var(--a-e7ddd4)] font-bold text-[var(--a-8a7b73)]"
                >
                  안 하기로
                </Button>
              </div>
            )}

            {typeOf(p) === 'proposal' && owner && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => onDecide(p.id, 'approved', comment)}
                  disabled={busy}
                  className="h-12 flex-1 bg-[var(--a-3f6b57)] text-base font-extrabold hover:opacity-90"
                >
                  <Check className="mr-1.5 h-5 w-5" />
                  승인
                </Button>
                <Button
                  onClick={() => onDecide(p.id, 'rejected', comment)}
                  disabled={busy}
                  variant="outline"
                  className="h-12 flex-1 border-[var(--a-e7ddd4)] text-base font-extrabold text-[var(--a-6b5d57)]"
                >
                  <X className="mr-1.5 h-5 w-5" />
                  반려
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Board>
  )
}

function StatusChip({ p }: { p: Proposal }) {
  const tone =
    p.status === 'approved'
      ? 'bg-[var(--a-3f6b57)]/12 text-[var(--a-3f6b57)]'
      : p.status === 'rejected'
        ? 'bg-[var(--a-8a7b73)]/15 text-[var(--a-6b5d57)]'
        : 'bg-[var(--a-a63d5a)] text-white'
  const extra =
    p.status === 'approved' && canAutoApply(p.kind) ? (p.applied ? ' · 반영됨' : ' · 반영 안 됨') : ''
  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {statusLabel(p)}
      {extra}
    </span>
  )
}

/**
 * 새로 올리기 — 요청이거나 제안이거나.
 *
 * 처음 열릴 때 무엇이 골라져 있는지가 중요하다. 원장에게는 '요청' 이 먼저다 —
 * 최종 문장을 쓰라고 하면 아예 안 쓰시게 된다. 매니저에게는 '제안' 이 먼저다.
 * 둘 다 반대쪽으로 바꿀 수 있지만, 기본값이 각자의 일이어야 한다.
 *
 * 문항을 고르면 '지금' 이 자동으로 채워진다 — 손으로 옮겨 적게 하면 옮기는 사이에
 * 틀리고, 틀린 '지금' 위에서 결재가 이뤄진다.
 */
function NewItem({
  questions,
  busy,
  owner,
  seed,
  onClearSeed,
  onSubmit,
}: {
  questions: QuestionRef[]
  busy: boolean
  owner: boolean
  /** [제안으로 만들기] 로 넘어온 요청 */
  seed: Proposal | null
  onClearSeed: () => void
  onSubmit: (d: ProposalDraft) => Promise<boolean>
}) {
  /*
    요청에서 넘어온 값은 상태로 '복사' 하지 않고 초깃값으로 받는다.

    처음에는 useEffect 안에서 setState 했는데, 그건 이 저장소가 예전에 걷어낸
    안티패턴이다(react-hooks/set-state-in-effect). 부모가 seed.id 를 key 로 주므로
    다른 요청을 고르면 이 폼이 통째로 다시 마운트되고, 그때 아래 초깃값이 다시
    잡힌다 — 효과도 같고 그리는 횟수는 한 번 적다.
  */
  const [open, setOpen] = useState(!!seed)
  const [type, setType] = useState<ItemType>(seed ? 'proposal' : owner ? 'request' : 'proposal')
  const [kind, setKind] = useState<ProposalKind>('wed100')
  const [slug, setSlug] = useState(questions[0]?.slug ?? '')
  const [field, setField] = useState<'question' | 'answer'>('question')
  const [title, setTitle] = useState(seed?.title ?? '')
  const [reason, setReason] = useState(seed ? `${seed.createdBy} 님 요청: ${seed.reason}` : '')
  const [label, setLabel] = useState('')
  /*
    문항이 아닌 제안('사이트 본문'·'공개 설정')의 '지금' 값.

    문항은 고르면 저절로 채워지지만 그 밖의 것은 채워 줄 데가 없어서 빈칸으로
    두었다가, 첫 사이트 본문 제안을 올리려다 막혔다 — 카드에 "지금: (비어 있음)"
    만 뜨고 원장님은 무엇이 어떻게 바뀌는지 볼 수 없다. 전/후를 나란히 놓는 것이
    이 화면의 전부인데 한쪽이 없으면 결재가 아니라 통보가 된다.
  */
  const [before0, setBefore0] = useState('')
  const [after, setAfter] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  const picked = questions.find((q) => q.slug === slug)
  const before =
    type === 'proposal' && kind === 'wed100'
      ? field === 'question'
        ? (picked?.question ?? '')
        : (picked?.answer ?? '')
      : before0

  const draft: ProposalDraft = {
    type,
    title,
    reason,
    ...(seed ? { fromRequest: seed.id } : {}),
    ...(type === 'request' ? {} : { kind }),
    ...(type === 'proposal' && kind === 'wed100' ? { slug, field } : {}),
    changes: type === 'request' ? [] : [
      {
        label: kind === 'wed100' ? (field === 'question' ? '제목' : '답변') : label || '바뀌는 것',
        before,
        after,
      },
    ],
  }

  async function submit() {
    const bad = validateDraft(draft)
    if (bad) {
      setHint(bad)
      return
    }
    setHint(null)
    if (await onSubmit(draft)) {
      setTitle('')
      setReason('')
      setAfter('')
      setLabel('')
      setBefore0('')
      setOpen(false)
      onClearSeed()
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="h-11 w-full border-dashed border-[var(--a-e7ddd4)] font-bold text-[var(--a-6b5d57)]"
      >
        <Plus className="mr-1.5 h-4 w-4" />
        {owner ? '요청 올리기' : '새 제안 올리기'}
      </Button>
    )
  }

  return (
    <Board>
      <div className="flex flex-col gap-4">
        <SectionTitle>
          <FileText className="mr-1.5 inline h-4 w-4" />
          {type === 'request' ? '요청 올리기' : '제안 올리기'}
        </SectionTitle>

        {seed && (
          <Note>
            받은 요청에서 이어 만드는 제안입니다. 승인되면 그 요청도 함께 닫힙니다.
          </Note>
        )}

        <Field label="어떤 것을 올리나">
          <select
            id="proposal-type"
            value={type}
            onChange={(e) => setType(e.target.value as ItemType)}
            className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm"
          >
            <option value="request">요청 — 하고 싶은 말만 적습니다 (상대가 다듬습니다)</option>
            <option value="proposal">제안 — 바꿀 문장까지 적습니다 (원장님이 결재합니다)</option>
          </select>
        </Field>

        {type === 'proposal' && (
        <Field label="무엇을 바꾸나">
          <select
            id="proposal-kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as ProposalKind)}
            className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm"
          >
            {(Object.keys(KIND_LABEL) as ProposalKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </Field>

        )}

        {type === 'proposal' && kind === 'wed100' && (
          <>
            <Field label="어느 문항">
              <select
                id="proposal-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm"
              >
                {questions.map((q) => (
                  <option key={q.slug} value={q.slug}>
                    {q.slug} · {q.question}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="어느 칸">
              <select
                id="proposal-field"
                value={field}
                onChange={(e) => setField(e.target.value as 'question' | 'answer')}
                className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm"
              >
                <option value="question">제목</option>
                <option value="answer">답변</option>
              </select>
            </Field>
          </>
        )}

        {type === 'proposal' && kind !== 'wed100' && (
          <>
            <Field label="바뀌는 것의 이름 (예: /services 안내 문단)">
              <input
                id="proposal-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm"
              />
            </Field>
            <Field label="지금 뭐라고 되어 있나">
              <textarea
                id="proposal-before"
                value={before0}
                onChange={(e) => setBefore0(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm leading-relaxed"
                placeholder="지금 화면에 있는 문장을 그대로 옮겨 적어 주세요 — 원장님은 이것과 아래를 견주어 정하십니다"
              />
            </Field>
          </>
        )}

        {type === 'proposal' && kind === 'wed100' && (
          <Field label="지금 (자동으로 채워집니다)">
            <p className="rounded-lg bg-[var(--a-f4f1ee)] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-[var(--a-6b5d57)]">
              {before || '(비어 있음)'}
            </p>
          </Field>
        )}

        {type === 'proposal' && (
        <Field label="이렇게 바꾸자">
          <textarea
            id="proposal-after"
            value={after}
            onChange={(e) => setAfter(e.target.value)}
            rows={kind === 'wed100' && field === 'answer' ? 8 : 3}
            className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm leading-relaxed"
            placeholder="승인하면 이 내용이 그대로 쓰입니다"
          />
        </Field>
        )}

        <Field label={owner ? '매니저가 볼 한 줄' : '원장님이 볼 한 줄'}>
          <input
            id="proposal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm"
            placeholder="예: p4-16 제목에 '혼주' 를 넣습니다"
          />
        </Field>

        <Field label={type === 'request' ? '무엇이 필요하신가요' : '왜 바꾸나'}>
          <textarea
            id="proposal-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm leading-relaxed"
            placeholder={
              type === 'request'
                ? '예: 머리 손질 순서 설명이 어렵다고 하시는 분이 많아요. 좀 쉽게 고쳐 주세요.'
                : "예: '혼주올림머리' 로 검색하는 분이 월 1,750명인데, 그 말이 제목에 든 문항이 2개뿐이라 3개로 채웁니다. 뜻은 그대로입니다."
            }
          />
        </Field>

        {hint && (
          <p className="text-sm font-semibold text-[var(--a-a63d5a)]">{hint}</p>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() => void submit()}
            disabled={busy}
            className="h-11 flex-1 bg-[var(--a-a63d5a)] font-bold hover:bg-[var(--a-8a2e48)]"
          >
            올리기
          </Button>
          <Button
            onClick={() => {
              setOpen(false)
              onClearSeed()
            }}
            variant="outline"
            className="h-11 border-[var(--a-e7ddd4)] font-bold text-[var(--a-6b5d57)]"
          >
            그만두기
          </Button>
        </div>
      </div>
    </Board>
  )
}

/**
 * 정말 바뀌었는지 보여 주는 자리.
 *
 * "승인됨" 이라는 표시는 우리가 우리에게 하는 말이다. 그 표시와 사이트가 어긋나는
 * 길은 여럿이다 — 필드 이름이 틀렸거나, 반영 뒤 누가 또 고쳤거나, 코드 제안이라
 * 애초에 배포가 안 됐거나. 그래서 셋을 보여 준다.
 *  1) 반영한 뒤 Firestore 에서 되읽은 값
 *  2) 그 값이 승인한 문장과 같은가
 *  3) 사이트에서 직접 열어 보는 링크
 */
function Verify({
  p,
  me,
  busy,
  onSimple,
}: {
  p: Proposal
  me: string
  busy: boolean
  onSimple: (action: 'ack' | 'deployed', id: string) => void
}) {
  if (p.status === 'pending') return null

  const href = viewHref(p)
  const match = appliedMatches(p)
  const mine = p.createdBy === me
  const needsDeploy = p.status === 'approved' && !canAutoApply(p.kind) && !p.applied

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--a-e7ddd4)] bg-[var(--a-fbf8f5)] p-3.5">
      <p className="text-xs font-bold tracking-wider text-[var(--a-8a7b73)]">
        {p.status === 'approved' ? '무엇이 바뀌었나' : '결재 결과'}
      </p>

      <p className="text-[0.9375rem] leading-relaxed text-[var(--a-2e2724)]">
        {p.decidedBy} 님이 {p.decidedAt?.slice(0, 16).replace('T', ' ')} 에{' '}
        {p.status === 'approved' ? '승인' : '반려'}하셨습니다.
      </p>

      {p.applied && p.appliedValue != null && (
        <div className="rounded-lg border border-[var(--a-e7ddd4)] bg-white px-3 py-2">
          <p className="text-[0.6875rem] font-bold text-[var(--a-3f6b57)]">
            지금 사이트에 들어 있는 내용
          </p>
          <p className="mt-0.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-[var(--a-2e2724)]">
            {p.appliedValue}
          </p>
        </div>
      )}

      {match === false && (
        <p className="rounded-lg bg-[var(--a-a63d5a)]/10 px-3 py-2 text-sm font-semibold text-[var(--a-a63d5a)]">
          승인한 문장과 지금 들어 있는 내용이 다릅니다. 반영한 뒤에 누가 또 고쳤을 수
          있습니다 — 위 내용을 확인해 주세요.
        </p>
      )}

      {needsDeploy && (
        <Note>
          승인은 났지만 아직 사이트에는 없습니다. 이건 배포를 거쳐야 바뀝니다.
        </Note>
      )}

      <div className="flex flex-wrap gap-2">
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--a-e7ddd4)] bg-white px-3 py-2 text-sm font-bold text-[var(--a-6b5d57)] hover:text-[var(--a-a63d5a)]"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            사이트에서 보기
          </a>
        )}
        {needsDeploy && (
          <Button
            onClick={() => onSimple('deployed', p.id)}
            disabled={busy}
            variant="outline"
            className="border-[var(--a-e7ddd4)] font-bold text-[var(--a-6b5d57)]"
          >
            <Rocket className="mr-1.5 h-4 w-4" />
            올렸습니다
          </Button>
        )}
        {!p.ackedAt && mine && (
          <Button
            onClick={() => onSimple('ack', p.id)}
            disabled={busy}
            className="bg-[var(--a-3f6b57)] font-bold hover:opacity-90"
          >
            <Check className="mr-1.5 h-4 w-4" />
            확인했습니다
          </Button>
        )}
        {p.ackedAt && (
          <span className="self-center text-xs text-[var(--a-8a7b73)]">
            {p.ackedBy} 확인 · {p.ackedAt.slice(0, 10)}
          </span>
        )}
      </div>
    </div>
  )
}

/**
 * 의견 한 줄.
 *
 * 결재하며 남긴 말에는 그 결정을 함께 적는다. "반려합니다" 라는 말과 그냥 지나가는
 * 의견이 같은 모양이면, 나중에 이 줄을 읽는 사람이 무엇 때문에 닫혔는지 못 찾는다.
 */
function NoteLine({ n, mine }: { n: ProposalNote; mine: boolean }) {
  const tag = n.decision === 'approved' ? '승인하며' : n.decision === 'rejected' ? '반려하며' : null
  return (
    <div
      className={[
        'rounded-xl px-3.5 py-2.5',
        mine ? 'bg-[var(--a-f6e9ed)]' : 'bg-[var(--a-f4f1ee)]',
      ].join(' ')}
    >
      <p className="text-[0.6875rem] font-bold text-[var(--a-8a7b73)]">
        {n.by}
        {tag && <span className="ml-1 text-[var(--a-a63d5a)]">· {tag}</span>}
        <span className="ml-1 font-normal">{n.at.slice(0, 16).replace('T', ' ')}</span>
      </p>
      <p className="mt-0.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-[var(--a-2e2724)]">
        {n.text}
      </p>
    </div>
  )
}

/** AdminUI 의 Panel 과 같은 판이되, 머리글을 안에서 자유롭게 그린다 */
function Board({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-[var(--a-e0d6cc)] bg-white p-3.5 sm:p-4">
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-bold tracking-wider text-[var(--a-8a7b73)]">{label}</span>
      {children}
    </label>
  )
}
