-- One-time hotfix for deployed databases created before users.hospital_id existed.
-- Run this in the Supabase SQL editor, then retry token signup.

alter table public.users add column if not exists hospital_id bigint;

alter table public.users drop constraint if exists fk_users_hospital;
alter table public.users
  add constraint fk_users_hospital
  foreign key (hospital_id)
  references public.hospitals(id)
  on delete set null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username, email, full_name, phone_number, role, hospital_id, account_status)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'username',
      split_part(new.email, '@', 1) || '_' || floor(random() * 9000 + 1000)::text
    ),
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone_number',
    coalesce(new.raw_user_meta_data->>'role', 'patient'),
    case
      when new.raw_user_meta_data->>'hospital_id' ~ '^[0-9]+$'
      then (new.raw_user_meta_data->>'hospital_id')::bigint
      else null
    end,
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

notify pgrst, 'reload schema';
