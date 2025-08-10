-- Extensions
create extension if not exists pgcrypto;

-- Tables
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'student',
  created_at timestamp with time zone default now()
);

create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tags text[] default '{}',
  start_time timestamp with time zone not null,
  end_time timestamp with time zone not null,
  duration_minutes int not null default 60,
  questions integer[] default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create table if not exists public.questions (
  id serial primary key,
  question text not null,
  correct_answer text not null,
  mark int not null default 1,
  type text not null default 'multiple_choice',
  tag text,
  explanation text,
  options text[] not null,
  created_at timestamp with time zone default now()
);

create table if not exists public.user_test_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  test_id uuid not null references public.tests(id) on delete cascade,
  started_at timestamp with time zone not null default now(),
  submitted_at timestamp with time zone,
  answers jsonb not null default '{}', -- {question_id: user_answer}
  total_marks int not null default 0,
  obtained_marks int not null default 0,
  is_completed boolean not null default false,
  time_taken_seconds int default 0,
  created_at timestamp with time zone default now(),
  unique(user_id, test_id)
);

create table if not exists public.user_question_responses (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.user_test_attempts(id) on delete cascade,
  question_id int not null references public.questions(id) on delete cascade,
  user_answer text,
  is_correct boolean not null default false,
  marks_obtained int not null default 0,
  time_spent_seconds int default 0,
  created_at timestamp with time zone default now()
);

-- Indexes
create index if not exists user_test_attempts_user_id_idx on public.user_test_attempts(user_id);
create index if not exists user_test_attempts_test_id_idx on public.user_test_attempts(test_id);
create index if not exists user_question_responses_attempt_id_idx on public.user_question_responses(attempt_id);
create index if not exists user_question_responses_question_id_idx on public.user_question_responses(question_id);
create index if not exists tests_start_time_idx on public.tests(start_time);
create index if not exists tests_end_time_idx on public.tests(end_time);

-- RLS
alter table public.profiles enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.user_test_attempts enable row level security;
alter table public.user_question_responses enable row level security;

-- Policies (drop + create, no IF NOT EXISTS)
-- profiles
drop policy if exists "profiles_read_self_or_admin" on public.profiles;
create policy "profiles_read_self_or_admin"
  on public.profiles for select
  using (auth.uid() = id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles for update
  using (auth.uid() = id);

-- tests
drop policy if exists "tests_read_all" on public.tests;
create policy "tests_read_all"
  on public.tests for select
  using (auth.role() = 'authenticated');

drop policy if exists "tests_insert_admin" on public.tests;
create policy "tests_insert_admin"
  on public.tests for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- questions
drop policy if exists "questions_read_all" on public.questions;
create policy "questions_read_all"
  on public.questions for select
  using (auth.role() = 'authenticated');

drop policy if exists "questions_insert_admin" on public.questions;
create policy "questions_insert_admin"
  on public.questions for insert
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "questions_update_admin" on public.questions;
create policy "questions_update_admin"
  on public.questions for update
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- user_test_attempts
drop policy if exists "attempts_insert_self" on public.user_test_attempts;
create policy "attempts_insert_self"
  on public.user_test_attempts for insert
  with check (auth.uid() = user_id);

drop policy if exists "attempts_read_self_or_admin" on public.user_test_attempts;
create policy "attempts_read_self_or_admin"
  on public.user_test_attempts for select
  using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "attempts_update_self" on public.user_test_attempts;
create policy "attempts_update_self"
  on public.user_test_attempts for update
  using (auth.uid() = user_id);

-- user_question_responses
drop policy if exists "responses_insert_own_attempt" on public.user_question_responses;
create policy "responses_insert_own_attempt"
  on public.user_question_responses for insert
  with check (exists (select 1 from public.user_test_attempts uta where uta.id = attempt_id and uta.user_id = auth.uid()));

drop policy if exists "responses_read_own_attempt" on public.user_question_responses;
create policy "responses_read_own_attempt"
  on public.user_question_responses for select
  using (exists (select 1 from public.user_test_attempts uta where uta.id = attempt_id and (uta.user_id = auth.uid() or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))));

drop policy if exists "responses_update_own_attempt" on public.user_question_responses;
create policy "responses_update_own_attempt"
  on public.user_question_responses for update
  using (exists (select 1 from public.user_test_attempts uta where uta.id = attempt_id and uta.user_id = auth.uid()));

-- Trigger to create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'role','student'))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
