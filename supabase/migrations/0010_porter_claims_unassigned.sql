-- Allow any authenticated porter to claim an unassigned service.
--
-- Background: the existing "services: porter updates assigned" policy only lets
-- a porter UPDATE rows where `assigned_porter_id = auth.uid()` already — i.e.
-- you can only edit services you already own. That breaks the self-claim flow,
-- because the row starts with `assigned_porter_id IS NULL` so the USING clause
-- never matches and RLS silently denies the UPDATE.
--
-- This adds a separate, narrowly-scoped policy that permits the transition
-- NULL → auth.uid() and nothing else. The combination of:
--   USING       : assigned_porter_id IS NULL
--   WITH CHECK  : assigned_porter_id = auth.uid()
-- means: "I can update a row that is currently unassigned, but only into my
-- own UUID — I cannot steal it from a teammate, and I cannot assign it to
-- someone else." The chef policy still exists separately and remains the
-- only path for re-assigning already-assigned services.
create policy "services: porter claims unassigned"
  on public.services
  for update
  to authenticated
  using       (assigned_porter_id is null)
  with check  (assigned_porter_id = (select auth.uid()));
