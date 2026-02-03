create table if not exists lifetime_offer (
  id int primary key default 1 check (id = 1),
  remaining int not null,
  updated_at timestamptz not null default now()
);
