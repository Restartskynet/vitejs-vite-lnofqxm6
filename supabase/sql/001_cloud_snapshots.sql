create table if not exists cloud_snapshots (
  user_id text not null,
  device_id text not null,
  rev bigint not null default 0,
  ciphertext text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id)
);
