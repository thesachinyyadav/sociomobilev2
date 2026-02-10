# SOCIO Mobile PWA v2 — Project Context

> **Last updated:** February 10, 2026
> **Purpose:** Resume document for continuing development of the Socio PWA.

---

## 1. What Is This Project?

A **PWA-only mobile companion** for the existing `socio2026v2` university event management platform. It reuses the **same backend** (Express API at `localhost:8000`) and **same Supabase** instance — no separate server.

**Target users:** Students who want to discover events, register, and track their registrations from their phone.

**Original project:** `D:\2341551\socio\socio2026v2` (do NOT modify)
**This PWA project:** `D:\2341551\socio\socio2026pwav2`
**GitHub repo:** `https://github.com/thesachinyyadav/sociomobilev2.git`

---

## 2. Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 15.5 (App Router) |
| React | 19 |
| Styling | Tailwind CSS v4 + custom CSS vars |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase PostgreSQL (shared with `socio2026v2`) |
| Backend API | Express 5 server from `socio2026v2/server` at `http://localhost:8000` |
| PWA | Custom `sw.js` service worker + `manifest.json` |
| Icons | Lucide React |
| Dates | Day.js |
| Toasts | React Hot Toast |
| Font | DM Sans (Google Fonts) |

### Brand Tokens (CSS Variables in `globals.css`)
- Primary: `#154CB3`
- Primary Dark: `#063168`
- Accent: `#FFCC00`
- Background: `#F3F6FB`
- Text: `#1A1A2E`
- Text Muted: `#64748b`

---

## 3. Project Structure

```
socio2026pwav2/
├── app/
│   ├── layout.tsx           # Root layout (SSR event fetch, providers, TopBar, BottomNav)
│   ├── page.tsx             # Home — hero, features, upcoming events
│   ├── globals.css          # Full CSS with animations, glass, cards, chips
│   ├── favicon.ico          # Copied from socio2026v2
│   ├── auth/
│   │   ├── page.tsx         # Auto Google sign-in, redirect to /discover
│   │   └── callback/
│   │       └── route.ts     # OAuth code exchange (server route)
│   ├── discover/
│   │   └── page.tsx         # Main dashboard — search, categories, fests, events
│   ├── events/
│   │   └── page.tsx         # Browse all events with search + filters
│   ├── fests/
│   │   └── page.tsx         # Browse all fests with search + filters
│   ├── event/
│   │   └── [id]/
│   │       ├── page.tsx     # Event detail — info, rules, schedule, prizes, register button
│   │       └── register/
│   │           └── page.tsx # Team registration form
│   ├── fest/
│   │   └── [id]/
│   │       └── page.tsx     # Fest detail — info + list of associated events
│   ├── profile/
│   │   └── page.tsx         # User info, registered events list, sign-out
│   └── offline/
│       └── page.tsx         # Offline fallback for service worker
├── components/
│   ├── TopBar.tsx           # Sticky glass header with logo + avatar
│   ├── BottomNav.tsx        # Fixed bottom nav (Home, Discover, Events, Profile)
│   ├── EventCard.tsx        # Event card with image, chips, date, venue
│   ├── FestCard.tsx         # Fest card with gradient overlay
│   ├── Skeleton.tsx         # Loading skeletons (PageSkeleton, CardSkeleton)
│   ├── LoadingScreen.tsx    # Full-screen loader with logo
│   └── EmptyState.tsx       # Empty state component
├── context/
│   ├── AuthContext.tsx      # Full auth provider (Google OAuth, user upsert, session)
│   └── EventContext.tsx     # Event context for SSR-prefetched events
├── lib/
│   ├── supabaseClient.ts   # Browser Supabase client singleton
│   └── dateUtils.ts         # Date formatting utilities (dayjs)
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker
│   ├── favicon.svg          # Socio logo SVG (copied from original)
│   ├── logo.svg             # Socio wordmark SVG (copied from original)
│   ├── icons/               # (currently has placeholder — needs real icons)
│   └── images/
│       ├── withsocio.png    # Branding image (copied from original)
│       ├── hero-wave.svg    # Decorative wave (copied from original)
│       ├── blob.svg         # Decorative blob (copied from original)
│       └── animated-dots.svg # Decorative dots (copied from original)
├── middleware.ts            # Route protection (redirects unauthenticated → /auth)
├── next.config.ts           # PWA headers, image remotes
├── package.json             # Dependencies
├── tsconfig.json            # TypeScript config with @/ alias
├── postcss.config.mjs       # Tailwind v4
└── .env.local.example       # Template for env vars
```

---

## 4. Current Build Status

✅ **`npx next build` passes with 0 errors** as of Feb 10, 2026.

All 12 routes compile:
| Route | Type | Size |
|---|---|---|
| `/` | Dynamic | 4.31 kB |
| `/auth` | Dynamic | 2.35 kB |
| `/auth/callback` | Dynamic | 122 B |
| `/discover` | Dynamic | 4.13 kB |
| `/event/[id]` | Dynamic | 6.5 kB |
| `/event/[id]/register` | Dynamic | 5.57 kB |
| `/events` | Dynamic | 3.12 kB |
| `/fest/[id]` | Dynamic | 3.43 kB |
| `/fests` | Dynamic | 8.27 kB |
| `/offline` | Dynamic | 173 B |
| `/profile` | Dynamic | 9.7 kB |

---

## 5. What's DONE (Completed)

### Core Infrastructure
- [x] `package.json` with all deps (lighter than original — no gsap, zod, exceljs, qr-scanner)
- [x] Next.js 15 config with PWA headers
- [x] Tailwind CSS v4 integration
- [x] TypeScript config with `@/` path alias
- [x] Service worker (`sw.js`) — network-first navigation, cache-first assets, offline fallback
- [x] PWA manifest (`manifest.json`) with real Socio favicon

### Auth
- [x] `AuthContext.tsx` — Google OAuth via Supabase, auto-creates user in backend
- [x] `/auth` — auto-triggers sign-in, redirects if signed in
- [x] `/auth/callback` — server route, code-for-session exchange, user creation POST
- [x] `middleware.ts` — protects `/profile` (redirects to `/auth`)

### Data Layer
- [x] `supabaseClient.ts` — browser client singleton
- [x] `EventContext.tsx` — SSR-prefetched events from Supabase, shared via context
- [x] `dateUtils.ts` — Day.js utilities (formatDateUTC, formatDateShort, formatTime, etc.)

### UI Components
- [x] `TopBar.tsx` — glass header with real `logo.svg`, user avatar
- [x] `BottomNav.tsx` — 4 tabs (Home, Discover, Events, Profile), glass backdrop
- [x] `EventCard.tsx` — image, chips (Free/price, Open, Claims), date, venue, category
- [x] `FestCard.tsx` — image/gradient, category chip, title, date range
- [x] `Skeleton.tsx`, `LoadingScreen.tsx`, `EmptyState.tsx`

### Pages
- [x] `/` (Home) — gradient hero, feature pills, upcoming events, CTA
- [x] `/discover` — search, category pills, fests carousel, trending events, all events
- [x] `/events` — browse events with search + category filter
- [x] `/fests` — browse fests with search + category filter
- [x] `/event/[id]` — full event detail (image, pills, description, accordion rules/schedule/prizes, contact, sticky register bar)
- [x] `/event/[id]/register` — team registration form (name/regnum/email per member, validation)
- [x] `/fest/[id]` — fest detail + associated events (matched by slugifying `event.fest`)
- [x] `/profile` — user info card, registered events list, sign out
- [x] `/offline` — offline fallback page

### Assets (copied from `socio2026v2`)
- [x] `logo.svg` — SOCIO wordmark with star
- [x] `favicon.svg`, `favicon.ico`
- [x] `withsocio.png`, `hero-wave.svg`, `blob.svg`, `animated-dots.svg`

---

## 6. What's NOT DONE (TODO — Continue From Here)

### High Priority
- [ ] **`.env.local`** — Create it with real Supabase keys:
  ```
  NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
  NEXT_PUBLIC_API_URL=http://localhost:8000
  ```
  (Copy values from wherever you have them — they're NOT in the socio2026v2 repo)

- [ ] **Custom fields in registration** — The original event detail page supports `custom_fields` (text, select, checkbox, etc.) rendered via `CustomFieldRenderer`. The PWA register page currently only handles team name + teammate fields. Events with custom fields will redirect to `/event/[id]/register` but custom field rendering is NOT implemented yet.

- [ ] **Club pages** — No `/club/[id]` or `/clubs` page. The original has these. Add if needed.

### Medium Priority
- [ ] **Pull-to-refresh** — Add a pull-to-refresh gesture for the discover/events pages.
- [ ] **Event image carousel** — Some events have multiple images; only the first is shown.
- [ ] **Loading states** — The discover/events/fests pages don't use `PageSkeleton` during API fetches (they show spinner only).
- [ ] **Toast notifications** — `react-hot-toast` is installed and `<Toaster>` is in layout, but no toasts are triggered yet on registration success/error.
- [ ] **App install prompt** — Add a "Install App" banner/button that triggers the browser's PWA install prompt (`beforeinstallprompt`).
- [ ] **Image optimization** — Configure `next/image` domains properly if events use non-Supabase image hosts.

### Low Priority / Nice-to-Have
- [ ] **QR code display** — Original has QR code for attendance. Not in PWA yet.
- [ ] **Attendance page** — Original has `/attendance` for QR scanning. Not needed for student flow.
- [ ] **Notifications** — Original has a notification system. Not in PWA yet.
- [ ] **Dark mode** — CSS vars are set up for it but no toggle exists.
- [ ] **Animations polish** — The CSS has `fade-up`, `scale-in`, `slide-up` animations but they could be more refined.
- [ ] **PWA icons** — `public/icons/` needs proper sized icons (192x192, 512x512) for the manifest. Currently uses `favicon.svg`.
- [ ] **Splash screen** — Apple touch startup images for iOS PWA.

---

## 7. Key Architecture Notes

### How Auth Works
1. User taps "Sign in" → `signInWithGoogle()` in `AuthContext` → Supabase OAuth popup
2. Redirect to `/auth/callback` → server route exchanges code for session
3. Callback route fires `POST /api/users` to upsert user in the Express backend
4. User data includes: `name`, `email`, `register_number` (from Google metadata), `organization_type` ("christ_member" if `@christuniversity.in`, else "outsider")
5. Outsiders get a `visitor_id` generated by the backend

### How Events Load
1. `layout.tsx` (server component) queries Supabase directly for all events (ISR, revalidate 5min)
2. Passes events to `EventProvider` via props
3. All client pages access events via `useEvents()` — zero API calls for listing

### How Registration Works
1. **Solo events (no custom fields):** Inline POST to `/api/register` from event detail page
2. **Team events or custom fields:** Redirect to `/event/[id]/register` for the form
3. **POST body:** `{ eventId, teamName, teammates: [{ name, registerNumber, email }] }`
4. Backend validates, creates registration record, returns success

### How Events Link to Fests
- Events have a `fest` column (plain text, e.g. "Tech Fest 2026")
- Fests have a `slug` column (e.g. "tech-fest-2026")
- Matching: slugify `event.fest` and compare to `fest.slug`
- No foreign key constraint — it's a loose text match

### API Endpoints Used by PWA
| Endpoint | Method | Used By |
|---|---|---|
| `/api/users` | POST | Auth callback (upsert user) |
| `/api/events` | GET | Layout SSR (but uses Supabase direct) |
| `/api/events/:id` | GET | Event detail (fallback if not in context) |
| `/api/fests` | GET | Fests page |
| `/api/fests/:id` | GET | Fest detail page |
| `/api/register` | POST | Event registration |
| `/api/registrations/user/:regNum/events` | GET | Profile page (user's events) |

---

## 8. How to Run

```bash
# 1. Copy env vars
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY

# 2. Install deps (already done)
npm install

# 3. Start the Express backend (in separate terminal)
cd ../socio2026v2/server
npm run dev  # runs on port 8000

# 4. Start the PWA dev server
cd ../../socio2026pwav2
npx next dev  # runs on port 3000

# 5. Build for production
npx next build
npx next start
```

---

## 9. File-by-File Reference

### Config Files
| File | Purpose |
|---|---|
| `package.json` | Dependencies: next 15, react 19, supabase, dayjs, lucide, tailwind v4 |
| `tsconfig.json` | TS config with `@/*` → `./*` path alias |
| `next.config.ts` | PWA cache headers for sw.js/manifest, image remotes |
| `postcss.config.mjs` | Tailwind v4 via `@tailwindcss/postcss` |
| `middleware.ts` | Protects `/profile` — redirects to `/auth` if no session |
| `.env.local.example` | Template for Supabase + API env vars |

### Context Providers
| File | Exports | Notes |
|---|---|---|
| `context/AuthContext.tsx` | `AuthProvider`, `useAuth()` | Google OAuth, session, userData, signIn/signOut |
| `context/EventContext.tsx` | `EventProvider`, `useEvents()` | SSR events from layout, `FetchedEvent` and `Fest` types |

### Library
| File | Exports | Notes |
|---|---|---|
| `lib/supabaseClient.ts` | `supabase` | Browser client singleton |
| `lib/dateUtils.ts` | `formatDateUTC`, `formatDateShort`, `formatTime`, `getDaysUntil`, `isDeadlinePassed`, `timeAgo`, `formatDateRange` | All use Day.js |

### Components
| File | Default Export | Props |
|---|---|---|
| `components/TopBar.tsx` | `TopBar` | none (reads from AuthContext) |
| `components/BottomNav.tsx` | `BottomNav` | none (reads pathname) |
| `components/EventCard.tsx` | `EventCard` | `{ event: FetchedEvent, compact?: boolean }` |
| `components/FestCard.tsx` | `FestCard` (named) | `{ fest: Fest }` |
| `components/Skeleton.tsx` | `PageSkeleton` (named), `CardSkeleton` (named) | none |
| `components/LoadingScreen.tsx` | `LoadingScreen` (named) | none |
| `components/EmptyState.tsx` | `EmptyState` (named) | `{ icon?, title, subtitle?, action? }` |

### Pages
| Route | File | Description |
|---|---|---|
| `/` | `app/page.tsx` | Home — hero, feature pills, upcoming events grid |
| `/auth` | `app/auth/page.tsx` | Auto Google sign-in trigger |
| `/auth/callback` | `app/auth/callback/route.ts` | Server-side OAuth callback |
| `/discover` | `app/discover/page.tsx` | Search + categories + fests carousel + events grid |
| `/events` | `app/events/page.tsx` | Browse events with filters |
| `/fests` | `app/fests/page.tsx` | Browse fests with filters |
| `/event/[id]` | `app/event/[id]/page.tsx` | Event detail + inline register for solo |
| `/event/[id]/register` | `app/event/[id]/register/page.tsx` | Team registration form |
| `/fest/[id]` | `app/fest/[id]/page.tsx` | Fest detail + associated events |
| `/profile` | `app/profile/page.tsx` | User info + registered events + sign out |
| `/offline` | `app/offline/page.tsx` | Offline fallback |

---

## 10. Known Issues

1. **No `.env.local` committed** — You must create it manually with Supabase keys.
2. **Custom fields not rendered** in register page — events with custom_fields redirect to register but the form doesn't show them.
3. **FestCard uses named export** — imported as `{ FestCard }` in pages, while `EventCard` uses default export. Inconsistent but works.
4. **PWA manifest icons** — only `favicon.svg` is referenced; proper 192x192 / 512x512 PNG icons not generated.
5. **No error boundary** — no global error.tsx or not-found.tsx pages.
6. **Image domains** — if event images come from domains other than Supabase/Google/placehold.co, they'll fail. Add to `next.config.ts` `images.remotePatterns`.

---

## 11. Relationship to Original Project

```
socio2026v2/                    socio2026pwav2/
├── client/  ←(logos copied)→   ├── public/
├── server/  ←(API calls)────→  ├── app/ (fetches from localhost:8000)
│   └── routes/                 └── context/ (Supabase direct for SSR)
└── socios.sql (shared DB)
```

- **Same Supabase project** — same tables, same auth
- **Same Express API** — PWA calls the same endpoints
- **Independent frontend** — can run alongside the original on a different port
- **No admin features** — PWA is student-facing only (no event/fest creation, no management)
