create table public.admins (
  id uuid not null,
  email text not null,
  role text not null default 'admin'::text,
  created_at timestamp with time zone null default now(),
  full_name text null,
  last_login_at timestamp with time zone null,
  updated_at timestamp with time zone null default now(),
  deleted_at timestamp with time zone null,
  constraint admins_pkey primary key (id),
  constraint admins_email_key unique (email),
  constraint admins_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint admins_role_check check (
    (
      role = any (
        array[
          'super_admin'::text,
          'admin'::text,
          'warehouse'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_admins_active on public.admins using btree (id) TABLESPACE pg_default
where
  (deleted_at is null);