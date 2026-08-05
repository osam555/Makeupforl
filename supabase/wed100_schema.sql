-- 혼주메이크업 100문100답 스키마
-- 실행: Supabase Dashboard > SQL Editor 에서 이 파일 전체 실행

create table if not exists wed100_questions (
  id          integer primary key,
  slug        text unique not null,
  part        integer not null,
  "partTitle" text not null,
  n           integer not null,
  question    text not null,
  question_en text,
  answer      jsonb not null default '[]',      -- 문단 배열
  cues        jsonb not null default '[]',      -- [{i, ko, en, start, end}]
  keywords    jsonb not null default '[]',
  "questionAudio" jsonb,                        -- {start, end}
  audio       text,                             -- 오디오 경로/URL
  duration    numeric,
  "heroImage"  text,                            -- null 이면 자동 생성 SVG 사용
  "thumbImage" text,
  published   boolean not null default true,
  "updatedAt" timestamptz not null default now()
);

create index if not exists wed100_questions_part_n on wed100_questions (part, n);

-- 조회/재생 이벤트 (대시보드 집계용)
create table if not exists wed100_events (
  id         bigint generated always as identity primary key,
  slug       text not null,
  event      text not null check (event in ('view','play','complete','cta_click')),
  lang       text,                              -- 자막 언어 상태
  created_at timestamptz not null default now()
);

create index if not exists wed100_events_slug_created on wed100_events (slug, created_at);
create index if not exists wed100_events_event_created on wed100_events (event, created_at);

-- RLS: 읽기는 공개, 쓰기는 anon 이벤트 삽입 + 질문 수정 허용
-- (기존 bookings 테이블과 동일하게 단순 정책 사용. 운영 강화 시 service role 로 전환)
alter table wed100_questions enable row level security;
alter table wed100_events enable row level security;

drop policy if exists "wed100_questions_read" on wed100_questions;
create policy "wed100_questions_read" on wed100_questions for select using (true);

drop policy if exists "wed100_questions_write" on wed100_questions;
create policy "wed100_questions_write" on wed100_questions
  for all using (true) with check (true);

drop policy if exists "wed100_events_insert" on wed100_events;
create policy "wed100_events_insert" on wed100_events for insert with check (true);

drop policy if exists "wed100_events_read" on wed100_events;
create policy "wed100_events_read" on wed100_events for select using (true);
