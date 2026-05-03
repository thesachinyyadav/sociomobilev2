# SOCIO Mobile (PWA) v2

Mobile-first **Progressive Web App (PWA)** for the SOCIO university events platform.

This repository contains a **Next.js (App Router)** application that uses:

- **Supabase** for authentication (Google OAuth) and data access
- An existing **SOCIO backend API** (`NEXT_PUBLIC_API_URL`) for certain operations
- A custom **service worker** (`public/sw.js`) + `public/manifest.json`
- Optional **Capacitor** setup for Android builds

For deeper historical notes and feature status, see `CONTEXT.md`.

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- Capacitor (optional, Android)

## Requirements

- Node.js (recommended: latest LTS). Note: some Capacitor tooling expects Node 22+.
- npm

## Getting Started

### 1) Install dependencies

```bash
npm ci
```

### 2) Configure environment variables

Create `.env.local` in the project root.

You can start from the example file:

```bash
cp .env.local.example .env.local
```

Common variables:

- `NEXT_PUBLIC_APP_URL`: Public app URL (used for auth redirects / canonical URLs)
- `NEXT_PUBLIC_PWA_URL`: Public PWA URL (often same as `NEXT_PUBLIC_APP_URL`)
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anon key
- `NEXT_PUBLIC_API_URL`: SOCIO backend API base URL
- `NEXT_PUBLIC_REMOTE_IMAGE_HOSTS`: Comma-separated allowlist for remote images

If Supabase variables are missing, the app still builds, but authentication won’t work.

### 3) Run the development server

```bash
npm run dev
```

Then open `http://localhost:3000`.

## Scripts

- `npm run dev`: Start Next.js dev server
- `npm run build`: Create a production build
- `npm run start`: Start the production server (after build)
- `npm run lint`: Run ESLint

## Project Structure (high level)

```text
app/            Next.js routes (App Router)
components/     Shared UI components
context/        React context providers (auth, events, notifications, etc.)
lib/            Shared utilities (Supabase client, date utils)
public/         Static assets, PWA manifest, service worker
android/        Capacitor Android project (optional)
```

## Key Runtime Concepts

### Authentication

- Sign-in is handled via **Supabase Auth** (Google OAuth).
- The auth callback route is implemented in `app/auth/callback/route.ts`.
- Some routes are protected via `middleware.ts`.

### PWA / Offline

- Service worker: `public/sw.js`
- Manifest: `public/manifest.json`

## Deployment Notes

- This is a standard Next.js app; it can be deployed anywhere Next.js is supported.
- Make sure your production environment variables match the required `NEXT_PUBLIC_*` values.

## Troubleshooting

- Build logs warn about missing Supabase env vars when not configured.
- ESLint currently reports warnings in several files; they do not fail the build.

## Contributing

1. Create a branch
2. Make changes
3. Run `npm run lint` and `npm run build`
4. Open a PR

