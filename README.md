# KHOJ — first working build

A responsive Next.js + React + TypeScript application based on KHOJ V1.5, with a working local demo and a separately implemented Supabase campus workspace for verified `@rvu.edu.in` owners. The Supabase project is not connected yet; no live student data has been collected or deployed.

## Run

Requires Node.js 22 or later.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. For a production build, run `npm run build` then `npm start`. Run `npm test` for validation, recovery-state, and database access tests. Run `npm run typecheck` for TypeScript validation.

## Working now

- Dashboard with a clearly labelled sample candidate and visual confidence ring.
- Item registration with 2–3 image uploads, category, optional brand, and private identifying description.
- Search and status filtering; mark an item lost with optional location/time.
- Public found-item photo and location submission, with optional local contact preference.
- Restricted unclaimed board. Public UI withholds identifying photos and exact locations.
- Blind ownership description, manual-claim source tracking, review approval/rejection, and verification history.
- Handover details after demo review, separate owner/finder confirmations, and a return state that requires both.
- Optional ₹20 thank-you, skip, and a direct UPI link; no payment processing or payment verification.
- Browser persistence, upload validation, responsive navigation, focus-managed native dialogs, and reduced-motion support.
- Two-step demo reset in Demo review.

## Try the recovery loop

1. Select **Review potential match** on Overview and describe a distinguishing mark.
2. Open **Demo review**, compare the description and sample evidence, and approve or reject.
3. For an approved claim, open **Recoveries** and confirm as each demo participant.
4. Once both confirmations are recorded, send an optional thank-you or skip it. Reload to check persistence.

For a new item, register two photos, mark it lost, submit a finder report, then claim it through Unclaimed board. All new reports intentionally go to the unclaimed board; no AI inference is simulated for uploads.

## Scope and remaining production work

Data lives in localStorage under `khoj-demo-v1`. Images are resized in-browser. This is not a secure multi-user data boundary: all roles are simulated in one browser. Do not use it for real student records. Data is not shared across devices, and simultaneous tabs are not synchronised.

The separate campus routes (`/login`, `/campus`, `/report`, `/finder`) use Supabase Auth, server-side user verification, PostgreSQL RPCs with row-level access policies, private Storage buckets, and opaque finder capability links. All PRD tables are included in the migrations. Candidate score components and verification attempts have separate fields/rows. Model and colour fields are available in the campus registration form. The demo stays separate and never silently sends its sample data to Supabase.

The database migrations passed local PGlite/PostgreSQL tests with representative Supabase roles and auth/storage schemas. A real Supabase instance, Auth email delivery, Storage service, and multi-device end-to-end flow have NOT yet been tested. Follow `docs/BACKEND.md` to connect the service and run those checks.

Still to build: validated vision matching, automated notifications beyond login emails, ranked-candidate expiry and notification scheduling, ambiguity review workflow, operational metrics, and deployment. New found reports enter the restricted unclaimed board; claims go through manual verification. The pure ambiguity-threshold helper is unit-tested but is not connected to a vision service. Custom CSS tokens currently provide styling in place of Tailwind.

Next milestone: connect a dedicated Supabase project, apply the migrations, configure email redirect URLs and a campus reviewer, then test the live owner/finder loop before launching the RV University pilot. Keep a second isolated browser for the finder test. Never publish the demo review controls as a real admin console.

Fonts load from Google Fonts with local system fallbacks. Product imagery and the visual concept were generated with the built-in Image Gen tool; project assets are under `public/` and `docs/`. See `docs/DESIGN.md` for the visual system and intentional differences.
