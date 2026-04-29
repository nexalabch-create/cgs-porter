-- 0011_security_hardening.sql
--
-- Pre-launch hardening pass. Three independent fixes bundled because they
-- all touch already-deployed objects.
--
-- 1) PRIVILEGE ESCALATION (CRITICAL)
--    The `users: update own row` policy permits any authenticated user to
--    UPDATE their own users row. WITH CHECK only restricts the row identity
--    (auth.uid() = id), not the columns. A logged-in porter can therefore
--    run `update users set role='chef'` on themselves and instantly read
--    every service, every client, every shift, every notification.
--
--    Fix: drop the broad UPDATE policy. Porters do not edit their own
--    user row from the app — name/role/cgs_employee_id all flow from the
--    chef admin panel, which uses the chef-write policy. If a self-edit
--    flow is added later (settings → change name), it should be a
--    narrowly-scoped policy or a SECURITY DEFINER RPC, not a blanket
--    "update own row".
--
-- 2) SELF-NOTIFICATION ON SELF-CLAIM
--    When a porter taps "Je prends ce service", the notify_service_change
--    trigger fires `service_assigned` with recipient = the porter who just
--    clicked. Useless toast + push to themselves. Skip it by comparing
--    auth.uid() inside the trigger (works because PostgREST sets the
--    request claim, even inside SECURITY DEFINER functions).
--
-- 3) MISSING FK INDEXES
--    notifications.actor_id and notifications.service_id are FKs without
--    indexes. ON DELETE cascade scans the whole table to enforce the FK.
--    Cheap to add and prevents future scaling pain.

-- ──────────────────────────────────────────────────────────────────
-- 1) PRIVILEGE ESCALATION
-- ──────────────────────────────────────────────────────────────────
drop policy if exists "users: update own row" on public.users;

-- ──────────────────────────────────────────────────────────────────
-- 2) SKIP SELF-NOTIFICATION
-- ──────────────────────────────────────────────────────────────────
create or replace function public.notify_service_change()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
as $$
declare
  flight_label  text := new.flight;
  time_label    text := to_char(new.scheduled_at, 'HH24:MI');
  client_label  text := new.client_name;
  current_uid   uuid := (select auth.uid());
begin
  -- 1. service_assigned: assigned_porter_id became non-null OR changed.
  --    Skip if the porter assigned themselves (self-claim flow) — they
  --    already see the result instantly via the local optimistic update,
  --    a self-notification would be redundant noise.
  if (new.assigned_porter_id is not null
      and (old.assigned_porter_id is distinct from new.assigned_porter_id)
      and (current_uid is null or new.assigned_porter_id <> current_uid)) then
    insert into public.notifications(recipient_id, actor_id, service_id, type, payload)
    values (
      new.assigned_porter_id,
      current_uid,
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

-- Re-create the trigger with a WHEN clause so it only fires on the column
-- transitions we actually care about (status, assignment). Was firing on
-- every bag/remarques edit before.
drop trigger if exists services_notify on public.services;
create trigger services_notify
  after update on public.services
  for each row
  when (
    old.status is distinct from new.status
    or old.assigned_porter_id is distinct from new.assigned_porter_id
  )
  execute function public.notify_service_change();

-- ──────────────────────────────────────────────────────────────────
-- 3) FK INDEXES
-- ──────────────────────────────────────────────────────────────────
create index if not exists notifications_actor_id_idx
  on public.notifications(actor_id) where actor_id is not null;
create index if not exists notifications_service_id_idx
  on public.notifications(service_id) where service_id is not null;
