-- BrightByte / Fleet21 — run this in the Supabase SQL editor (once per project).
-- Then set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env so signups persist.

create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  city text default '',
  address text default '',
  contact_email text default '',
  photo_url text default '',
  status text not null default 'pending',
  created_at timestamptz default now()
);

alter table companies add column if not exists city text default '';
alter table companies add column if not exists address text default '';
alter table companies add column if not exists contact_email text default '';
alter table companies add column if not exists photo_url text default '';
alter table companies add column if not exists status text default 'pending';

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null,
  role_id text,
  phone text,
  license_no text,
  license_expiry text,
  license_codes text,
  prdp text,
  id_number text,
  address text,
  employee_id text,
  start_date text,
  emergency_contact_name text,
  emergency_contact_number text,
  photo_url text,
  documents jsonb default '[]'::jsonb,
  assigned_vehicle_id uuid,
  ratings jsonb default '[]'::jsonb,
  last_login timestamptz,
  status text default 'pending',
  password_hash text,
  created_at timestamptz default now()
);

alter table profiles add column if not exists company_id uuid references companies(id) on delete cascade;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists "role" text;
alter table profiles add column if not exists role_id text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists license_no text;
alter table profiles add column if not exists license_expiry text;
alter table profiles add column if not exists license_codes text;
alter table profiles add column if not exists prdp text;
alter table profiles add column if not exists id_number text;
alter table profiles add column if not exists address text;
alter table profiles add column if not exists employee_id text;
alter table profiles add column if not exists start_date text;
alter table profiles add column if not exists emergency_contact_name text;
alter table profiles add column if not exists emergency_contact_number text;
alter table profiles add column if not exists photo_url text;
alter table profiles add column if not exists documents jsonb default '[]'::jsonb;
alter table profiles add column if not exists assigned_vehicle_id uuid;
alter table profiles add column if not exists ratings jsonb default '[]'::jsonb;
alter table profiles add column if not exists last_login timestamptz;
alter table profiles add column if not exists status text default 'pending';
alter table profiles add column if not exists password_hash text;

update profiles set "role" = 'admin' where "role" is null;

alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check ("role" in ('admin', 'fleet_manager', 'driver', 'finance', 'super_admin'));

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  "RoleID" text,
  "RoleName" text,
  description text,
  "Permissions" text,
  "permissionsMatrix" jsonb default '{}'::jsonb,
  state text default 'active',
  "isSystem" boolean default false,
  key text,
  created_at timestamptz default now()
);

alter table roles add column if not exists key text;

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  registration text not null,
  make text,
  model text,
  year int,
  vin text,
  colour text,
  fuel_type text,
  engine text,
  licence_expiry text,
  status text default 'available',
  odometer bigint default 0,
  value numeric(14,2) default 0,
  assigned_driver_id uuid references profiles(id),
  photo_url text,
  photos jsonb default '[]'::jsonb,
  documents jsonb default '[]'::jsonb,
  service_paused boolean default false,
  created_at timestamptz default now()
);

alter table vehicles add column if not exists company_id uuid references companies(id) on delete cascade;
alter table vehicles add column if not exists organisation_id uuid;
update vehicles set organisation_id = company_id where organisation_id is null and company_id is not null;
alter table vehicles alter column organisation_id drop not null;
alter table vehicles add column if not exists registration text;
alter table vehicles add column if not exists make text;
alter table vehicles add column if not exists model text;
alter table vehicles add column if not exists year int;
alter table vehicles add column if not exists vin text;
alter table vehicles add column if not exists assigned_driver_id uuid references profiles(id);
alter table vehicles add column if not exists colour text;
alter table vehicles add column if not exists fuel_type text;
alter table vehicles add column if not exists engine text;
alter table vehicles add column if not exists licence_expiry text;
alter table vehicles add column if not exists status text default 'available';
alter table vehicles add column if not exists odometer bigint default 0;
alter table vehicles alter column odometer type bigint;
alter table vehicles add column if not exists number text;
alter table vehicles add column if not exists vehicle_number text;
do $$ begin
  alter table vehicles alter column number drop not null;
exception when undefined_column then null; when others then null;
end $$;
alter table vehicles add column if not exists value numeric(14,2) default 0;
alter table vehicles add column if not exists photo_url text;
alter table vehicles add column if not exists photos jsonb default '[]'::jsonb;
alter table vehicles add column if not exists documents jsonb default '[]'::jsonb;
alter table vehicles add column if not exists service_paused boolean default false;

create table if not exists vehicle_makes (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists vehicle_models (
  id uuid primary key default gen_random_uuid(),
  make_id uuid references vehicle_makes(id) on delete cascade,
  make text not null,
  name text not null,
  unique (make, name)
);

create table if not exists vehicle_years (
  year int primary key
);

insert into vehicle_makes (name) values
  ('Toyota'), ('Volkswagen'), ('Ford'), ('Isuzu'), ('Nissan'),
  ('Mercedes-Benz'), ('Hyundai'), ('Kia'), ('Mazda'), ('Honda'),
  ('Suzuki'), ('Mahindra'), ('Hino'), ('Chevrolet')
on conflict (name) do nothing;

insert into vehicle_models (make_id, make, name)
select m.id, m.name, x.model
from vehicle_makes m
join (
  values
    ('Toyota', 'Hilux'), ('Toyota', 'Quantum'), ('Toyota', 'Corolla'), ('Toyota', 'Fortuner'),
    ('Toyota', 'Land Cruiser'), ('Toyota', 'Avanza'), ('Toyota', 'Starlet'), ('Toyota', 'Rumion'),
    ('Volkswagen', 'Polo'), ('Volkswagen', 'Golf'), ('Volkswagen', 'Amarok'), ('Volkswagen', 'T-Cross'),
    ('Volkswagen', 'Caddy'), ('Volkswagen', 'Transporter'),
    ('Ford', 'Ranger'), ('Ford', 'Everest'), ('Ford', 'EcoSport'), ('Ford', 'Transit'), ('Ford', 'Figo'),
    ('Isuzu', 'D-Max'), ('Isuzu', 'KB'), ('Isuzu', 'NPR'), ('Isuzu', 'mu-X'),
    ('Nissan', 'NP200'), ('Nissan', 'Navara'), ('Nissan', 'Almera'), ('Nissan', 'X-Trail'), ('Nissan', 'Hardbody'),
    ('Mercedes-Benz', 'Sprinter'), ('Mercedes-Benz', 'Vito'), ('Mercedes-Benz', 'C-Class'), ('Mercedes-Benz', 'Actros'),
    ('Hyundai', 'i20'), ('Hyundai', 'Creta'), ('Hyundai', 'H100'), ('Hyundai', 'Tucson'),
    ('Kia', 'Picanto'), ('Kia', 'Rio'), ('Kia', 'Sportage'), ('Kia', 'K2700'),
    ('Mazda', 'Mazda2'), ('Mazda', 'CX-5'), ('Mazda', 'BT-50'),
    ('Honda', 'Fit'), ('Honda', 'Civic'), ('Honda', 'CR-V'),
    ('Suzuki', 'Swift'), ('Suzuki', 'Jimny'), ('Suzuki', 'Ertiga'),
    ('Mahindra', 'Bolero'), ('Mahindra', 'Pik Up'), ('Mahindra', 'Scorpio'),
    ('Hino', '300'), ('Hino', '500'),
    ('Chevrolet', 'Utility'), ('Chevrolet', 'Spark')
) as x(make, model) on x.make = m.name
on conflict (make, name) do nothing;

insert into vehicle_years (year)
select y from generate_series(1990, extract(year from current_date)::int + 1) as y
on conflict do nothing;

alter table vehicle_makes enable row level security;
alter table vehicle_models enable row level security;
alter table vehicle_years enable row level security;

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  driver_id uuid references profiles(id),
  vehicle_id uuid references vehicles(id),
  cash_amount numeric(12,2),
  late_fee_applied numeric(12,2) default 0,
  amount numeric(12,2) not null,
  note text,
  proof_url text,
  odometer bigint,
  status text default 'submitted',
  created_at timestamptz default now()
);

alter table checkins add column if not exists odometer bigint;
alter table checkins alter column odometer type bigint;
alter table checkins add column if not exists cash_amount numeric(12,2);
alter table checkins add column if not exists late_fee_applied numeric(12,2) default 0;

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  driver_id uuid references profiles(id),
  vehicle_id uuid references vehicles(id),
  name text,
  amount numeric(12,2) not null,
  note text,
  proof_url text,
  frequency text default 'once_off',
  status text default 'submitted',
  created_at timestamptz default now()
);

create table if not exists checkin_schedules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  driver_id uuid references profiles(id),
  vehicle_id uuid references vehicles(id),
  due_weekday text default 'monday',
  due_time text default '18:00',
  late_fee numeric(12,2) default 100,
  expected_amount numeric(12,2) default 0,
  notify boolean default true,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists vehicle_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  driver_id uuid references profiles(id),
  vehicle_id uuid references vehicles(id),
  review_month date not null,
  condition text check (condition in ('excellent', 'good', 'fair', 'poor')),
  notes text,
  reviewer_note text,
  photos jsonb default '[]'::jsonb,
  status text default 'submitted',
  created_at timestamptz default now()
);

create table if not exists checkouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  driver_id uuid references profiles(id),
  vehicle_id uuid references vehicles(id),
  km_out int,
  km_in int,
  status text default 'checked_out',
  created_at timestamptz default now(),
  returned_at timestamptz
);

create table if not exists incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  driver_id uuid references profiles(id),
  vehicle_id uuid references vehicles(id),
  logged_by uuid references profiles(id),
  kind text default 'incident',
  title text not null,
  severity text default 'medium',
  description text,
  amount numeric,
  photos jsonb default '[]'::jsonb,
  occurred_at timestamptz,
  status text default 'open',
  created_at timestamptz default now()
);

alter table incidents add column if not exists logged_by uuid;
alter table incidents add column if not exists kind text default 'incident';
alter table incidents add column if not exists photos jsonb default '[]'::jsonb;
alter table incidents add column if not exists occurred_at timestamptz;
alter table incidents add column if not exists amount numeric;

create table if not exists maintenance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  vehicle_id uuid references vehicles(id),
  title text not null,
  due_date date,
  interval_km int,
  interval_months int,
  last_service_odometer int,
  last_service_at timestamptz,
  completed_at timestamptz,
  completed_odometer int,
  slips jsonb default '[]'::jsonb,
  status text default 'scheduled',
  created_at timestamptz default now()
);

alter table maintenance add column if not exists interval_km int;
alter table maintenance add column if not exists interval_months int;
alter table maintenance add column if not exists last_service_odometer int;
alter table maintenance add column if not exists last_service_at timestamptz;
alter table maintenance add column if not exists completed_at timestamptz;
alter table maintenance add column if not exists completed_odometer int;
alter table maintenance add column if not exists slips jsonb default '[]'::jsonb;

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  title text not null,
  type text,
  category text,
  file_url text,
  uploaded_by uuid,
  uploaded_by_name text,
  created_at timestamptz default now()
);

alter table documents add column if not exists type text;
alter table documents add column if not exists description text;
alter table documents add column if not exists uploaded_by uuid;
alter table documents add column if not exists uploaded_by_name text;

create table if not exists supplies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  vehicle_id uuid references vehicles(id),
  name text,
  qty numeric(12,2) default 0,
  unit text default 'ea',
  location text,
  created_at timestamptz default now()
);

create table if not exists mechanics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  full_name text not null,
  trade text,
  phone text,
  workshop text,
  hours text,
  after_hours boolean default false,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists refuels (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  driver_id uuid references profiles(id),
  vehicle_id uuid references vehicles(id),
  litres numeric(10,2),
  amount numeric(12,2),
  station text,
  created_at timestamptz default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  user_id uuid references profiles(id) on delete cascade,
  title text,
  body text,
  read boolean default false,
  created_at timestamptz default now()
);

create table if not exists emails (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  key text,
  "to" text,
  subject text,
  body text,
  created_at timestamptz default now()
);

alter table roles add column if not exists company_id uuid references companies(id) on delete cascade;
alter table checkins add column if not exists company_id uuid references companies(id) on delete cascade;
alter table checkins add column if not exists driver_id uuid references profiles(id);
alter table checkins add column if not exists vehicle_id uuid references vehicles(id);
alter table expenses add column if not exists company_id uuid references companies(id) on delete cascade;
alter table checkin_schedules add column if not exists company_id uuid references companies(id) on delete cascade;
alter table checkin_schedules add column if not exists due_weekday text default 'monday';
alter table vehicle_reviews add column if not exists company_id uuid references companies(id) on delete cascade;
alter table vehicle_reviews add column if not exists reviewer_note text;
alter table checkouts add column if not exists company_id uuid references companies(id) on delete cascade;
alter table incidents add column if not exists company_id uuid references companies(id) on delete cascade;
alter table maintenance add column if not exists company_id uuid references companies(id) on delete cascade;
alter table documents add column if not exists company_id uuid references companies(id) on delete cascade;
alter table supplies add column if not exists company_id uuid references companies(id) on delete cascade;
alter table mechanics add column if not exists company_id uuid references companies(id) on delete cascade;
alter table refuels add column if not exists company_id uuid references companies(id) on delete cascade;
alter table notifications add column if not exists company_id uuid references companies(id) on delete cascade;
alter table notifications add column if not exists key text;
alter table notifications add column if not exists link text;
alter table notifications add column if not exists type text;
alter table emails add column if not exists company_id uuid references companies(id) on delete cascade;
alter table emails add column if not exists key text;

alter table companies enable row level security;
alter table profiles enable row level security;
alter table roles enable row level security;
alter table vehicles enable row level security;
alter table checkins enable row level security;
alter table expenses enable row level security;
alter table checkin_schedules enable row level security;
alter table vehicle_reviews enable row level security;
alter table checkouts enable row level security;
alter table incidents enable row level security;
alter table maintenance enable row level security;
alter table documents enable row level security;
alter table supplies enable row level security;
alter table mechanics enable row level security;
alter table refuels enable row level security;
alter table notifications enable row level security;
alter table emails enable row level security;

create index if not exists companies_status_idx on companies (status);
create index if not exists profiles_company_id_idx on profiles (company_id);
create index if not exists profiles_role_idx on profiles (role);
create index if not exists vehicles_company_id_idx on vehicles (company_id);
create index if not exists vehicles_assigned_driver_id_idx on vehicles (assigned_driver_id);
create index if not exists checkins_company_id_idx on checkins (company_id);
create index if not exists checkins_vehicle_id_idx on checkins (vehicle_id);
create index if not exists checkins_driver_id_idx on checkins (driver_id);
create index if not exists expenses_company_id_idx on expenses (company_id);
alter table vehicle_reviews add column if not exists reviewer_note text;

create index if not exists vehicle_reviews_vehicle_id_idx on vehicle_reviews (vehicle_id);
create index if not exists vehicle_reviews_company_id_idx on vehicle_reviews (company_id);
create index if not exists incidents_vehicle_id_idx on incidents (vehicle_id);
create index if not exists maintenance_vehicle_id_idx on maintenance (vehicle_id);

-- API uses the service role key, which bypasses RLS. No anon policies on purpose.
insert into storage.buckets (id, name, public)
values ('fleet21', 'fleet21', true)
on conflict (id) do update set public = true;

drop policy if exists "fleet21_public_read" on storage.objects;
create policy "fleet21_public_read"
on storage.objects for select
to public
using (bucket_id = 'fleet21');

drop policy if exists "fleet21_auth_insert" on storage.objects;
create policy "fleet21_auth_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'fleet21');

notify pgrst, 'reload schema';
