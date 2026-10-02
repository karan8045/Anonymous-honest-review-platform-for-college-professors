# CampusAnon — Anonymous Honest Review Platform for Colleges & Universities

A persistent, pseudonymous review platform designed for university students to share unvarnished feedback on institutions and faculty with **zero personally identifiable information (Zero-PII)**.

---

## 🛡️ Core Philosophy: Zero-PII & Pseudonymity

- **No Email Required**: Accounts are created with **Username + Password + Country + College / University**.
- **No Phone or SMS**: Completely eliminates phone number collection or verification trackers.
- **No Real Names or Student IDs**: Students interact under their chosen public pseudonym (e.g. `@campusvoice`, `@anonymous_karan`).
- **Irreversible Password Architecture**:
  > **Important Rule**: Because accounts do not collect email addresses or phone numbers for account recovery, forgetting a password means permanently losing access to that account.
  > 
  > During onboarding, users are warned prominently and must actively acknowledge:
  > `[x] I understand that my password cannot be recovered if I lose it.`
- **Strict Rating Uniqueness**: Enforced via database-level `UNIQUE(user_id, institution_id)` constraint — exactly **one numeric rating per user per college**.
- **Unlimited Opinions**: Students can post unlimited honest opinions. Published reviews cannot be deleted by users, preserving review integrity.

---

## 🚀 Sign-Up & Onboarding Progression

The onboarding experience is a smooth multi-step wizard:

1. **Step 1 — Create your anonymous identity**:
   - Username input with real-time debounced availability check.
   - Allowed: 3–30 characters, alphanumeric and underscores only.
   - Quick example chips (`student_x`, `campusvoice`, `anonymous_21`).
2. **Step 2 — Create your password**:
   - Password + Confirm Password with visibility toggles.
   - Password-strength indicator.
   - Prominent irreversible password warning banner + mandatory acknowledgement checkbox.
3. **Step 3 — Where do you study?**:
   - Comprehensive dropdown of countries and territories with flags (India, US, UK, Canada, Australia, etc.).
4. **Step 4 — Find your college/university**:
   - Live, debounced autocomplete prioritized by selected country.
   - Supports partial names, word-order independence (e.g., *"South Bihar Central"* matches *"Central University of South Bihar"*), and common abbreviations (*CUSB*, *MIT*, *IITB*, *DU*).
   - Highlights matching characters directly in suggestions.
   - **`+ Not Available — Add manually`**: Always-available fallback option allowing students to manually submit institutions. Internally flagged as `source: 'user_submitted'`, `verified: false`.
5. **Step 5 — Confirm Information**:
   - Review anonymous profile (`@username`, Country, College).
   - Click **Create Anonymous Account**.
6. **Step 6 — Account Created**:
   - Success screen (`🎉 Your anonymous account has been created.`) and direct entry to platform.

---

## 🔑 Returning Users (Sign In)

- Sign In using **Username** and **Password** only.
- Persistent session via secure `httpOnly` cookies (30-day session lifetime).
- Clear reminder on Sign In screen:
  > *Forgot your password? Because your account is anonymous and does not use email or phone recovery, a forgotten password cannot be recovered.*

---

## 🗄️ Database Model (Supabase / PostgreSQL)

See [`schema.sql`](file:///Users/karan/Github/Anonymous%20honest%20review%20platform%20for%20college%20professors/schema.sql) for the complete migration script including Row Level Security (RLS) policies.

- **`auth.users`**: Managed internally or via Supabase Auth.
- **`profiles`**:
  - `id` (UUID references auth.users)
  - `username` (TEXT UNIQUE)
  - `country` (TEXT)
  - `institution_id` (UUID references institutions)
  - `created_at`, `updated_at`
- **`institutions`**:
  - `id` (UUID)
  - `name` (TEXT)
  - `country` (TEXT)
  - `city` (TEXT)
  - `source` (`'official_database'` | `'user_submitted'` | `'owner_added'`)
  - `verified` (BOOLEAN)
- **`ratings`**:
  - `id` (UUID)
  - `institution_id` (UUID references institutions)
  - `user_id` (UUID references auth.users)
  - `score` (INTEGER 1–5)
  - **`UNIQUE(user_id, institution_id)`**
- **`opinions`**:
  - `id` (UUID)
  - `institution_id` (UUID references institutions)
  - `user_id` (UUID references auth.users)
  - `content` (TEXT, 10–3000 chars)
  - `created_at`, `updated_at` (No user delete operation)

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS with custom dark mode & animations
- **Security**: `bcryptjs` password hashing, signed HMAC session tokens, httpOnly cookies
- **Icons**: Lucide React
- **Data Layer**: File-persisted JSON database (`.data/db.json`) + full Supabase PostgreSQL `schema.sql` with RLS.

---

## 🧪 Testing & Verification

Run the automated test suite:

```bash
npm test
```

This verifies:
1. Username length and character format rules.
2. Real-time availability check and case-insensitive uniqueness.
3. College autocomplete by country, partial tokens, word-order independence, and abbreviations (*CUSB*, *CURAJ*, *MIT*, *IIT*).
4. Password hashing with bcrypt.
5. Strict 1-rating-per-user-per-college uniqueness constraint.
6. Unlimited anonymous opinions with public pseudonym display.
7. Manual institution fallback and owner deduplication merging.
