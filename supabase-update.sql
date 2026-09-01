-- Run this once in Supabase SQL Editor.
-- It lets approved dispatchers see the student's name, phone and profile logo
-- beside an order. Admin access remains unchanged.

drop policy if exists profiles_select on public.profiles;
create policy profiles_select
on public.profiles for select
to authenticated
using (
  id = auth.uid()
  or public.is_admin()
  or public.is_dispatcher()
);

drop policy if exists identity_select on storage.objects;
create policy identity_select
on storage.objects for select
to authenticated
using (
  bucket_id = 'identity-docs'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
    or public.is_dispatcher()
  )
);
