-- 0009_porter_reads_all_services.sql
--
-- Originally porters could only SELECT services where assigned_porter_id =
-- auth.uid() (their own). Mate's team workflow needs porters to see the
-- whole day's services list — they'll know who's busy with what, can spot
-- unassigned slots near their location, and the realtime updates feel
-- coherent across the whole team.
--
-- We keep the existing UPDATE rule (porter only updates own services) so
-- a porter can never accidentally start/finish another's job.

drop policy if exists "services: porter reads assigned" on public.services;

-- Any authenticated user (porter or chef) can read every services row.
-- Chefs already had this via the "chef reads all" policy below; this just
-- broadens it to porters too.
create policy "services: any authed reads all"
  on public.services for select
  to authenticated
  using (true);
