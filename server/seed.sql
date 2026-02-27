insert into users (username, password) values
  ('admin', 'admin'),
  ('user1', 'user1'),
  ('user2', 'user2')
on conflict (username) do nothing;

insert into projects (name, description) values
  ('Proyecto Demo', 'Proyecto de ejemplo'),
  ('Proyecto Alpha', 'Proyecto importante'),
  ('Proyecto Beta', 'Proyecto secundario')
on conflict do nothing;
