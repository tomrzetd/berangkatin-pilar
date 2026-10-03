-- PILAR Pulse migration 002 · Clear Chat
-- Run once in Supabase SQL Editor for existing installations.

drop policy if exists "pulse messages delete" on public.pilar_messages;
create policy "pulse messages delete" on public.pilar_messages
for delete to authenticated
using (auth.uid() = visitor_id or public.pilar_is_admin());

grant delete on public.pilar_messages to authenticated;
