begin;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('item-images','item-images',false,10485760,array['image/jpeg','image/png','image/webp']),
       ('found-images','found-images',false,10485760,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
-- Found images are uploaded by the server only. No client policies for that bucket.
create policy khoj_owner_image_insert on storage.objects for insert to authenticated
with check(bucket_id='item-images' and split_part(name,'/',1)=(select auth.uid())::text
 and exists(select 1 from public.users where id=(select auth.uid())));
create policy khoj_owner_image_read on storage.objects for select to authenticated
using(bucket_id='item-images' and split_part(name,'/',1)=(select auth.uid())::text);
-- No UPDATE/DELETE: evidence cannot be replaced after registration.
create function khoj_private.validate_image_object() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if not exists(select 1 from storage.objects where bucket_id='item-images' and name=new.image_path) then
  raise exception 'Upload the photo before registering it' using errcode='23514';
 end if;
 return new;
end $$;
revoke all on function khoj_private.validate_image_object() from public,anon,authenticated;
create trigger khoj_image_exists before insert on public.item_images for each row execute function khoj_private.validate_image_object();
commit;
