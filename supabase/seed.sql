-- Optional DEMO seed. Tag is_demo = true so it is easy to delete.
-- After you are done testing: delete from activities where is_demo; delete from athletes where is_demo;

insert into public.athletes (id, name, is_demo)
values
  ('11111111-1111-1111-1111-111111111111', 'Demo — Kavya', true),
  ('22222222-2222-2222-2222-222222222222', 'Demo — Rohan', true),
  ('33333333-3333-3333-3333-333333333333', 'Demo — Anika', true)
on conflict (id) do nothing;

insert into public.payments (athlete_id, challenge_id, status)
values
  ('11111111-1111-1111-1111-111111111111', 'short', 'paid'),
  ('11111111-1111-1111-1111-111111111111', 'main', 'paid'),
  ('22222222-2222-2222-2222-222222222222', 'short', 'paid'),
  ('22222222-2222-2222-2222-222222222222', 'main', 'paid'),
  ('33333333-3333-3333-3333-333333333333', 'main', 'paid')
on conflict (athlete_id, challenge_id) do nothing;

insert into public.activities (athlete_id, activity_type, activity_date, duration_seconds, admin_note, status, is_demo)
values
  ('11111111-1111-1111-1111-111111111111', 'running', '2026-11-14', 4320, 'DEMO data', 'approved', true),
  ('11111111-1111-1111-1111-111111111111', 'cycling', '2026-11-14', 2400, 'DEMO: second activity same day', 'approved', true),
  ('22222222-2222-2222-2222-222222222222', 'football', '2026-11-14', 5400, 'DEMO data', 'approved', true),
  ('33333333-3333-3333-3333-333333333333', 'swimming', '2026-11-15', 2700, 'DEMO data', 'approved', true);

-- Remove demo rows:
-- delete from public.activities where is_demo = true;
-- delete from public.athletes where is_demo = true;
