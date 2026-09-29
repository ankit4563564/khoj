# KHOJ — PHASE 0: Codebase Architecture Audit & Technical Discovery

**Role**: Lead Backend Architect  
**Project**: KHOJ (Campus Lost-and-Found Recovery Platform for RV University)  
**Date**: September 29, 2026  
**Status**: Completed (Audit Only — Zero UI or Behavioral Modifications)

---

## 1. Current Architecture

### Frontend
- **Framework & Router**: Next.js 15.5 (App Router), React 18, TypeScript 5.7, Vanilla CSS (`rvu.css`).
- **State Management**: React Context via [`PortalProvider.tsx`](file:///c:/Users/Mannuuu/Desktop/khoj/src/components/rvu/PortalProvider.tsx) polling and dispatching mutations to `/api/rvu`.
- **Primary Pages & Routes**:
  - `/` & `/about`: Redesigned *RU Lost in RVU?* landing experience.
  - `/board`: Public campus discovery board with live filters.
  - `/report/lost`: Authenticated owner lost-item submission form.
  - `/report/found`: Zero-login 10-second finder reporting flow.
  - `/my-items`: Pre-loss asset registration vault (`protected_items`).
  - `/items/[id]`: Item inspection & ownership claim interface.
  - `/status`: Claim tracking and dual-confirmation return handshake.
  - `/login`, `/signup`, `/forgot`, `/reset`: Authentication flow.

### Backend
- **Runtime**: Node.js 22+ (`export const runtime = "nodejs"`).
- **API Surface**:
  - [`/api/rvu/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/route.ts): Monolithic dispatcher handling auth, report creation, claims, and notification polling.
  - [`/api/rvu/public/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/public/route.ts): Unauthenticated public finder ingest and student ID scans.
  - [`/api/rvu/items/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/items/route.ts): Protected asset vault operations, mark lost, blind verification, and recovery confirmation.
  - [`/api/rvu/upload/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/upload/route.ts): Multipart image ingestion with magic-byte validation.
  - [`/api/rvu/images/[id]/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/images/[id]/route.ts): Protected image streaming.
  - [`/api/rvu/vision/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/vision/route.ts): Photo analysis endpoint calling Gemini.
  - [`/api/rvu/google/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/google/route.ts): University Google OAuth verification.

### Database & Storage
- **Primary Engine**: Local SQLite (`DatabaseSync` via `node:sqlite`) in [`src/lib/rvu/db.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/lib/rvu/db.ts) (with `/tmp/rvu.sqlite` fallback for Vercel serverless).
- **Tables**: `users`, `sessions`, `tokens`, `uploads`, `reports`, `claims`, `matches`, `notifications`, `audit`, `rate_limits`, `identity_links`, `campus_directory`, `identity_audit`, `guest_sessions`, `found_ids`, `protected_items`, `activity`, `handovers`, `blind_attempts`.
- **Image Storage**: Direct binary `BLOB` in SQLite `uploads` table.
- **Supabase**: Dependencies (`@supabase/supabase-js`, `@supabase/ssr`) are installed, and helper clients exist in `src/lib/supabase/`, but Supabase is **not yet connected as the primary persistence or vector store**.

### AI & Heuristics
- **Vision**: Direct HTTP call to Google Gemini 2.5 Flash in [`vision/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/vision/route.ts) returning structured metadata (`title`, `category`, `color`, `brand`, `description`).
- **Matching**: Rule-based keyword overlap & string similarity in [`db.ts:scoreReports()`](file:///c:/Users/Mannuuu/Desktop/khoj/src/lib/rvu/db.ts#L161-L185).

---

## 2. Existing Relevant Features

| Feature | Status | Details |
| :--- | :--- | :--- |
| **Item Registration** | **EXISTS** | Implemented in [`MyItems.tsx`](file:///c:/Users/Mannuuu/Desktop/khoj/src/components/rvu/MyItems.tsx) and [`/api/rvu/items`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/items/route.ts) (`protected_items` table with private secret clues). |
| **Item Image Upload** | **EXISTS** | Implemented via [`/api/rvu/upload`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/upload/route.ts) (validates file size < 5MB and JPEG/PNG/WebP magic bytes). |
| **Found Item Reporting** | **EXISTS** | Implemented via [`/api/rvu/public`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/public/route.ts) (anonymous finder guest session, zero-login, 10s flow). |
| **Authentication** | **EXISTS** | Cookie session management (`rvu_session`), university email verification via Resend, and Google OAuth callback. |
| **Vision Analysis** | **EXISTS** | Implemented via Gemini 2.5 Flash in [`/api/rvu/vision`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/vision/route.ts). |
| **Match Notifications** | **EXISTS** | SQLite `notifications` table dispatches alerts to owner inboxes and in-app bell. |
| **Supabase Storage** | **MISSING** | Currently storing image BLOBs directly in SQLite. |
| **Embeddings** | **MISSING** | Neither text nor image embeddings are implemented. |
| **pgvector** | **MISSING** | No vector extension or vector database is active. |
| **Semantic Matching** | **MISSING** | Currently using Jaccard word-overlap and token matching. |

---

## 3. Missing Pieces

1. **Dual Fingerprint Schema**:
   - Lack of structured, canonical `item_fingerprint` representation (combining visual descriptors, extracted OCR marks, category, color, model, and vector embeddings).
2. **Embeddings Pipeline**:
   - No multimodal embedding provider configured (e.g., text-embedding-3 or Gemini multimodal embeddings).
3. **Supabase Postgres & pgvector Foundation**:
   - The production app still writes to SQLite. Supabase Postgres with the `vector` extension needs to be provisioned and connected.
4. **Candidate Retrieval & Reranking Architecture**:
   - Currently runs a sequential full table scan on `reports`. Needs a two-stage retrieval pipeline:
     1. Stage 1: Coarse retrieval (ANN cosine vector search + categorical filter).
     2. Stage 2: Fine-grained feature comparison and confidence scoring.
5. **Separation of Evidence vs Decision**:
   - Hardcoded scoring thresholds directly trigger matches instead of storing an explainable evidence score card that the application uses for gated verification.

---

## 4. Technical Debt & Problems/Risks

1. **Database Scalability & Ephemeral Filesystem**:
   - Vercel/serverless environments have read-only or ephemeral `/tmp` filesystems. Storing SQLite files and multi-megabyte image `BLOB`s on disk is fragile and does not persist across container lifecycles.
2. **Dual Database Drift**:
   - The project contains orphaned code referencing `data/khoj_database.json` ([`src/lib/serverDb.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/lib/serverDb.ts)), while active code uses SQLite ([`src/lib/rvu/db.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/lib/rvu/db.ts)).
3. **Hardcoded Fallback Data in Vision Endpoint**:
   - When `GEMINI_API_KEY` is missing or fails, [`vision/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/vision/route.ts#L78-L84) returns a hardcoded generic "Identified Campus Item / Electronics" payload, which can pollute candidate matching.
4. **Memory Footprint of Image Uploads**:
   - Images are loaded completely into Node process memory (`Buffer.from(await file.arrayBuffer())`) and stored as raw bytes in SQLite rather than streaming to an object storage bucket.
5. **No AI Safety Boundaries**:
   - Prompt in `vision/route.ts` lacks defensive guardrails against prompt injection from text written on found objects.

---

## 5. Minimum Architecture for Fingerprints & Candidate Retrieval

```
[ OWNER REGISTRATION / REPORT ]
   Natural Language & Photos
               │
               ▼
   [ Feature Extractor ]
   - Standardize category, brand, color, distinguishing marks
   - Generate Text Embedding (768d / 1536d)
               │
               ▼
   [ DB: item_fingerprints ]
   (Postgres / Supabase with pgvector)


[ FINDER IMAGE UPLOAD ]
   Found Photo + Campus Location
               │
               ▼
   [ Vision Analyzer & Quality Check ]
   - Extract visual attributes, brand logos, condition
   - Generate Multimodal / Image Embedding
               │
               ▼
   [ DB: found_fingerprints ]


[ TWO-STAGE CANDIDATE MATCHING ENGINE ]
               │
   1. Fast Coarse Retrieval:
      - ANN vector search (<=> cosine distance) + category/location filter
      - Returns Top 20 Candidates
               │
   2. Deterministic Reranker & Confidence Gate:
      - Weighted scoring: Attribute Match (30%) + Vector Similarity (40%) + Unique Clue Alignment (30%)
      - Candidate Gating:
          Score >= 80%: High Confidence Match Candidate
          55% - 79%: Ambiguous / Low Confidence Candidate
          < 55%: Discard
               │
   3. Application Control Gate (CRITICAL RULE):
      - AI never declares ownership.
      - System prompts owner with Blind Verification Question ("Describe the unique mark").
      - Handover unlocked only after successful verification.
```

---

## 6. Recommended Implementation Order

1. **Step 1: Data Contracts & Types**
   - Define TypeScript interfaces for `ItemFingerprint`, `FoundFingerprint`, `CandidateScoreCard`, and `VerificationEvidence`.
2. **Step 2: Database Migration Strategy**
   - Connect Supabase Postgres with `pgvector` enabled and create tables for fingerprints and candidate matches, or add vector schema support.
3. **Step 3: Feature Extraction Service**
   - Standardize text and visual attribute extraction to produce structured fingerprints.
4. **Step 4: Vector Embedding Generation**
   - Implement unified embedding generator for text descriptions and found image features.
5. **Step 5: Two-Stage Matching Engine**
   - Implement coarse ANN retrieval followed by the deterministic reranking pipeline.
6. **Step 6: Blind Verification Protocol**
   - Connect candidate scores to the existing blind verification and safe recovery handover flow.

---

## 7. Files Impact Analysis

### Files That Will Need Modification (in subsequent phases)
- [`src/lib/rvu/types.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/lib/rvu/types.ts): Add fingerprint, vector, and candidate evidence types.
- [`src/lib/rvu/db.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/lib/rvu/db.ts) (or dedicated Supabase service): Add fingerprint tables and vector query methods.
- [`src/app/api/rvu/vision/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/vision/route.ts): Enhance extraction to output standardized visual fingerprints.
- [`src/lib/matchingEngine.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/lib/matchingEngine.ts): Replace simulated heuristics with two-stage candidate retrieval and scoring logic.
- [`src/app/api/rvu/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/route.ts) & [`src/app/api/rvu/public/route.ts`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/api/rvu/public/route.ts): Trigger fingerprinting and match evaluation on item report ingestion.

### Files That Should NOT Be Touched
- [`src/components/rvu/About.tsx`](file:///c:/Users/Mannuuu/Desktop/khoj/src/components/rvu/About.tsx): Redesigned *RU Lost in RVU?* landing experience.
- [`src/components/rvu/Shell.tsx`](file:///c:/Users/Mannuuu/Desktop/khoj/src/components/rvu/Shell.tsx): Brand identity and mobile navigation shell.
- [`src/styles/rvu.css`](file:///c:/Users/Mannuuu/Desktop/khoj/src/styles/rvu.css): Active visual styling and animations.
- [`src/app/page.tsx`](file:///c:/Users/Mannuuu/Desktop/khoj/src/app/page.tsx): Root page entry point.
- [`src/components/rvu/MotionPrimitives.tsx`](file:///c:/Users/Mannuuu/Desktop/khoj/src/components/rvu/MotionPrimitives.tsx): Framer Motion primitives.

---

## 8. Critical Product Principle
> **The AI must NEVER directly decide: "This item belongs to this student."**
> 
> The AI solely generates structured perceptual evidence (visual attributes, OCR text, candidate similarity vectors).
> The deterministic application controls candidate ranking, confidence gates, blind clue verification prompts, and physical handoff confirmations.
