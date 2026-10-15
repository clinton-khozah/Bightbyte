create extension if not exists "pgcrypto";

create table if not exists companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  created_at timestamptz default now()
);

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'fleet_manager', 'driver', 'finance')),
  phone text,
  license_no text,
  status text default 'active',
  password_hash text,
  created_at timestamptz default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  registration text not null,
  make text,
  model text,
  year int,
  vin text,
  status text default 'available',
  odometer int default 0,
  assigned_driver_id uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists checkins (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  driver_id uuid references profiles(id),
  vehicle_id uuid references vehicles(id),
  amount numeric(12,2) not null,
  note text,
  proof_url text,
  odometer int,
  status text default 'submitted',
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
  title text not null,
  severity text default 'medium',
  description text,
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists maintenance (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  vehicle_id uuid references vehicles(id),
  title text not null,
  due_date date,
  status text default 'scheduled',
  created_at timestamptz default now()
);

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  title text not null,
  category text,
  file_url text,
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

alter table companies enable row level security;
alter table profiles enable row level security;
alter table vehicles enable row level security;
alter table checkins enable row level security;
alter table vehicle_reviews enable row level security;
alter table checkouts enable row level security;
alter table incidents enable row level security;
alter table maintenance enable row level security;
alter table documents enable row level security;
alter table refuels enable row level security;
