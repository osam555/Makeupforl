'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, FileText, MessageSquare, Plus, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Empty, Note, SectionTitle } from '@/components/admin/AdminUI'
import {
  KIND_LABEL,
  STATUS_LABEL,
  canAutoApply,
  pendingOf,
  validateDraft,
  type Proposal,
  type ProposalDraft,
  type ProposalNote,
  type ProposalKind,
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

  const pending = useMemo(() => (items ? pendingOf(items) : []), [items])
  const done = useMemo(() => (items ? items.filter((p) => p.status !== 'pending') : []), [items])

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
        <Card key={p.id} p={p} owner={owner} me={me} busy={busy} onDecide={decide} onNote={note} />
      ))}
    </section>
  )

  return (
    <div className="flex flex-col gap-8 pb-16">
      {error && (
        <p className="rounded-xl border border-[var(--a-a63d5a)] bg-[var(--a-a63d5a)]/10 px-4 py-3 text-sm font-semibold text-[var(--a-a63d5a)]">
          {error}
        </p>
      )}

      {/* 온 이유가 먼저 보이게 — 원장님은 결재, 매니저는 제안 쓰기 */}
      {owner ? decisions : <NewProposal questions={questions} busy={busy} onSubmit={create} />}
      {owner ? <NewProposal questions={questions} busy={busy} onSubmit={create} /> : decisions}

      <section className="flex flex-col gap-3">
        <SectionTitle>지난 결재</SectionTitle>
        {done.length === 0 ? (
          <Empty>아직 결재한 제안이 없습니다.</Empty>
        ) : (
          done.map((p) => (
            <Card key={p.id} p={p} owner={false} me={me} busy={busy} onDecide={decide} onNote={note} />
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
}: {
  p: Proposal
  owner: boolean
  me: string
  busy: boolean
  onDecide: (id: string, d: 'approved' | 'rejected', comment: string) => void
  onNote: (id: string, text: string) => Promise<boolean>
}) {
  const [comment, setComment] = useState('')
  const live = p.status === 'pending'
  const notes = p.notes ?? []

  return (
    <Board>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-[1.0625rem] leading-snug font-extrabold text-[var(--a-2e2724)]">
              {p.title}
            </h3>
            <p className="mt-1 text-xs text-[var(--a-8a7b73)]">
              {KIND_LABEL[p.kind]} · {p.createdBy} · {p.createdAt.slice(0, 10)}
            </p>
          </div>
          <StatusChip p={p} />
        </div>

        <div className="rounded-xl bg-[var(--a-f4f1ee)] px-4 py-3">
          <p className="text-xs font-bold tracking-wider text-[var(--a-8a7b73)]">왜 바꾸나</p>
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-[var(--a-2e2724)]">{p.reason}</p>
        </div>

        {p.changes.map((c, i) => (
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

        {!canAutoApply(p.kind) && live && (
          <Note>
            이건 승인하셔도 사이트에 바로 바뀌지는 않습니다. 승인 표시가 남으면 매니저가 올립니다.
          </Note>
        )}

        {p.applyError && (
          <p className="rounded-lg bg-[var(--a-a63d5a)]/10 px-3 py-2 text-sm font-semibold text-[var(--a-a63d5a)]">
            승인은 됐지만 반영에 실패했습니다 — {p.applyError}
          </p>
        )}

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

            {owner && (
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
      {STATUS_LABEL[p.status]}
      {extra}
    </span>
  )
}

/**
 * 새 제안.
 *
 * 매니저가 쓰는 곳이다. 문항을 고르면 '지금' 이 자동으로 채워진다 — 손으로 옮겨
 * 적게 하면 옮기는 사이에 틀리고, 틀린 '지금' 위에서 결재가 이뤄진다.
 */
function NewProposal({
  questions,
  busy,
  onSubmit,
}: {
  questions: QuestionRef[]
  busy: boolean
  onSubmit: (d: ProposalDraft) => Promise<boolean>
}) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<ProposalKind>('wed100')
  const [slug, setSlug] = useState(questions[0]?.slug ?? '')
  const [field, setField] = useState<'question' | 'answer'>('question')
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [label, setLabel] = useState('')
  const [after, setAfter] = useState('')
  const [hint, setHint] = useState<string | null>(null)

  const picked = questions.find((q) => q.slug === slug)
  const before =
    kind === 'wed100' ? (field === 'question' ? (picked?.question ?? '') : (picked?.answer ?? '')) : ''

  const draft: ProposalDraft = {
    title,
    reason,
    kind,
    ...(kind === 'wed100' ? { slug, field } : {}),
    changes: [
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
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="h-11 w-full border-dashed border-[var(--a-e7ddd4)] font-bold text-[var(--a-6b5d57)]"
      >
        <Plus className="mr-1.5 h-4 w-4" />새 제안 올리기
      </Button>
    )
  }

  return (
    <Board>
      <div className="flex flex-col gap-4">
        <SectionTitle>
          <FileText className="mr-1.5 inline h-4 w-4" />새 제안
        </SectionTitle>

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

        {kind === 'wed100' && (
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

        {kind !== 'wed100' && (
          <Field label="바뀌는 것의 이름 (예: 무료 문항)">
            <input
              id="proposal-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm"
            />
          </Field>
        )}

        {kind === 'wed100' && (
          <Field label="지금 (자동으로 채워집니다)">
            <p className="rounded-lg bg-[var(--a-f4f1ee)] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap text-[var(--a-6b5d57)]">
              {before || '(비어 있음)'}
            </p>
          </Field>
        )}

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

        <Field label="원장님이 볼 한 줄">
          <input
            id="proposal-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm"
            placeholder="예: p4-16 제목에 '혼주' 를 넣습니다"
          />
        </Field>

        <Field label="왜 바꾸나">
          <textarea
            id="proposal-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-[var(--a-e7ddd4)] bg-[var(--color-white)] px-3 py-2 text-sm leading-relaxed"
            placeholder="예: '혼주올림머리' 로 검색하는 분이 월 1,750명인데, 그 말이 제목에 든 문항이 2개뿐이라 3개로 채웁니다. 뜻은 그대로입니다."
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
            onClick={() => setOpen(false)}
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
