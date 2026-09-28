begin;
create function public.confirm_finder_reward(p_report uuid,p_token_hash text) returns void
language plpgsql security definer set search_path='' as $$
declare reward_id uuid;
begin
 select w.id into reward_id from public.rewards w join public.recovery r on r.id=w.recovery_id join public.matches m on m.id=r.match_id join public.found_reports f on f.id=m.found_report_id
 where f.id=p_report and f.finder_token_hash=p_token_hash and r.status='RETURNED' and w.status='PENDING' for update of w;
 if reward_id is null then raise exception 'No pending thank-you for this finder' using errcode='42501'; end if;
 update public.rewards set status='PAID' where id=reward_id;
end $$;
revoke execute on function public.confirm_finder_reward(uuid,text) from public,anon,authenticated;
grant execute on function public.confirm_finder_reward(uuid,text) to service_role;
commit;
