create table if not exists users (
  id bigserial primary key,
  username text unique not null,
  password text not null
);

create table if not exists projects (
  id bigserial primary key,
  name text not null,
  description text default ''
);

create table if not exists tasks (
  id bigserial primary key,
  title text not null,
  description text default '',
  status text default 'Pendiente',
  priority text default 'Media',
  project_id bigint references projects(id) on delete set null,
  assigned_to bigint references users(id) on delete set null,
  due_date date,
  estimated_hours numeric default 0,
  actual_hours numeric default 0,
  created_by bigint references users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists comments (
  id bigserial primary key,
  task_id bigint references tasks(id) on delete cascade,
  user_id bigint references users(id) on delete set null,
  content text not null,
  created_at timestamptz default now()
);

create table if not exists history (
  id bigserial primary key,
  task_id bigint references tasks(id) on delete cascade,
  user_id bigint references users(id) on delete set null,
  action text not null,
  old_value text,
  new_value text,
  timestamp timestamptz default now()
);

create table if not exists notifications (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  message text not null,
  type text not null,
  read boolean default false,
  created_at timestamptz default now()
);
