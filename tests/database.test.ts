import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("database enforces membership, privacy, review, return and reward boundaries", async () => {
  const db = new PGlite();
  const owner = "11111111-1111-4111-8111-111111111111",
    other = "22222222-2222-4222-8222-222222222222",
    admin = "33333333-3333-4333-8333-333333333333";
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
 create schema auth; create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema auth,public to anon,authenticated,service_role;
 grant execute on function auth.uid() to anon,authenticated,service_role;
 create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 grant usage on schema storage to authenticated; grant select,insert on storage.objects to authenticated;`);
    for (const file of [
      "202609280001_core.sql",
      "202609280002_storage.sql",
      "202609280003_finder_reward.sql",
    ])
      await db.exec(
        await readFile(
          new URL("../supabase/migrations/" + file, import.meta.url),
          "utf8",
        ),
      );
    await assert.rejects(
      db.query(
        `insert into auth.users values(gen_random_uuid(),'intruder@rvu.edu.in.evil.test',now())`,
      ),
      /college email/,
    );
    await db.query(
      `insert into auth.users values($1,'owner@rvu.edu.in',now()),($2,'other@rvu.edu.in',now()),($3,'reviewer@rvu.edu.in',now())`,
      [owner, other, admin],
    );
    await db.query(`insert into khoj_private.admins values($1)`, [admin]);
    async function asUser(uid: string, role = "authenticated") {
      await db.exec("reset role");
      await db.query(`select set_config('request.jwt.claim.sub',$1,false)`, [
        uid,
      ]);
      await db.exec("set role " + role);
    }
    await asUser(owner);
    await assert.rejects(
      db.query(
        `insert into public.items(user_id,name,category,unique_detail) values($1,'Fake','Audio','long enough detail')`,
        [owner],
      ),
      /permission denied/,
    );
    await assert.rejects(
      db.query(
        `select public.register_item('Earbuds','Audio','Scratch on left hinge',array['${other}/front.jpg','${other}/side.jpg'])`,
      ),
      /photo ownership/,
    );
    await assert.rejects(
      db.query(
        `select public.register_item('Earbuds','Audio','Scratch on left hinge',array['${owner}/front.jpg','${owner}/side.jpg'])`,
      ),
      /Upload the photo/,
    );
    await db.query(
      `insert into storage.objects(bucket_id,name) values('item-images',$1),('item-images',$2)`,
      [owner + "/front.jpg", owner + "/side.jpg"],
    );
    const item = (
      await db.query<{ id: string }>(
        `select public.register_item('Earbuds','Audio','Scratch on left hinge',array[$1,$2]) as id`,
        [owner + "/front.jpg", owner + "/side.jpg"],
      )
    ).rows[0].id;
    await db.query("select public.mark_item_lost($1)", [item]);
    await asUser(other);
    assert.equal(
      (await db.query("select * from public.items")).rows.length,
      0,
      "another owner cannot read the item or its private detail",
    );
    assert.equal(
      (await db.query("select * from storage.objects")).rows.length,
      0,
      "another owner cannot read image objects",
    );
    await assert.rejects(
      db.query("select public.mark_item_lost($1)", [item]),
      /Item not found/,
    );
    await assert.rejects(
      db.query("select * from public.found_reports"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.review_queue()"),
      /Reviewer access/,
    );
    await asUser("", "service_role");
    const token = "a".repeat(64);
    const report = (
      await db.query<{ id: string }>(
        `insert into public.found_reports(image_path,category,location,rough_location,finder_token_hash,status) values('report/private.jpg','Audio','Library desk 4','Library area',$1,'UNCLAIMED') returning id`,
        [token],
      )
    ).rows[0].id;
    await asUser(owner);
    const board = (
      await db.query<Record<string, unknown>>(
        "select * from public.unclaimed_board()",
      )
    ).rows[0];
    assert.deepEqual(
      Object.keys(board).sort(),
      ["category", "created_at", "id", "rough_location"],
      "board projects only safe columns",
    );
    const match = (
      await db.query<{ id: string }>(
        "select public.submit_claim($1,$2,$3) as id",
        [report, item, "Scratch on the left hinge"],
      )
    ).rows[0].id;
    await assert.rejects(
      db.query("select public.review_claim($1,true)", [match]),
      /Reviewer access/,
    );
    await assert.rejects(
      db.query("select public.submit_claim($1,$2,$3)", [
        report,
        item,
        "Scratch on the left hinge",
      ]),
      /not available/,
    );
    assert.equal(
      (await db.query("select * from public.recovery")).rows.length,
      0,
      "claim does not automatically verify",
    );
    await asUser(admin);
    assert.equal(
      (await db.query("select * from public.review_queue()")).rows.length,
      1,
    );
    await db.query("select public.review_claim($1,true)", [match]);
    await asUser(owner);
    const recovery = (
      await db.query<{ id: string }>("select id from public.recovery")
    ).rows[0].id;
    assert.equal(
      (
        await db.query<{ location: string }>(
          "select * from public.get_handover($1)",
          [recovery],
        )
      ).rows[0].location,
      "Library desk 4",
    );
    await assert.rejects(
      db.query("select public.set_reward_choice($1,false,$2)", [
        recovery,
        "finder@upi",
      ]),
      /Return must be completed/,
    );
    await assert.rejects(
      db.query(`update public.recovery set finder_confirmed=true`),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.confirm_finder_return($1,$2)", [report, token]),
      /permission denied/,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select public.confirm_owner_return($1) as status",
          [recovery],
        )
      ).rows[0].status,
      "HANDOVER",
    );
    await asUser(other);
    await assert.rejects(
      db.query("select public.confirm_owner_return($1)", [recovery]),
      /Recovery not found/,
    );
    await asUser("", "service_role");
    await assert.rejects(
      db.query("select public.confirm_finder_return($1,$2)", [
        report,
        "b".repeat(64),
      ]),
      /Invalid finder link/,
    );
    assert.equal(
      (
        await db.query<{ status: string }>(
          "select public.confirm_finder_return($1,$2) as status",
          [report, token],
        )
      ).rows[0].status,
      "RETURNED",
    );
    await asUser(owner);
    assert.equal(
      (await db.query<{ status: string }>("select status from public.items"))
        .rows[0].status,
      "RETURNED",
    );
    await db.query("select public.set_reward_choice($1,true)", [recovery]);
    assert.equal(
      (await db.query<{ status: string }>("select status from public.rewards"))
        .rows[0].status,
      "SKIPPED",
    );
    assert.equal(
      (await db.query<{ status: string }>("select status from public.recovery"))
        .rows[0].status,
      "RETURNED",
    );
    await db.query("select public.set_reward_choice($1,false,$2)", [
      recovery,
      "finder@upi",
    ]);
    await assert.rejects(
      db.query("select public.confirm_finder_reward($1,$2)", [report, token]),
      /permission denied/,
    );
    await asUser("", "service_role");
    await assert.rejects(
      db.query("select public.confirm_finder_reward($1,$2)", [
        report,
        "b".repeat(64),
      ]),
      /No pending thank-you/,
    );
    await db.query("select public.confirm_finder_reward($1,$2)", [
      report,
      token,
    ]);
    await asUser(owner);
    assert.equal(
      (await db.query<{ status: string }>("select status from public.rewards"))
        .rows[0].status,
      "PAID",
    );
    await asUser("", "anon");
    await assert.rejects(
      db.query("select * from public.users"),
      /permission denied/,
    );
    await assert.rejects(
      db.query("select public.unclaimed_board()"),
      /permission denied/,
    );
    await asUser("", "service_role");
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          `select public.consume_rate_limit('test',1,60) as ok`,
        )
      ).rows[0].ok,
      true,
    );
    assert.equal(
      (
        await db.query<{ ok: boolean }>(
          `select public.consume_rate_limit('test',1,60) as ok`,
        )
      ).rows[0].ok,
      false,
    );
  } finally {
    await db.close();
  }
});
