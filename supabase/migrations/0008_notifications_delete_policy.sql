-- 0008_notifications_delete_policy.sql
--
-- Allow recipients to delete their own notifications (UI has a per-notification
-- trash button + "Tout supprimer" action). 0007 only added SELECT + UPDATE
-- policies, so DELETE was implicitly blocked by RLS.

create policy "delete_own" on public.notifications
  for delete using (recipient_id = (select auth.uid()));
