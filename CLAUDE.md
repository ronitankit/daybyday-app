# DayByDay — Claude Code Session Reference

## What this project is
A production-quality habit-tracking PWA built with Next.js 16, Supabase, TanStack Query, Zustand, and Dexie (IndexedDB). Deployed at **https://daybyday-app.vercel.app**.

GitHub: **https://github.com/ronitankit/daybyday-app**

---

## Tech stack
- **Framework**: Next.js 16.2.10, App Router, TypeScript strict mode
- **Auth + DB**: Supabase (project ref `ehvhqvgmpqpnomdqdvxy`, region ap-northeast-2)
- **Styling**: Tailwind CSS + shadcn/ui components
- **State**: TanStack Query (server state) + Zustand `useHabitStore` (sync state)
- **Offline**: Dexie IndexedDB (`pending_mutations` table) + `SyncProvider` auto-flush
- **Auth providers**: Email/password + Google OAuth
- **Deployment**: Vercel (`ankit-kukrety-s-projects/daybyday-app`), GitHub integration active

---

## Infrastructure
- Supabase URL: `https://ehvhqvgmpqpnomdqdvxy.supabase.co`
- Credentials: in `.env.local` (gitignored) — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- All 4 env vars are set on Vercel production
- RLS is enabled on all 14 tables — never rely only on client-side filtering
- `SUPABASE_SERVICE_ROLE_KEY` is server-only — never expose in browser code

---

## Key architecture decisions
- `proxy.ts` (not `middleware.ts`) — Next.js 16 renamed the middleware export to `proxy`
- `app/(app)/layout.tsx` has `export const dynamic = 'force-dynamic'` — prevents static prerender errors on auth-gated pages
- Offline mutations store final DB values (not input deltas) so replay is deterministic
- Avatar images stored in Supabase Storage `avatars` bucket (public), path: `{userId}/avatar.{ext}`
- `useCurrentUser()` hook in `features/auth/useCurrentUser.ts` — use this everywhere you need the logged-in user + avatar URL

---

## Database migrations applied
| File | Description |
|------|-------------|
| `001_initial_schema.sql` | 14 tables, RLS on all |
| `002_seed_achievements.sql` | 15 achievement records |
| `003_storage_avatars.sql` | `avatars` storage bucket + RLS policies |

To apply new migrations, use the Supabase Management API:
```bash
curl -s -X POST \
  "https://api.supabase.com/v1/projects/ehvhqvgmpqpnomdqdvxy/database/query" \
  -H "Authorization: Bearer <SUPABASE_ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"<SQL>\"}"
```
Get a personal access token from https://supabase.com/dashboard/account/tokens

---

## Features built
- [x] Habit CRUD (binary + quantitative, flexible scheduling)
- [x] Today view with optimistic completion toggling
- [x] Calendar view
- [x] Analytics with CompletionTrendChart (real data from Supabase)
- [x] Streak engine (domain/streaks/streak-engine.ts)
- [x] Insight engine (domain/insights/insight-engine.ts)
- [x] Offline mutation queue (Dexie) with auto-flush on reconnect
- [x] Achievement system (15 milestones, checked post-completion)
- [x] Guest → authenticated user migration on sign-in
- [x] Profile picture upload (Supabase Storage, circular frame on profile + nav)
- [x] PWA: installable on Android (Chrome install prompt) and iOS (Share → Add to Home Screen)
- [x] Service worker with offline fallback page
- [x] Google OAuth

---

## Where we left off (2026-07-16)
- All features complete and deployed to production
- PWA install support added (icons, service worker, manifest fixed)
- Profile picture upload working (fixed Next.js `remotePatterns` for `*.supabase.co`)
- GitHub repo connected to Vercel — every push to `main` auto-deploys

## Pending / known items
- [ ] Rotate the Supabase personal access token used in this session (get a new one at https://supabase.com/dashboard/account/tokens)
- [ ] Add production domain to Google OAuth client in Google Cloud Console:
  - Authorised JavaScript origins: `https://daybyday-app.vercel.app`
  - Authorised redirect URIs: `https://daybyday-app.vercel.app/auth/callback`
- [ ] Test Google OAuth end-to-end on production (client was created but not fully verified)

---

## Dev workflow
```bash
npm run dev          # Start local dev server
npm run type-check   # TypeScript (must stay at 0 errors)
npm run lint         # ESLint
npm run test:unit    # Vitest unit tests (28 tests)
npm run build        # Production build
```

To deploy manually: `vercel --prod`
To push and auto-deploy: `git push origin main`

---

## Security rules (never break these)
1. Never expose `SUPABASE_SERVICE_ROLE_KEY` in browser code
2. Never rely only on client-side filtering — RLS must always be the enforcement layer
3. Only `NEXT_PUBLIC_*` vars may be used in browser code
