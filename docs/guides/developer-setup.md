# Developer Setup & Contribution Guide

This guide provides step-by-step instructions to set up the **KHOJ V1.5** local development environment, run test workflows, and understand the project conventions.

---

## 1. System Requirements & Prerequisites

Ensure the following tools are installed on your machine:
* **Node.js**: `v18.17.0` or higher (Check with `node -v`)
* **npm**: `v9.0.0` or higher (Check with `npm -v`)
* **Git**: `v2.30.0` or higher
* Recommended IDE: **VS Code** or **Cursor** with the ESLint and Tailwind/CSS language server extensions.

---

## 2. Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ankit4563564/khoj.git
   cd khoj
   ```

2. **Install project dependencies:**
   ```bash
   npm install
   ```

3. **Verify the database file:**
   KHOJ uses a lightweight, self-contained JSON database located at:
   ```text
   data/khoj_database.json
   ```
   If this file is missing or empty, ensure it is initialized with valid JSON structure:
   ```json
   {
     "users": [
       {
         "id": "usr-1",
         "college_email": "student@campus.edu",
         "name": "Campus Student",
         "created_at": "2026-09-28T00:00:00Z"
       }
     ],
     "items": [],
     "found_reports": [],
     "matches": [],
     "verification": [],
     "recovery": [],
     "rewards": []
   }
   ```

4. **Start the local Next.js development server:**
   ```bash
   npm run dev
   ```
   The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 3. Available npm Scripts

| Script | Command | Purpose |
| :--- | :--- | :--- |
| `dev` | `next dev` | Starts the Next.js development server with Turbopack / Fast Refresh. |
| `build` | `next build` | Compiles the TypeScript source and produces an optimized production build. |
| `start` | `next start` | Runs the compiled production server. |
| `lint` | `next lint` | Executes Next.js ESLint rules across all `.ts` and `.tsx` source files. |

---

## 4. Key Workflows to Test Locally

### A. Registering an Item (Owner Flow)
1. Navigate to `/dashboard`.
2. Click **"Register New Item"**.
3. Fill in the item name, category (e.g., *Earbuds*), brand (*Apple*), model (*AirPods Pro 2*), colour, and importantly: **One Unique Detail** (e.g., *"Small scratch on left pod hinge and neon sticker on case"*).
4. Save the item. It should appear under your registered items list with status `SAFE`.

### B. Reporting a Found Item (Finder Flow)
1. Open an incognito browser window or navigate directly to `/found`.
2. Note that **no login** is requested.
3. Upload or choose a mock photo of the found item.
4. Select the location where it was spotted (e.g., *"Central Library 2nd Floor"*).
5. Add an optional rough description and submit.
6. The matching engine will immediately evaluate candidates in the background.

### C. Running Match Simulation in the Lab
1. Navigate to `/lab`.
2. Use the interactive sliders to alter scoring weights:
   * Unique Detail Similarity
   * Visual Similarity
   * Metadata / Brand Match
   * Location & Time Proximity
   * Registration Precedence
3. Trigger test runs against sample cases to inspect confidence score calculations and ambiguity warnings.

---

## 5. Code Style & Architectural Conventions

- **App Router:** All pages reside under `src/app/` following Next.js 14 App Router conventions.
- **State Management:** Global client state is coordinated via `src/lib/store.tsx` (React Context) which synchronizes with `src/app/api/db/route.ts` and `src/lib/serverDb.ts`.
- **Pure CSS Tokens:** Avoid arbitrary ad-hoc inline styles. Use the centralized CSS custom properties declared in `src/app/layout.tsx` (e.g., `var(--bg-primary)`, `var(--accent)`, `var(--card-bg)`).
- **TypeScript Strictness:** Strict types are enforced. Update interface definitions in `src/types/index.ts` whenever introducing new entity properties.
