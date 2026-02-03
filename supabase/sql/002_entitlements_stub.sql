create table if not exists entitlements (
  user_id text not null,
  plan text not null,
  status text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);
