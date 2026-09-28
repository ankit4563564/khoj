# RV University backend

## Connection

The campus domain is fixed to `rvu.edu.in` in application validation and the SQL membership trigger. Subdomains and lookalike suffixes are rejected. Finder reports require no login.

1. Use a **dedicated Supabase project** for KHOJ. The migration installs an Auth trigger that rejects non-college accounts, so it must not be applied to a shared unrelated project.
2. Apply `supabase/migrations/202609280001_core.sql`, `202609280002_storage.sql`, and `202609280003_finder_reward.sql` in that order using the Supabase CLI or SQL editor. The migrations are transactional and versioned; do not rerun a successfully applied migration manually.
3. Copy `.env.example` to `.env.local`. Set the Supabase project URL, publishable key, server-only service-role key, canonical site URL, and a randomly generated 32+ character rate-limit secret. Do not commit `.env.local` or expose the service-role key to the browser. Do not paste secret keys into chat.
4. In Supabase Auth, enable email sign-in, require confirmation, and allow the exact callback `${NEXT_PUBLIC_SITE_URL}/auth/callback`. Use the standard PKCE-compatible confirmation URL in the magic-link email template. Configure production SMTP before inviting the pilot.
5. Restart/rebuild Next.js after changing environment configuration. Visit `/login` and verify an actual `@rvu.edu.in` mailbox.
6. After the reviewer has signed in, insert their user ID into `khoj_private.admins` through the SQL editor or another trusted server administration channel. Clients cannot assign this role. Example, substituting an actual verified reviewer email:

```sql
insert into khoj_private.admins(user_id)
select id from public.users where college_email = 'reviewer@rvu.edu.in';
```

No hosted project was created or modified during this build. Configuration is required before live sign-in, photos, and reports work.

## Routes and boundaries

- `/` and `/items`, `/found`, `/board`, `/review`, `/recovery`: local demo only, labelled sample data.
- `/login`: RVU magic-link sign-in. Disabled until the backend is configured.
- `/campus`: server-authenticated owner workspace; registration, claims, review, handover and rewards use authenticated RPCs.
- `/report`: anonymous live finder intake; bounded multipart body, photo validation, metadata stripping, private upload, durable rate limit.
- `/finder#reportId=…&token=…`: private finder capability. The token is 256 bits, kept in the fragment to avoid putting it in server URL logs, and stored only as a SHA-256 hash in the database. It is bearer access: preserve and do not share it.
- `/api/owner/*`: verified college user required. The reviewer RPC independently checks the trusted admin table.
- `/api/reports` and `/api/finder`: no finder account; service-role use is restricted to validated server operations.

Owner reads are protected by RLS. Client direct writes are revoked; narrowly granted security-definer functions validate the caller and state. Each function has an empty search path and schema-qualified table references. The public board is a minimal projection: category, coarse area, time, and report ID. It never exposes private photos, contact details, token hashes, or ownership evidence.

Registered item images must already exist in the private owner-scoped bucket. Clients cannot overwrite or delete registered evidence. Orphaned uploads from failed registration are cleaned up server-side. Signed photo URLs expire after five minutes for owners and two minutes for reviewers; refreshing the workspace fetches new URLs.

Return confirmations are transactional. The authenticated owner can only confirm their own receipt. The finder needs their private token and an existing verified recovery. Both flags are required before RETURNED and a reward record can exist. Owners cannot record a finder payment acknowledgement. A finder can acknowledge only a pending thank-you on their returned case; this is an acknowledgement, not verification by a payment provider.

On Vercel, the server uses Vercel's forwarded client IP header for rate-limit grouping and HMACs identifiers before database storage. Outside Vercel, anonymous callers share a conservative local bucket rather than trusting arbitrary proxy headers. Configure a trusted ingress strategy before using another production host. Rate-limit records need periodic retention cleanup for a longer-lived deployment.

## Validation performed

`npm test` runs actual SQL migrations in PGlite, using representative `anon`, `authenticated`, and `service_role` roles with Supabase auth/storage schema stubs. Assertions cover domain restrictions, owner isolation, private photo access, denied direct mutations, blind board projection, admin-only review, token checks, dual confirmation, rewards after return, payment acknowledgement permissions, and rate limiting.

This validates PostgreSQL rules, not a hosted Supabase deployment. Next.js build/type checking passed. HTTP tests exercised invalid college emails, malformed requests, cross-origin rejection, safe 503 responses when unconfigured, and no-store headers. Desktop/mobile browser checks exercised the demo recovery loop and unconfigured login/campus screens.

Before live pilot: test real magic-link delivery, auth session refresh/sign-out, uploaded photo authorization, two distinct student accounts, a separate finder browser, admin privileges, concurrent claims/confirmations, quota/error recovery, and notification/coordination procedures. No AI or automatic notifications should be advertised until connected and evaluated.

## Official references used

- [Supabase server-side client and session refresh](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs)
- [Supabase row-level security, grants and testing](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
