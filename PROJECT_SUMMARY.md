# AI Resume Agent - Project Summary and Handoff

Created: May 2, 2026  
Branch: `feature/interview-feedback`  
Workspace: `/Users/abhinay/Developer/nexzen`

This document summarizes the migration, deployment, and auth refactor work performed so far. It intentionally separates verified local state from items that still need confirmation.

---

## Project Overview

AI Resume Agent is a full-stack resume and interview preparation platform.

### Core Stack

- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, SQLAlchemy async, PostgreSQL/Supabase
- Auth: Supabase Auth on the frontend, Supabase JWT validation in the backend
- AI: Gemini and OpenAI configuration support
- Deployment: Vercel monorepo setup with frontend and backend services

---

## Chronological Work Summary

1. Checked out and worked on `feature/interview-feedback`.
2. Linked the monorepo to Vercel.
3. Configured Vercel routing so:
   - Frontend serves from `/`
   - Backend serves from `/_/backend`
4. Changed the GitHub repository visibility from private to public using GitHub CLI so Vercel Git integration could work.
5. Created a Supabase project named `ai-resume-agent-db` under the Nexzen organization.
6. Attempted to initialize the backend schema against Supabase using `backend/scripts/init_db.py`.
7. Migrated frontend auth from the older custom/cookie flow toward Supabase Auth.
8. Added Supabase SSR/client helpers.
9. Added login, signup, auth callback, auth error, and reset password flows.
10. Updated frontend API requests to attach Supabase bearer tokens.
11. Updated backend auth dependencies to validate Supabase JWTs and auto-create a local user row when needed.
12. Debugged production redirect loops and middleware behavior.
13. Simplified the landing/login experience.
14. Added guest-mode entry points so users can enter the dashboard without waiting on Supabase email verification/rate limits.
15. Fixed Next.js build issues involving invalid `lucide-react` icon names and `useSearchParams` needing a `Suspense` boundary.
16. Deployed directly to Vercel production from the local workspace.

---

## Files Created

- `PROJECT_SUMMARY.md`
- `frontend/src/middleware.ts`
- `frontend/src/lib/supabase/client.ts`
- `frontend/src/lib/supabase/server.ts`
- `frontend/src/lib/supabase/middleware.ts`
- `frontend/src/app/auth/callback/route.ts`
- `frontend/src/app/auth/auth-code-error/page.tsx`
- `frontend/src/app/auth/reset-password/page.tsx`
- `frontend/src/app/signup/page.tsx`

---

## Files Modified

- `backend/app/api/deps.py`
- `backend/app/core/config.py`
- `frontend/next.config.ts`
- `frontend/src/app/login/page.tsx`
- `frontend/src/components/landing-shell.tsx`
- `frontend/src/components/require-auth.tsx`
- `frontend/src/lib/api-client.ts`
- `frontend/src/services/auth-service.ts`
- `vercel.json`

Gemini also reported deleting these legacy auth components:

- `frontend/src/components/auth-form.tsx`
- `frontend/src/components/auth-redirect.tsx`

---

## Current Local Git State

Latest local commit:

- `519bd84 Fix signup redirect, add forgot password, and guest mode options`

Remote comparison:

- Local `feature/interview-feedback` is 1 commit ahead of `origin/feature/interview-feedback`.
- The push to GitHub reportedly failed because of network timeouts on ports 22/443.

Current working tree still has uncommitted changes:

- Modified: `frontend/src/components/landing-shell.tsx`
- Modified: `frontend/src/components/require-auth.tsx`
- Untracked: `PROJECT_SUMMARY.md`

Do not assume GitHub has the latest code until push succeeds.

---

## Deployment State

Production URL:

- `https://airesume.nexzen.me`

Vercel project:

- `ai-resume-agent-nexzen`

Vercel routing in `vercel.json`:

- Frontend service: route prefix `/`
- Backend service: route prefix `/_/backend`

Important env var:

- `NEXT_PUBLIC_API_URL=https://airesume.nexzen.me/_/backend`

Gemini reported that the final frontend changes were deployed directly with:

- `vercel deploy --prod --yes`

Because the latest GitHub push failed, Vercel production may be newer than GitHub. Verify by checking the live site and the Vercel deployment source.

---

## Supabase State

Supabase project:

- Name: `ai-resume-agent-db`
- Project ref: `wlcerinaknyifvocaviu`
- Organization: Nexzen

Auth configuration expected:

- Site URL: `https://airesume.nexzen.me`
- Additional Redirect URL: `https://airesume.nexzen.me/auth/callback`
- Password reset redirect uses: `https://airesume.nexzen.me/auth/reset-password`

Vercel env vars that must be checked:

- `SUPABASE_URL`
- `SUPABASE_JWT_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `GEMINI_API_KEY`
- `CORS_ALLOWED_ORIGINS`

Important: `SUPABASE_JWT_SECRET` must exactly match the Supabase project's JWT secret from Supabase API settings.

---

## Auth Implementation Notes

Frontend:

- `frontend/src/lib/supabase/client.ts` creates the browser Supabase client.
- `frontend/src/lib/supabase/server.ts` creates the server-side Supabase client.
- `frontend/src/lib/supabase/middleware.ts` refreshes Supabase sessions in Next middleware.
- `frontend/src/app/login/page.tsx` uses `signInWithPassword`.
- `frontend/src/app/signup/page.tsx` uses `signUp`.
- `frontend/src/app/auth/callback/route.ts` exchanges Supabase auth codes for sessions.
- `frontend/src/app/auth/reset-password/page.tsx` updates the logged-in user's password.
- `frontend/src/lib/api-client.ts` attaches the Supabase access token as a backend bearer token.
- `frontend/src/services/auth-service.ts` fetches Supabase user state, then calls `/api/user/me` for app-specific user data.

Backend:

- `backend/app/api/deps.py` reads bearer tokens, validates them with `SUPABASE_JWT_SECRET`, extracts the Supabase `sub`, and auto-creates a local `users` table row if missing.
- Some legacy custom auth/JWT code still exists in the backend, including `backend/app/api/routes/auth.py` and `backend/app/core/security.py`. Do not describe custom auth as fully removed unless those routes are audited or deleted.

Guest mode:

- The landing page has a `Try as Guest` button that routes to `/dashboard`.
- Login also has a `Guest` button that routes to `/dashboard`.
- `frontend/src/components/require-auth.tsx` currently bypasses the redirect-to-login behavior when no user exists.
- This is a frontend access bypass, not a complete backend guest-user implementation. Backend calls that require auth may still fail without a Supabase token.

---

## Key Commands Reported

Git:

- `git checkout`
- `git add .`
- `git commit`

Vercel:

- `vercel link`
- `vercel env add`
- `vercel env pull`
- `vercel logs`
- `vercel deploy --prod --yes`

Supabase:

- `supabase projects create`
- `supabase link`

Python:

- `pip install sqlalchemy asyncpg greenlet`
- `python3 backend/scripts/init_db.py`

Frontend:

- `npm install @supabase/ssr @supabase/supabase-js`
- `npm run build`

---

## Problems Encountered

### Supabase database connection

Error reported:

- `asyncpg.exceptions.InternalServerError: Tenant or user not found`

Attempts made:

- Switched Supabase connection strings.
- Installed `sqlalchemy`, `asyncpg`, and `greenlet`.
- Tried running backend DB initialization.

Current status:

- Table creation is unverified.
- Backend write access to Supabase is unverified.

### Redirect loops

Problem:

- Production auth middleware and route protection caused users to loop back to login.

Fixes attempted:

- Added Next middleware for Supabase session refresh.
- Allowed auth routes.
- Bypassed `RequireAuth` redirects for guest mode.

Current status:

- Guest navigation should reach `/dashboard`.
- Authenticated backend/API flows still need live verification.

### Build issues

Problems:

- Invalid `lucide-react` icon import.
- `useSearchParams` used without `Suspense`.

Fixes:

- Replaced the invalid icon.
- Wrapped login page content in `Suspense`.

### Supabase email rate limits

Problem:

- Email signup/login testing hit Supabase email limits.

Mitigation:

- Added guest mode entry.
- Simplified auth UI to email/password.

Current status:

- Supabase email behavior still depends on dashboard settings and SMTP/email confirmation configuration.

---

## Known Gaps and Next Checks

1. Verify whether Supabase database tables exist in project `wlcerinaknyifvocaviu`.
2. Verify whether `DATABASE_URL` works from the deployed backend.
3. Verify `/api/user/me` after Supabase login creates or retrieves the local user correctly.
4. Verify guest mode behavior beyond the dashboard shell, especially any backend-backed feature.
5. Verify password reset email link lands on `/auth/reset-password` with a valid Supabase session.
6. Confirm Supabase Site URL and Additional Redirect URLs in the Supabase dashboard.
7. Confirm `SUPABASE_JWT_SECRET` in Vercel exactly matches Supabase API settings.
8. Push local commits and this summary to GitHub when network access works.
9. Decide whether to keep or remove legacy backend auth routes.
10. Run a clean production build and backend tests after the summary and guest-mode edits are committed.

---

## Do Not Assume

- Do not assume the database schema exists in Supabase.
- Do not assume deployed backend writes to Supabase successfully.
- Do not assume GitHub is current.
- Do not assume Google OAuth works; provider dashboard setup may still be incomplete.
- Do not assume guest mode creates durable user data.
- Do not assume Vercel production exactly matches GitHub; it may have been deployed from local files.

---

## Recommended Next Actions

1. Run `npm run build` in `frontend`.
2. Run backend tests from `backend`.
3. Check Supabase tables directly.
4. Test login, signup, password reset, guest dashboard entry, and `/api/user/me` on production.
5. Commit the current working-tree changes.
6. Push `feature/interview-feedback` to GitHub.

