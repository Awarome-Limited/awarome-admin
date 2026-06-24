# Awarome Admin

Internal admin dashboard for Awarome. Next.js (App Router) app that consumes the `awarome-BE` API. Staff authenticate against `POST /auth/staff/login`, and role/permissions returned at login drive what's visible in the UI.

## Getting started

1. Copy `.env.example` to `.env.local` and set `AWAROME_API_BASE_URL` (e.g. `http://localhost:8083/api/v1`) and `AWAROME_API_KEY` (must match `API_KEY` in `awarome-BE`'s `.env`).
2. Make sure `awarome-BE` is running locally, and that at least one `Staff` account exists - run `pnpm migrate:admins-to-staff` in `awarome-BE` to create one from an existing `UserRoles.ADMIN` account, or create one directly via `POST /admins/staff` (super-admin only).
3. Install dependencies and run the dev server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Unauthenticated requests are redirected to `/login`.

## Structure

- `src/proxy.ts` - optimistic auth gate (Next.js 16 renamed `middleware.ts` to `proxy.ts`); redirects unauthenticated requests to `/login`.
- `src/lib/session.ts` - httpOnly cookie session (BE JWT + staff profile), used server-side only.
- `src/lib/api-client.ts` - server-only fetch wrapper that attaches the `x-awrm-api-key` header and staff bearer token.
- `src/lib/actions.ts` - server actions for login/logout.
- `src/lib/permissions.ts` / `src/lib/nav-items.ts` - mirrors the role/permission model in `awarome-BE` (`src/modules/admins/types/staff.types.ts`); keep in sync manually.
- `src/app/(auth)/login` - public login page.
- `src/app/(dashboard)` - protected routes, one folder per business module. Most are placeholders pending later build-out phases.

## Stack

Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui + React Hook Form + Zod. `@tanstack/react-query` is installed for upcoming list/detail pages but not yet wired into the root layout - add the provider when the first client-side data-fetching page is built.
