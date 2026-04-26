-- 0007_notifications.sql
--
-- In-app notification system. Triggered automatically by changes on
-- public.services so the app code never has to remember to send them.
--
-- Notification types:
--   · service_assigned  → recipient = assigned porter ; fires when assigned_porter_id changes to non-null
--   · service_started   → recipient = chefs           ; fires when status goes 'todo' → 'active'
--   · service_completed → recipient = chefs           ; fires when status changes to 'done'
--
-- RLS lets each user read/update only their own. Inserts come from the
-- security-definer trigger function so RLS doesn't block them.

create type notification_type as enum (
  'service_assigned',
  'service_started',
  'service_completed'
);

create table public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.users(id) on delete cascade,
  actor_id     uuid references public.users(id) on delete set null,
  service_id   uuid references public.services(id) on delete cascade,
  type         notification_type not null,
  payload      jsonb not null default '{}'::jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);

create index notifications_recipient_recent
  on public.notifications (recipient_id, created_at desc);
create index notifications_recipient_unread
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

alter table public.notifications enable row level security;

-- Each user reads only their own notifications.
create policy "read_own" on public.notifications
  for select using (recipient_id = (select auth.uid()));

-- Each user can mark their own as read (UPDATE read_at).
create policy "mark_own_read" on public.notifications
  for update using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- ─────────────────────────────────────────────────────────────────
-- Trigger function — fires on services UPDATE to fan out notifications.
-- security definer so it can INSERT regardless of RLS.
-- ─────────────────────────────────────────────────────────────────

create or replace function public.notify_service_change()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  flight_label text := new.flight;
  time_label   text := to_char(new.scheduled_at, 'HH24:MI');
  client_label text := new.client_name;
begin
  -- 1. service_assigned: assigned_porter_id became non-null OR changed
  if (new.assigned_porter_id is not null
      and (old.assigned_porter_id is distinct from new.assigned_porter_id)) then
    insert into public.notifications(recipient_id, actor_id, service_id, type, payload)
    values (
      new.assigned_porter_id,
      null,                                  -- actor: would need to track in app layer; null OK for now
      new.id,
      'service_assigned',
      jsonb_build_object(
        'flight',  flight_label,
        'time',    time_label,
        'client',  client_label,
        'meeting', new.meeting_point,
        'bags',    new.bags
      )
    );
  end if;

  -- 2. service_started: status went from anything → 'active' (and there's a porter)
  if (old.status is distinct from new.status
      and new.status = 'active'
      and new.assigned_porter_id is not null) then
    insert into public.notifications(recipient_id, actor_id, service_id, type, payload)
    select u.id, new.assigned_porter_id, new.id, 'service_started',
           jsonb_build_object(
             'flight',     flight_label,
             'time',       time_label,
             'client',     client_label,
             'porter_id',  new.assigned_porter_id
           )
    from public.users u where u.role = 'chef';
  end if;

  -- 3. service_completed: status went to 'done'
  if (old.status is distinct from new.status and new.status = 'done') then
    insert into public.notifications(recipient_id, actor_id, service_id, type, payload)
    select u.id, new.assigned_porter_id, new.id, 'service_completed',
           jsonb_build_object(
             'flight',     flight_label,
             'time',       time_label,
             'client',     client_label,
             'porter_id',  new.assigned_porter_id
           )
    from public.users u where u.role = 'chef';
  end if;

  return new;
end;
$$;

drop trigger if exists services_notify on public.services;
create trigger services_notify
  after update on public.services
  for each row execute function public.notify_service_change();

-- Also fire service_assigned on INSERT when an assignment is set up-front
-- (e.g. importer creates services already assigned).
create or replace function public.notify_service_inserted()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
begin
  if (new.assigned_porter_id is not null) then
    insert into public.notifications(recipient_id, service_id, type, payload)
    values (
      new.assigned_porter_id,
      new.id,
      'service_assigned',
      jsonb_build_object(
        'flight',  new.flight,
        'time',    to_char(new.scheduled_at, 'HH24:MI'),
        'client',  new.client_name,
        'meeting', new.meeting_point,
        'bags',    new.bags
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists services_notify_insert on public.services;
create trigger services_notify_insert
  after insert on public.services
  for each row execute function public.notify_service_inserted();

-- Realtime: enable Supabase realtime for the notifications table.
alter publication supabase_realtime add table public.notifications;
