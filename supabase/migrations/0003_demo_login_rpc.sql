-- Demo-mode login shim for the mobile app.
-- The mobile Login screen has a [Porteur | Chef] toggle that fakes auth by
-- hardcoded IDs ('mt', 'p2'). After we wired Supabase, those IDs no longer
-- match the real auth.users UUIDs → porter view sees no services.
-- This RPC lets the anon-keyed client resolve a demo email to the real UUID.
--
-- ⚠️ NOT FOR PRODUCTION USE. Replace with real Supabase Auth on mobile,
-- then drop this function.

create or replace function public.demo_login(p_email text)
returns table (
  id         uuid,
  email      text,
  role       public.user_role,
  first_name text,
  last_name  text,
  initials   text
)
language sql
security definer
set search_path = ''
stable
as $$
  select id, email, role, first_name, last_name, initials
  from public.users
  where lower(email) = lower(p_email);
$$;

-- Allow the anon role to call it (the mobile app uses anon key).
grant execute on function public.demo_login(text) to anon;
grant execute on function public.demo_login(text) to authenticated;
