# KHOJ — RV University Lost & Found

A campus-only lost-and-found application for @rvu.edu.in students, with private ownership claims and staff-managed custody and handovers. Built with Next.js, React, TypeScript, and persistent SQLite.

## Start locally

Use Node.js 24 LTS.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev -- --hostname 127.0.0.1 --port 3100
```

Open http://127.0.0.1:3100. Development email previews let you exercise signup and verification without a mail provider. No shared demo login or seeded campus reports are enabled.

See [RVU setup and deployment](docs/RVU_SETUP.md) for student verification, staff provisioning, service credentials, hosting requirements, test commands, and migration notes.

## Routes

- `/` and `/about`: campus introduction
- `/dashboard`: searchable live lost-and-found board
- `/report/lost` and `/report/found`: reports and photo upload
- `/items/[id]`: item detail and private ownership claim
- `/status`: personal reports, matches and claims
- `/hod`: authorised staff custody, review and handover console
- `/signup`, `/login`, `/verify`, `/forgot`, `/reset`: account lifecycle

## Production setup still required

Configure a verified email sender, provision authorised RVU staff, and select hosting with persistent disk. Google OAuth and Gemini photo analysis are optional server-side integrations requiring their own credentials. Those external services are not simulated. This is a student-built service, not an assertion of official RV University approval.
