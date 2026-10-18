begin;
create extension if not exists pgtap;
select plan(14);

insert into auth.users (id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated', 'elara-rls-a@example.invalid', 'not-a-real-password-hash', now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Test","last_name":"A"}', now(), now()),
  ('20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated', 'elara-rls-b@example.invalid', 'not-a-real-password-hash', now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Test","last_name":"B"}', now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select lives_ok($$insert into public.brands (id, owner_id, name) values ('30000000-0000-4000-8000-000000000003', auth.uid(), 'Brand A')$$, 'owner can insert a brand');
select lives_ok($$insert into public.social_profiles (id, owner_id, brand_id, platform, handle) values ('40000000-0000-4000-8000-000000000004', auth.uid(), '30000000-0000-4000-8000-000000000003', 'Instagram', '@a')$$, 'owner can link a social profile to their brand');
select lives_ok($$insert into public.contents (id, owner_id, brand_id, social_profile_id, title, platform, format, status) values ('50000000-0000-4000-8000-000000000005', auth.uid(), '30000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000004', 'Post A', 'Instagram', 'Post', 'idea')$$, 'owner can link content to their brand and profile');
select is((select count(*)::integer from public.brands), 1, 'owner can select their brand');
select lives_ok($$update public.brands set name = 'Brand A updated' where id = '30000000-0000-4000-8000-000000000003'$$, 'owner can update their brand');

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
select lives_ok($$insert into public.brands (id, owner_id, name) values ('60000000-0000-4000-8000-000000000006', auth.uid(), 'Brand B')$$, 'second owner can insert their brand');
select lives_ok($$insert into public.social_profiles (id, owner_id, brand_id, platform, handle) values ('70000000-0000-4000-8000-000000000007', auth.uid(), '60000000-0000-4000-8000-000000000006', 'Instagram', '@b')$$, 'second owner can insert their profile');
select is((select count(*)::integer from public.brands where id = '30000000-0000-4000-8000-000000000003'), 0, 'second owner cannot select first owner brand');
select is((select count(*)::integer from public.social_profiles where id = '40000000-0000-4000-8000-000000000004'), 0, 'second owner cannot select first owner profile');
select is((select count(*)::integer from public.contents where id = '50000000-0000-4000-8000-000000000005'), 0, 'second owner cannot select first owner content');
select throws_ok($$insert into public.contents (owner_id, brand_id, social_profile_id, title, platform, format, status) values (auth.uid(), '60000000-0000-4000-8000-000000000006', '40000000-0000-4000-8000-000000000004', 'Cross profile', 'Instagram', 'Post', 'idea')$$, '23503', null, 'owner cannot link content to another owner profile');
select throws_ok($$insert into public.social_profiles (owner_id, brand_id, platform, handle) values (auth.uid(), '30000000-0000-4000-8000-000000000003', 'Instagram', '@cross')$$, '23503', null, 'owner cannot link a profile to another owner brand');

set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select is((select count(*)::integer from public.brands), 0, 'anonymous role cannot select private brands');
select throws_ok($$insert into public.contents (owner_id, title, platform, format, status) values ('10000000-0000-4000-8000-000000000001', 'Anonymous', 'Instagram', 'Post', 'idea')$$, '42501', null, 'anonymous role cannot insert private content');
select * from finish();
rollback;
