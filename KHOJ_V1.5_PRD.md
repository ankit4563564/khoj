# KHOJ — Minimal Campus MVP

**Version:** V1.5
**Product:** KHOJ
**Pilot:** Single College
**Goal:** Lost item ko uske actual owner tak minimum steps mein wapas pahunchana — aur poora experience visually smooth, premium aur zero-friction feel hona chahiye.

---

## 1. Product in One Line

> **KHOJ helps students find the owner of a lost item using a photo, AI matching, and simple ownership verification — through an interface that feels crafted, not templated.**

---

# 2. Core Flow

```text
OWNER
  ↓
Register Item
  ↓
Item Gets Lost
  ↓
Mark Item Lost
  ↓
FINDER
  ↓
Upload Photo + Location
  ↓
KHOJ AI Match
  ↓
Potential Owner Found
  ↓
OWNER Verifies Ownership
  ↓
Handover
  ↓
Both Confirm Return
  ↓
Optional ₹20 Thank-you
```

**Primary goal:** successful recovery.

Reward is only an incentive and never blocks recovery.

---

# 3. Users

## Owner

A college student who owns an item.

Owner can:

* Login
* Register items
* Mark an item lost
* Verify a potential match
* Confirm receiving the item
* Optionally send ₹20 to the finder

## Finder

A person who finds an item.

Finder does **not** need:

* Account
* Login
* Password
* OTP

Finder only needs to:

1. Upload item photo
2. Select where it was found
3. Submit

Optionally, finder can provide a phone number for case updates.

---

# 4. Owner Flow

## Step 1 — Login

Use official college email.

Example:

```text
student@college.edu
```

No complicated onboarding.

---

## Step 2 — Register Item

Student adds an important belonging.

Required:

* Item name
* Category
* 2–3 photos
* One unique identifying detail

Optional:

* Brand
* Model
* Colour

Example:

```text
Item: AirPods Pro
Category: Earbuds

Photos:
1. Front
2. Side
3. Charging case

Unique detail:
"Small scratch near the left earbud hinge."
```

### Why the unique detail matters

Many physical products look identical.

AI visual similarity is used to **find candidates**, not to prove ownership.

---

# 5. Mark Item Lost

When an item is lost:

```text
My Items
   ↓
AirPods Pro
   ↓
[Mark as Lost]
```

Optional:

* Last seen location
* Approximate time

Once marked lost, the item becomes eligible for matching.

---

# 6. Finder Flow

The finder gets a simple public page:

```text
FOUND SOMETHING?

[ Upload Photo ]

Where did you find it?

[ Select Location ]

[ Submit Found Item ]
```

That's it.

No registration.

No login.

No OTP.

No profile.

---

# 7. Finder Reward

The reward is shown as an incentive:

> **Help return the item and receive a ₹20 thank-you.**

However, KHOJ does not collect money during the recovery process.

After the item is successfully returned:

```text
Item Returned ✓

Thank your finder?

[ ₹20 Thank You ]   [ Skip ]
```

If the owner chooses ₹20:

```text
Enter Finder UPI ID

[ Pay ₹20 ]
```

The owner pays directly through their UPI app.

KHOJ does not:

* Hold money
* Create a wallet
* Use escrow
* Process payments
* Guarantee payment

The reward is completely separate from recovery.

---

# 8. Finder Notifications

Finder can optionally enter a phone number after submitting the report.

```text
Want updates about this item?

Phone Number
[____________]

[Get Updates]
```

No OTP in V1.

The number is attached only to that found-item case.

If the finder does not provide a phone number, the report still works, but KHOJ cannot proactively notify them.

The owner's identity and private information are never exposed to the finder unnecessarily.

---

# 9. AI Matching

When a found item is submitted:

```text
Found Photo
     ↓
Image Quality Check
     ↓
Visual Matching
     ↓
Registered Items
     ↓
Metadata Filtering
     ↓
Candidate
```

The system considers:

### Visual

* Overall appearance
* Shape
* Colour
* Distinctive marks
* Scratches
* Unique details

### Context

* Category
* Brand
* Location
* Time
* Lost status

The AI should generate **candidate matches**, not claim certainty.

Each candidate's score is stored as a breakdown, not a single number — see Section 20A.

---

# 10. Identical Item Problem

Example:

100 students may own the same AirPods model.

Therefore:

```text
Same Model
     ≠
Same Physical Item
     ≠
Same Owner
```

KHOJ solves this using:

```text
Visual Match
     +
Unique Detail
     +
Location/Time
     +
Blind Verification
```

### Ambiguity threshold *(defined)*

If **two or more candidates score above 85% match confidence** for the same found report, KHOJ does not auto-notify multiple owners.

```text
2+ candidates ≥ 85%
        ↓
Status = AMBIGUOUS
        ↓
Routed to Manual Review (Section 17)
```

This threshold is a starting hypothesis for the pilot and should be tuned after real match-score data is collected (Section 23).

---

# 11. Ownership Verification

When KHOJ finds a potential match:

Owner receives:

> **Potential match found for one of your lost items.**

The owner is asked to describe the item's unique identifying detail.

Example:

> "Describe any distinctive mark, damage, sticker, engraving or accessory associated with your item."

Owner answers:

> "There is a small scratch near the left hinge."

KHOJ compares the answer with the registered information and available evidence.

If the found report produced multiple ranked candidates, the owner may go through this step more than once — see Section 12A.

---

# 12. Blind Verification

The owner should **not see all identifying information from the found report before verification.**

This prevents someone from simply reading the answer and claiming an item.

Additional evidence may include:

* Unique damage
* Engraving
* Serial number
* Receipt
* Private previous photo
* Distinctive accessory

Only after sufficient verification should detailed handover information be revealed.

---

# 12A. Multiple Verification Attempts *(new)*

A single found report can generate more than one ranked candidate (Section 9). The owner of each candidate item may be asked to verify, one at a time, in ranked order — starting with the highest-scoring candidate.

```text
Found Report
     ↓
Candidate 1 (highest score) → Owner asked to verify
     ↓
   Match?  ──Yes──→ VERIFIED → proceed to handover
     │
     No / No response within reasonable time
     ↓
Candidate 2 → Owner asked to verify
     ↓
   ... and so on
```

Every verification attempt — successful or not — is logged separately (Section 20A), so KHOJ can measure **verification attempts per successful match** as a pilot metric (Section 25).

---

# 13. Recovery

Once ownership is verified:

```text
VERIFIED
   ↓
Arrange Handover
   ↓
Owner receives item
   ↓
Finder confirms returned
   ↓
RETURNED
```

There is **no payment requirement before handover.**

The item is returned first.

---

# 14. Return Confirmation

Both sides confirm:

### Owner

> **I Received My Item**

### Finder

> **I Returned The Item**

Once both confirm:

```text
Status = RETURNED
```

Recovery does not depend on the ₹20 reward.

---

# 15. ₹20 Thank-you

After `RETURNED`:

```text
🎉 Item recovered!

Want to thank the finder?

₹20

[ Pay ₹20 ]   [ Skip ]
```

If the owner chooses Pay:

```text
Finder UPI ID
      ↓
Owner pays directly
      ↓
Finder confirms
      ↓
Reward recorded
```

Reward status:

```text
NOT_OFFERED
OFFERED
SKIPPED
PENDING
PAID
```

This is separate from recovery status.

This moment (Section 26A) should carry the most visual celebration in the entire product — it's the emotional payoff.

---

# 16. No-Match Flow

If KHOJ cannot find a strong match:

```text
Found Item
    ↓
No Strong Match
    ↓
Restricted Unclaimed Board
```

The board can show:

* Category
* Rough location
* Limited/cropped image

Do not show:

* Owner information
* Exact location
* Private metadata
* Full identifying details

### Claim flow *(defined)*

A student can claim an item from the Unclaimed board. This does not silently return the item — it re-enters the standard verification pipeline:

```text
Student clicks "This is mine"
        ↓
New matches row created:
  found_report_id = the unclaimed report
  item_id         = the student's registered item they claim it matches
  source          = "manual_claim" (vs. "ai_match")
        ↓
Same blind verification process as Section 11–12
        ↓
VERIFIED → Handover → RETURNED
```

A manual claim is never auto-verified — it goes through the identical ownership-proof step as an AI-suggested match, so a false claim cannot bypass verification.

---

# 17. Manual Fallback

AI does not need to be perfect for the pilot.

Admin can manually search:

```text
Category
Brand
Colour
Location
Date
Lost Status
```

This ensures cases can still be resolved when AI matching is uncertain, and is also where Ambiguous cases (Section 10) land for review.

---

# 18. Admin Dashboard

Only the minimum operational data is required.

Admin can see:

```text
Students
Registered Items
Lost Items
Found Reports
Potential Matches
Ambiguous Cases
Manual Reviews
Verified Matches
Returned Items
Rewards
```

Admin actions:

* Review candidate
* Resolve ambiguous match
* Confirm false match
* Search manually
* Assist recovery
* Update case status

---

# 19. Case Status

Keep the state machine simple:

```text
FOUND
  ↓
MATCHING
  ↓
POTENTIAL_MATCH
  ↓
VERIFICATION
  ↓
VERIFIED
  ↓
HANDOVER
  ↓
RETURNED
```

Alternative paths:

```text
POTENTIAL_MATCH
      ↓
AMBIGUOUS
      ↓
MANUAL_REVIEW
```

or

```text
MATCHING
   ↓
NO_MATCH
   ↓
UNCLAIMED
   ↓
(student claims)
   ↓
POTENTIAL_MATCH  ← re-enters pipeline via Section 16
```

Reward status is tracked separately.

---

# 20. Minimal Database

### users

```text
id
college_email
name
created_at
```

### items

```text
id
user_id
name
category
brand
model
colour
unique_detail
status
created_at
```

### item_images

```text
id
item_id
image_url
type
```

### lost_reports

```text
id
item_id
location
lost_at
created_at
```

### found_reports

```text
id
image_url
location
finder_phone
status
created_at
```

### matches *(updated)*

```text
id
found_report_id
item_id
score                  -- overall aggregate, 0-100
visual_score           -- overall visual similarity component
unique_detail_score    -- unique-detail similarity component
context_score          -- brand/category/location/time/lost-status component
rank                   -- 1 = top candidate for this found_report, 2, 3...
source                 -- "ai_match" | "manual_claim"
status
created_at
```

### verification *(updated — one row per attempt, not per match)*

```text
id
match_id               -- FK to the specific candidate being verified
found_report_id         -- denormalized, so all attempts for one report can be queried together
owner_answer
result                 -- "matched" | "rejected" | "no_response"
attempt_number          -- 1st, 2nd, 3rd candidate tried for this found_report
created_at
```

### recovery

```text
id
match_id
owner_confirmed
finder_confirmed
status
returned_at
```

### rewards

```text
id
recovery_id
amount
finder_upi
status
created_at
```

---

# 20A. Why the Schema Changed *(new)*

* **`matches` now stores a score breakdown, not just one number.** The pilot's entire purpose is to learn which signal (visual vs. unique-detail vs. context) actually predicts a correct match. A single aggregate score throws that data away — it can never be reconstructed after the fact.
* **`verification` is now one row per attempt, tied to a specific `match_id`, with `attempt_number`.** An owner may reject candidate 1 and be shown candidate 2 (Section 12A). Without this, "verification attempts per successful match" (a named pilot metric) has nothing to compute from.
* **`matches.source` distinguishes AI-suggested candidates from manually claimed ones** (Section 16), so the Unclaimed board's claim flow has a concrete database representation instead of being a UI-only concept.

---

# 21. Tech Stack

Keep the architecture boring.

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Next.js server/API routes

### Database

* Supabase PostgreSQL

### Authentication

* Supabase Auth
* College email

### Storage

* Supabase Storage

### AI

Use an existing visual matching/vision service after a small validation test.

**Do not train a custom model for V1.**

### Deployment

* Vercel

### Notifications

Start with the simplest available channel.

Email can be used for the first pilot.

SMS/WhatsApp can be added once the workflow is validated.

---

# 22. What We Are NOT Building

To keep V1 minimal:

❌ Mobile app
❌ BLE
❌ GPS hardware
❌ NFC
❌ QR hardware
❌ IoT tags
❌ Finder accounts
❌ Finder OTP
❌ Complex chat
❌ Wallet
❌ Payment gateway
❌ Escrow
❌ Marketplace
❌ Leaderboards
❌ Points
❌ Badges
❌ Nationwide network
❌ Custom AI model
❌ Microservices

---

# 23. Pre-Build Validation

Before building the complete AI system, run a small test.

Take multiple physical items:

* Earbuds
* Bottles
* Bags
* Chargers
* Watches

For each item, capture:

* Different angles
* Different lighting
* Different backgrounds
* With/without distinctive marks

Test whether the selected vision service can distinguish:

```text
Same Product Model
        vs
Different Physical Item
```

If visual matching is weak, increase the importance of:

* Unique details
* Location
* Time
* Brand
* Category
* Lost status

Use this test's results to set the initial score weights (visual/unique-detail/context) and re-validate the 85% ambiguity threshold (Section 10) before going live.

Only proceed with the full matching architecture after this validation.

---

# 24. Pilot

Start with **one college**.

Target:

```text
50 Students
   ↓
3–5 Items / Student
   ↓
150–250 Registered Items
```

Run the pilot through:

* College WhatsApp groups
* Posters
* Student volunteers
* High-loss locations

Every real case should be recorded.

---

# 25. Primary Metric

The only metric that really matters:

## Successful Recovery Rate

```text
Found Item
    ↓
Correct Owner
    ↓
Returned
```

Measure:

```text
Successful Recoveries
────────────────────── × 100
Found Reports
```

Secondary metrics:

* Found reports
* Match rate
* Verification success
* Verification attempts per successful match
* False match rate
* Average recovery time
* Finder participation
* ₹20 reward acceptance

---

# 26. Design Direction *(new)*

The product must never feel like a generic AI-generated template. Every screen should feel deliberately designed, smooth, and premium — this is as important to the pilot's success as the matching logic, since students will judge trustworthiness partly by how polished the product looks.

## 26.1 Visual Identity

* **Pick one distinct accent colour** that carries campus/youth energy — avoid the default purple-to-blue gradient overused by AI page builders. Consider a warm, bold single colour (coral, amber, or a deep teal) used consistently across every primary CTA and status indicator.
* **Typography with contrast:** a distinctive display/heading font paired with a clean, neutral body font. Avoid using a single default system font (e.g. plain Inter) for everything — that contrast is often what separates "designed" from "templated."
* **Icon set:** use a consistent, proper icon library (e.g. Lucide or Phosphor, one stroke-weight throughout) instead of emoji in the production UI. Emoji are fine as PRD shorthand only.
* **Consider dark mode as the primary theme** given the target audience (college students) — it tends to read as more premium and app-like than a plain white background for this demographic.

## 26.2 Micro-interactions

* Buttons: subtle scale-down (~0.97) plus a shadow/elevation change on press — not just a flat colour swap.
* Page/screen transitions: slide or fade, never an instant hard cut.
* Loading states: skeleton screens instead of spinners — spinners read as low-effort.
* Form inputs: a smooth, animated focus ring/border transition rather than an abrupt colour snap.
* Success moments (item verified, item returned): one well-crafted animation (e.g. a checkmark draw-in or light confetti) — reserved for genuinely significant moments only, so it doesn't dilute into being cheap or repetitive.

## 26.3 Flow-Specific Treatment

* **Match confidence** should be shown as a visual element (radial progress ring, gradient bar) rather than raw percentage text alone.
* **Unclaimed board** (Section 16) should feel like a curated gallery — grid/masonry layout with a hover-lift effect — not a dumping ground of leftover photos.
* **Recovery + reward moment** (Sections 14–15) is the emotional peak of the entire product and should receive the most visual polish and celebratory detail of any screen — this is the "it actually worked" payoff that will drive word-of-mouth during the pilot.

## 26.4 Practical Note

When actual screens are built (React components, HTML mockups, or artifacts), use available frontend design guidance for spacing, typography pairing, and design tokens so nothing defaults to a templated look. Build one flagship screen (e.g. the match/verification screen or the recovery celebration screen) first as the visual benchmark the rest of the product is built to match.

---

# 27. Product Principle

KHOJ should feel like this:

### Owner

> "I lost something."

**KHOJ:**

> "Register it once. We'll help identify it if someone finds it."

### Finder

> "I found something."

**KHOJ:**

> "Upload a photo. We'll find who it belongs to."

That's the entire product — delivered through an interface that feels effortless and crafted, never generic.

---

# 28. Final MVP Definition

KHOJ V1 is complete when:

> A student registers an important item → marks it lost → another person finds it and uploads a photo without creating an account → KHOJ identifies a potential owner (with a transparent score breakdown stored for later tuning) → the owner proves ownership through blind verification, possibly across multiple candidates → both parties complete the handover → the item is marked returned → the owner can optionally send the finder ₹20 — and every step of this feels smooth, visually polished, and intentional rather than templated.

**Everything that does not directly help this loop should stay out of V1.**
