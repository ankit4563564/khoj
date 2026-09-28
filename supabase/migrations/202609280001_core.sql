-- KHOJ V1.5 / RV University pilot. Apply to a dedicated Supabase project.
-- Direct client writes are disabled. Mutations use narrowly scoped RPCs.
begin;
create schema if not exists khoj_private;
revoke all on schema khoj_private from public, anon, authenticated;

create table public.users (
 id uuid primary key references auth.users(id) on delete cascade,
 college_email text not null unique check (lower(split_part(college_email,'@',2)) = 'rvu.edu.in'),
 name text not null check (length(name) between 1 and 100),
 created_at timestamptz not null default now()
);
create table khoj_private.admins (user_id uuid primary key references public.users(id) on delete cascade);

create function khoj_private.sync_college_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
 if new.email is null or lower(split_part(new.email,'@',2)) <> 'rvu.edu.in' then
   raise exception 'A college email at rvu.edu.in is required' using errcode='23514';
 end if;
 if new.email_confirmed_at is not null then
   insert into public.users(id,college_email,name)
   values(new.id,lower(new.email),left(split_part(new.email,'@',1),100))
   on conflict(id) do update set college_email=excluded.college_email;
 end if;
 return new;
end $$;
create trigger khoj_college_user after insert or update of email,email_confirmed_at on auth.users
for each row execute function khoj_private.sync_college_user();

create table public.items (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references public.users(id) on delete cascade,
 name text not null check(length(btrim(name)) between 1 and 80),
 category text not null check(category in ('Audio','Drinkware','Bag','Electronics','Keys','Watch','Other')),
 brand text check(length(brand)<=80), model text check(length(model)<=80), colour text check(length(colour)<=50),
 unique_detail text not null check(length(btrim(unique_detail)) between 8 and 500),
 status text not null default 'SAFE' check(status in ('SAFE','LOST','RETURNED')),
 created_at timestamptz not null default now()
);
create index items_owner_idx on public.items(user_id);
create index items_lost_search_idx on public.items(category,brand,colour) where status='LOST';
create table public.item_images (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references public.items(id) on delete cascade,
 image_path text not null unique, type text not null default 'reference',
 created_at timestamptz not null default now()
);
create index item_images_item_idx on public.item_images(item_id);
create table public.lost_reports (
 id uuid primary key default gen_random_uuid(), item_id uuid not null references public.items(id) on delete cascade,
 location text check(length(location)<=120), lost_at timestamptz,
 created_at timestamptz not null default now()
);
create index lost_reports_item_idx on public.lost_reports(item_id,created_at desc);
create table public.found_reports (
 id uuid primary key default gen_random_uuid(), image_path text not null unique,
 category text not null default 'Other' check(category in ('Audio','Drinkware','Bag','Electronics','Keys','Watch','Other')),
 location text not null check(length(btrim(location)) between 1 and 120),
 rough_location text not null check(rough_location in ('Library area','Academic area','Campus area')),
 finder_phone text check(length(finder_phone)<=30),
 finder_token_hash text not null check(finder_token_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'FOUND' check(status in ('FOUND','MATCHING','POTENTIAL_MATCH','VERIFICATION','VERIFIED','HANDOVER','RETURNED','AMBIGUOUS','MANUAL_REVIEW','NO_MATCH','UNCLAIMED')),
 created_at timestamptz not null default now()
);
create index found_reports_queue_idx on public.found_reports(status,created_at desc);
create table public.matches (
 id uuid primary key default gen_random_uuid(), found_report_id uuid not null references public.found_reports(id),
 item_id uuid not null references public.items(id),
 score numeric check(score between 0 and 100), visual_score numeric check(visual_score between 0 and 100),
 unique_detail_score numeric check(unique_detail_score between 0 and 100), context_score numeric check(context_score between 0 and 100),
 rank integer not null check(rank>0), source text not null check(source in ('ai_match','manual_claim')),
 status text not null default 'POTENTIAL_MATCH' check(status in ('POTENTIAL_MATCH','VERIFICATION','VERIFIED','REJECTED','NO_RESPONSE')),
 created_at timestamptz not null default now(),
 unique(found_report_id,item_id), unique(id,found_report_id),
 check(source <> 'ai_match' or (score is not null and visual_score is not null and unique_detail_score is not null and context_score is not null))
);
create index matches_item_idx on public.matches(item_id);
create index matches_report_idx on public.matches(found_report_id,rank);
create unique index one_verified_match_per_report on public.matches(found_report_id) where status='VERIFIED';
create unique index one_verified_match_per_item on public.matches(item_id) where status='VERIFIED';
create table public.verification (
 id uuid primary key default gen_random_uuid(), match_id uuid not null, found_report_id uuid not null,
 owner_answer text not null check(length(btrim(owner_answer)) between 8 and 500),
 result text not null default 'pending' check(result in ('pending','matched','rejected','no_response')),
 attempt_number integer not null check(attempt_number>0), created_at timestamptz not null default now(),
 foreign key(match_id,found_report_id) references public.matches(id,found_report_id),
 unique(found_report_id,attempt_number)
);
create index verification_match_idx on public.verification(match_id);
create unique index one_pending_attempt_per_match on public.verification(match_id) where result='pending';
create table public.recovery (
 id uuid primary key default gen_random_uuid(), match_id uuid not null unique references public.matches(id),
 owner_confirmed boolean not null default false, finder_confirmed boolean not null default false,
 status text not null default 'HANDOVER' check(status in ('HANDOVER','RETURNED')),
 returned_at timestamptz,
 check((status='RETURNED')=(owner_confirmed and finder_confirmed)),
 check((status='RETURNED')=(returned_at is not null))
);
create table public.rewards (
 id uuid primary key default gen_random_uuid(), recovery_id uuid not null unique references public.recovery(id),
 amount integer not null default 20 check(amount=20), finder_upi text check(length(finder_upi)<=100),
 status text not null default 'NOT_OFFERED' check(status in ('NOT_OFFERED','OFFERED','SKIPPED','PENDING','PAID')),
 created_at timestamptz not null default now()
);
create table khoj_private.rate_limits (bucket text primary key,window_start timestamptz not null,hits integer not null);

create function khoj_private.require_member() returns uuid language plpgsql stable security definer set search_path='' as $$
declare uid uuid := auth.uid();
begin
 if uid is null or not exists(select 1 from public.users where id=uid) then
   raise exception 'Verified college membership required' using errcode='42501';
 end if;
 return uid;
end $$;
create function khoj_private.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from khoj_private.admins where user_id=auth.uid());
$$;

-- Even where a client has SELECT, RLS limits records to that item's owner.
alter table public.users enable row level security;
alter table public.items enable row level security;
alter table public.item_images enable row level security;
alter table public.lost_reports enable row level security;
alter table public.found_reports enable row level security;
alter table public.matches enable row level security;
alter table public.verification enable row level security;
alter table public.recovery enable row level security;
alter table public.rewards enable row level security;
revoke all on public.users,public.items,public.item_images,public.lost_reports,public.found_reports,public.matches,public.verification,public.recovery,public.rewards from public,anon,authenticated;
grant select on public.users,public.items,public.item_images,public.lost_reports,public.matches,public.verification,public.recovery,public.rewards to authenticated;
grant all on public.users,public.items,public.item_images,public.lost_reports,public.found_reports,public.matches,public.verification,public.recovery,public.rewards to service_role;
create policy own_profile on public.users for select to authenticated using(id=(select auth.uid()));
create policy own_items on public.items for select to authenticated using(user_id=(select auth.uid()));
create policy own_images on public.item_images for select to authenticated using(exists(select 1 from public.items i where i.id=item_id and i.user_id=(select auth.uid())));
create policy own_lost_reports on public.lost_reports for select to authenticated using(exists(select 1 from public.items i where i.id=item_id and i.user_id=(select auth.uid())));
create policy own_matches on public.matches for select to authenticated using(exists(select 1 from public.items i where i.id=item_id and i.user_id=(select auth.uid())));
create policy own_verification on public.verification for select to authenticated using(exists(select 1 from public.matches m join public.items i on i.id=m.item_id where m.id=match_id and i.user_id=(select auth.uid())));
create policy own_recovery on public.recovery for select to authenticated using(exists(select 1 from public.matches m join public.items i on i.id=m.item_id where m.id=match_id and i.user_id=(select auth.uid())));
create policy own_rewards on public.rewards for select to authenticated using(exists(select 1 from public.recovery r join public.matches m on m.id=r.match_id join public.items i on i.id=m.item_id where r.id=recovery_id and i.user_id=(select auth.uid())));

create function public.register_item(p_name text,p_category text,p_detail text,p_images text[],p_brand text default null,p_model text default null,p_colour text default null)
returns uuid language plpgsql security definer set search_path='' as $$
declare uid uuid := khoj_private.require_member(); item uuid; photo text;
begin
 if coalesce(cardinality(p_images),0) not between 2 and 3 then raise exception 'Two or three photos are required' using errcode='23514'; end if;
 foreach photo in array p_images loop
   if photo is null or split_part(photo,'/',1)<>uid::text or photo like '%..%' then raise exception 'Invalid photo ownership' using errcode='42501'; end if;
 end loop;
 insert into public.items(user_id,name,category,unique_detail,brand,model,colour) values(uid,btrim(p_name),p_category,btrim(p_detail),p_brand,p_model,p_colour) returning id into item;
 insert into public.item_images(item_id,image_path) select item,unnest(p_images);
 return item;
end $$;
create function public.mark_item_lost(p_item uuid,p_location text default null,p_lost_at timestamptz default null)
returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=khoj_private.require_member(); current_status text;
begin
 select status into current_status from public.items where id=p_item and user_id=uid for update;
 if current_status is null then raise exception 'Item not found' using errcode='42501'; end if;
 if current_status<>'SAFE' then raise exception 'Item is not in a safe state' using errcode='23514'; end if;
 update public.items set status='LOST' where id=p_item;
 insert into public.lost_reports(item_id,location,lost_at) values(p_item,p_location,p_lost_at);
end $$;

create function public.unclaimed_board() returns table(id uuid,category text,rough_location text,created_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
 perform khoj_private.require_member();
 return query select f.id,f.category,f.rough_location,f.created_at from public.found_reports f where f.status='UNCLAIMED' order by f.created_at desc limit 100;
end $$;
create function public.submit_claim(p_report uuid,p_item uuid,p_answer text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=khoj_private.require_member(); report_status text; candidate uuid; n integer;
begin
 select status into report_status from public.found_reports where id=p_report for update;
 if report_status is distinct from 'UNCLAIMED' then raise exception 'Report is not available for a claim' using errcode='23514'; end if;
 if not exists(select 1 from public.items where id=p_item and user_id=uid and status='LOST') then raise exception 'A registered lost item belonging to you is required' using errcode='42501'; end if;
 insert into public.matches(found_report_id,item_id,rank,source,status)
 values(p_report,p_item,1,'manual_claim','VERIFICATION') returning id into candidate;
 select coalesce(max(attempt_number),0)+1 into n from public.verification where found_report_id=p_report;
 insert into public.verification(match_id,found_report_id,owner_answer,attempt_number) values(candidate,p_report,btrim(p_answer),n);
 update public.found_reports set status='MANUAL_REVIEW' where id=p_report;
 return candidate;
end $$;
create function public.submit_verification(p_match uuid,p_answer text) returns uuid
language plpgsql security definer set search_path='' as $$
declare uid uuid:=khoj_private.require_member(); candidate public.matches; result_id uuid; n integer; report_status text;
begin
 select m.* into candidate from public.matches m join public.items i on i.id=m.item_id where m.id=p_match and i.user_id=uid;
 if candidate.id is null then raise exception 'Match not found' using errcode='42501'; end if;
 select status into report_status from public.found_reports where id=candidate.found_report_id for update;
 select * into candidate from public.matches where id=p_match for update;
 if candidate.status<>'POTENTIAL_MATCH' or report_status<>'POTENTIAL_MATCH' then raise exception 'Match is not awaiting verification' using errcode='23514'; end if;
 if exists(select 1 from public.matches where found_report_id=candidate.found_report_id and rank<candidate.rank and status not in ('REJECTED','NO_RESPONSE')) then raise exception 'Higher ranked candidate is still active' using errcode='23514'; end if;
 select coalesce(max(attempt_number),0)+1 into n from public.verification where found_report_id=candidate.found_report_id;
 insert into public.verification(match_id,found_report_id,owner_answer,attempt_number) values(p_match,candidate.found_report_id,btrim(p_answer),n) returning id into result_id;
 update public.matches set status='VERIFICATION' where id=p_match;
 update public.found_reports set status='MANUAL_REVIEW' where id=candidate.found_report_id;
 return result_id;
end $$;

create function public.review_claim(p_match uuid,p_approve boolean) returns void
language plpgsql security definer set search_path='' as $$
declare candidate public.matches; found_id uuid;
begin
 if not khoj_private.is_admin() then raise exception 'Reviewer access required' using errcode='42501'; end if;
 select found_report_id into found_id from public.matches where id=p_match;
 perform 1 from public.found_reports where id=found_id for update;
 select * into candidate from public.matches where id=p_match for update;
 if candidate.id is null or candidate.status<>'VERIFICATION' then raise exception 'No verification to review' using errcode='23514'; end if;
 if not exists(select 1 from public.verification where match_id=p_match and result='pending') then raise exception 'No pending evidence' using errcode='23514'; end if;
 update public.verification set result=case when p_approve then 'matched' else 'rejected' end where match_id=p_match and result='pending';
 update public.matches set status=case when p_approve then 'VERIFIED' else 'REJECTED' end where id=p_match;
 if p_approve then
   insert into public.recovery(match_id) values(p_match);
   update public.found_reports set status='HANDOVER' where id=found_id;
 else
   update public.found_reports set status=case when exists(select 1 from public.matches where found_report_id=found_id and status='POTENTIAL_MATCH') then 'POTENTIAL_MATCH' else 'UNCLAIMED' end where id=found_id;
 end if;
end $$;

create function khoj_private.record_confirmation(p_recovery uuid,p_role text) returns text
language plpgsql security definer set search_path='' as $$
declare rec public.recovery; candidate public.matches;
begin
 select * into rec from public.recovery where id=p_recovery for update;
 if rec.id is null then raise exception 'Recovery not found' using errcode='23514'; end if;
 if rec.status='RETURNED' then return rec.status; end if;
 if p_role='owner' then rec.owner_confirmed:=true;
 elsif p_role='finder' then rec.finder_confirmed:=true;
 else raise exception 'Invalid participant' using errcode='23514'; end if;
 rec.status:=case when rec.owner_confirmed and rec.finder_confirmed then 'RETURNED' else 'HANDOVER' end;
 update public.recovery set owner_confirmed=rec.owner_confirmed,finder_confirmed=rec.finder_confirmed,status=rec.status,returned_at=case when rec.status='RETURNED' then now() else null end where id=p_recovery;
 if rec.status='RETURNED' then
   select * into candidate from public.matches where id=rec.match_id;
   update public.items set status='RETURNED' where id=candidate.item_id;
   update public.found_reports set status='RETURNED' where id=candidate.found_report_id;
   insert into public.rewards(recovery_id) values(p_recovery) on conflict(recovery_id) do nothing;
 end if;
 return rec.status;
end $$;
create function public.confirm_owner_return(p_recovery uuid) returns text
language plpgsql security definer set search_path='' as $$
declare uid uuid:=khoj_private.require_member();
begin
 if not exists(select 1 from public.recovery r join public.matches m on m.id=r.match_id join public.items i on i.id=m.item_id where r.id=p_recovery and i.user_id=uid) then raise exception 'Recovery not found' using errcode='42501'; end if;
 return khoj_private.record_confirmation(p_recovery,'owner');
end $$;
-- Only the server may call this with a SHA-256 hash of a finder capability token.
create function public.confirm_finder_return(p_report uuid,p_token_hash text) returns text
language plpgsql security definer set search_path='' as $$
declare rec uuid;
begin
 select r.id into rec from public.recovery r join public.matches m on m.id=r.match_id join public.found_reports f on f.id=m.found_report_id where f.id=p_report and f.finder_token_hash=p_token_hash;
 if rec is null then raise exception 'Invalid finder link or recovery not ready' using errcode='42501'; end if;
 return khoj_private.record_confirmation(rec,'finder');
end $$;
create function public.set_reward_choice(p_recovery uuid,p_skip boolean,p_upi text default null) returns void
language plpgsql security definer set search_path='' as $$
declare uid uuid:=khoj_private.require_member(); rec public.recovery;
begin
 if p_skip is null then raise exception 'Reward choice is required' using errcode='23514'; end if;
 select r.* into rec from public.recovery r join public.matches m on m.id=r.match_id join public.items i on i.id=m.item_id where r.id=p_recovery and i.user_id=uid for update of r;
 if rec.id is null then raise exception 'Recovery not found' using errcode='42501'; end if;
 if rec.status<>'RETURNED' then raise exception 'Return must be completed before reward' using errcode='23514'; end if;
 if not p_skip and (p_upi is null or p_upi !~ '^[A-Za-z0-9._-]+@[A-Za-z0-9]+$') then raise exception 'Invalid UPI ID' using errcode='23514'; end if;
 update public.rewards set status=case when p_skip then 'SKIPPED' else 'PENDING' end,finder_upi=case when p_skip then null else p_upi end where recovery_id=p_recovery and status<>'PAID';
end $$;
create function public.get_handover(p_recovery uuid) returns table(report_id uuid,location text,status text)
language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=khoj_private.require_member();
begin
 return query select f.id,f.location,r.status from public.recovery r join public.matches m on m.id=r.match_id join public.items i on i.id=m.item_id join public.found_reports f on f.id=m.found_report_id where r.id=p_recovery and i.user_id=uid and m.status='VERIFIED';
end $$;
create function public.review_queue() returns table(match_id uuid,item_name text,registered_detail text,owner_answer text,found_image_path text,found_location text)
language plpgsql stable security definer set search_path='' as $$
begin
 if not khoj_private.is_admin() then raise exception 'Reviewer access required' using errcode='42501'; end if;
 return query select m.id,i.name,i.unique_detail,v.owner_answer,f.image_path,f.location from public.matches m join public.items i on i.id=m.item_id join public.verification v on v.match_id=m.id join public.found_reports f on f.id=m.found_report_id where v.result='pending' order by v.created_at limit 100;
end $$;
create function public.consume_rate_limit(p_bucket text,p_limit integer,p_window_seconds integer) returns boolean
language plpgsql security definer set search_path='' as $$
declare count_now integer;
begin
 if length(p_bucket)>200 or p_limit<1 or p_window_seconds<1 then raise exception 'Invalid rate limit'; end if;
 insert into khoj_private.rate_limits(bucket,window_start,hits) values(p_bucket,now(),1)
 on conflict(bucket) do update set
 hits=case when khoj_private.rate_limits.window_start < now()-make_interval(secs=>p_window_seconds) then 1 else khoj_private.rate_limits.hits+1 end,
 window_start=case when khoj_private.rate_limits.window_start < now()-make_interval(secs=>p_window_seconds) then now() else khoj_private.rate_limits.window_start end
 returning hits into count_now;
 return count_now<=p_limit;
end $$;

revoke all on all functions in schema khoj_private from public,anon,authenticated;
-- Explicit function grants: PostgreSQL defaults EXECUTE to PUBLIC, so revoke it.
revoke execute on function public.register_item(text,text,text,text[],text,text,text),public.mark_item_lost(uuid,text,timestamptz),public.unclaimed_board(),public.submit_claim(uuid,uuid,text),public.submit_verification(uuid,text),public.review_claim(uuid,boolean),public.confirm_owner_return(uuid),public.confirm_finder_return(uuid,text),public.set_reward_choice(uuid,boolean,text),public.get_handover(uuid),public.review_queue(),public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.register_item(text,text,text,text[],text,text,text),public.mark_item_lost(uuid,text,timestamptz),public.unclaimed_board(),public.submit_claim(uuid,uuid,text),public.submit_verification(uuid,text),public.review_claim(uuid,boolean),public.confirm_owner_return(uuid),public.set_reward_choice(uuid,boolean,text),public.get_handover(uuid),public.review_queue() to authenticated;
grant execute on function public.confirm_finder_return(uuid,text),public.consume_rate_limit(text,integer,integer) to service_role;
commit;
