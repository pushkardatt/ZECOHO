# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical Rules — Zecoho-specific

1. **Do not start the dev server.** Use Replit's built-in Run button only. The user will run `npm run dev` when needed.

2. **DATABASE_URL points to an empty local DB.** Real data lives in Neon. Never run destructive queries assuming local state. To inspect actual schema and row counts, run: `bash /home/runner/workspace/db-inspect.sh`

3. **SearchBar.tsx has had prior bugs.** Test thoroughly after any changes and walk through the main search flow manually.

4. **Phone masking uses WebRTC** (intentional Phase 1, zero-cost approach). Do not suggest or implement paid services like Twilio or Exotel without explicit approval.

5. **Do not modify `.env` files, `.env.example`, or `package.json` scripts** without asking first.

6. **Business context:** Zecoho is a zero-commission hotel booking platform for small and medium Indian hotels. Core value prop is that hotel owners keep 100% of booking revenue. Any feature that introduces commissions, booking fees on the hotel side, or middleman pricing is out of scope and should be flagged before implementation.

7. **`routes.ts` is intentionally monolithic (~12k lines).** New API handlers must be added to `routes.ts`, not split into separate route files. This is a deliberate architectural choice. When editing or finding handlers here, use careful targeted search (grep for function names, route paths) rather than reading the full file.

8. **`shared/schema.ts` is the single source of truth for DB types.** Changes here affect both client and server simultaneously via Drizzle's `$inferSelect` / `$inferInsert` pattern. Type changes can silently break frontend code. Before modifying, identify all consumers of the affected type on both sides.

9. **`db:push` is destructive.** Since no migration files are committed, `drizzle-kit push` can drop or alter columns when `schema.ts` changes. Never run `db:push` against production without explicit user confirmation. For local/dev pushes, clearly state what columns will be added, modified, or removed before running.

10. **Coming-soon gating via `waitlist` / `tester_whitelist`.** The app controls feature access through these tables. If a feature appears broken or inaccessible during debugging, first check whether the current user is whitelisted — the "bug" may actually be intentional gating.

## Commands

```bash
npm run dev        # Start development server (Express + Vite HMR on port 5000)
npm run build      # Build frontend (Vite) + backend (esbuild) to dist/
npm run start      # Run production build
npm run check      # TypeScript type-check (no emit)
npm run db:push    # Push schema changes to PostgreSQL via drizzle-kit
```

No test suite is configured.

## Architecture

Full-stack hotel/property booking platform. Express backend serves a React SPA with Vite in development and from `dist/public` in production.

**Stack:**
- Frontend: React 18 + TypeScript, Wouter routing, TanStack Query, Shadcn/ui (Radix + Tailwind)
- Backend: Express.js, Drizzle ORM, Neon serverless PostgreSQL
- Auth: Email OTP via Resend + Passport.js sessions (stored in PostgreSQL via `connect-pg-simple`)
- Real-time: WebSocket (`ws` library) for messaging and push notifications
- Storage: Google Cloud Storage for images
- Email: Resend

**Key directories:**
- `client/src/` — React app; pages in `pages/`, reusable UI in `components/`, custom hooks in `hooks/`
- `server/` — Express app; `app.ts` sets up middleware/cron, `routes.ts` (~12k lines) holds all API handlers, `storage.ts` (~119 KB) is the DB access layer
- `shared/schema.ts` — Single Drizzle schema file (~91 KB) shared by client and server; defines all tables and inferred TypeScript types

**Path aliases:** `@/` → `client/src/`, `@shared/` → `shared/`

## Data Flow

1. `server/index-dev.ts` / `server/index-prod.ts` start Express, then register routes from `app.ts` + `routes.ts`
2. All DB access goes through `storage.ts` — do not use Drizzle directly in route handlers
3. Schema inference pattern: types are derived via `typeof table.$inferSelect` / `typeof table.$inferInsert` — don't create manual interfaces for DB rows
4. Zod schemas for request validation are defined inline in `routes.ts` near their handlers

## Authentication

Three user roles: `admin`, `owner`, `guest`. Role is stored on `users.userRole`.

Primary auth flow: email OTP (`/api/auth/send-otp` → `/api/auth/verify-otp`). Password login also exists. Sessions last 7 days. Use the `isAuthenticated` middleware for protected routes; it handles token refresh automatically.

## Real-time (WebSockets)

`userConnections` map in `routes.ts` tracks active WS connections by userId. Broadcast helpers send notifications and chat messages. Clients connect via `/ws` path. Push notifications (Web Push API) are handled separately in `server/services/pushService.ts`.

## Database

Run `npm run db:push` after editing `shared/schema.ts` to sync the live database. No migration files are committed — schema is the source of truth.

## Subscription Cron

A background job fires daily at 9 AM IST to expire subscriptions. Logic lives in `server/subscriptions.ts` and is registered in `server/app.ts`.
