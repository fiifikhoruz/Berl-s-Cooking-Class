create table if not exists public.bookings (
  id uuid primary key,
  dish_id text not null,
  dish_name text not null,
  session_date date not null,
  session_time text not null,
  guest_name text not null,
  guest_email text not null,
  guest_phone text,
  notes text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now(),
  constraint bookings_unique_slot unique (session_date, session_time)
);

create index if not exists bookings_session_date_idx on public.bookings (session_date);
create index if not exists bookings_guest_email_idx on public.bookings (guest_email);

create table if not exists public.availability_overrides (
  key text primary key,
  session_date date not null,
  session_time text not null,
  available boolean not null,
  updated_at timestamptz not null default now()
);

create index if not exists availability_overrides_date_idx on public.availability_overrides (session_date);

alter table public.bookings enable row level security;
alter table public.availability_overrides enable row level security;

-- The app accesses these tables only from server routes with the service role key.
-- No anonymous or authenticated browser policies are intentionally created.
