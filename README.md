# 🏛️ SOCIO Mobile (PWA) v2
> **The Next-Generation University Event Platform** — Mobile-First Progressive Web App & Native Bridge.

SOCIO Mobile is a high-performance, mobile-first **Progressive Web App (PWA)** and hybrid mobile application built with **Next.js (App Router)** and **Capacitor**. It serves as the primary student-facing interface for event discovery, ticket generation, and community interaction.

---

## 🚀 Core Features

*   **⚡ High-Speed Discovery**: Curated dashboard views for campus events, fests, and student clubs, optimized for performance with SWR data pre-fetching.
*   **🎟️ Secure Digital Ticketing**: Offline-ready ticket generation displaying secure QR codes for campus entry and volunteer check-ins.
*   **📱 Hybrid Mobile Shell**: Built with Capacitor to compile as a native Android or iOS application, complete with deep link handling and push notification support.
*   **🔌 PWA Capabilities**: Fully installable client with a custom background Service Worker handling network caching and providing robust offline fallbacks.
*   **🤝 Volunteer Controls**: Built-in scanning flows and gesture-based triggers (Shake-to-Scan) to empower club organizers and volunteers at event venues.

---

## 🛠️ Technology Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router), React 19 | Core web application architecture |
| **Language** | TypeScript | Strong typings and static analysis |
| **Styling** | Tailwind CSS v4, PostCSS | Performance-focused visual design system |
| **Database & Auth** | Supabase, PostgreSQL | Secure session management (Google OAuth) and data persistence |
| **Local Storage** | Dexie.js (IndexedDB) | High-performance client-side database for offline support |
| **Native Bridge** | Capacitor, Cordova | Hybrid mobile wrapper for Android & iOS builds |
| **Push Notifications** | OneSignal (Cordova Plugin) | Rich native notifications and audience segments |
| **Analytics & Alerts** | Sentry (Express integration), React Hot Toast | Error tracing and micro-interactive user feedback |

---

## 📂 Project Architecture

```text
sociomobilev2/
├── app/                  # Next.js App Router Pages & API Routes
│   ├── api/pwa/          # Backend proxy endpoints for PWA synchronization
│   ├── auth/             # Authentication & OAuth callback handlers
│   ├── discover/         # Principal curation dashboard
│   ├── event/            # Event detailed information and registrations
│   ├── volunteer/        # Scanner portal and check-in workflows
│   └── globals.css       # Main design tokens and Tailwind utility mappings
├── components/           # Reusable functional UI components
│   ├── icons/            # Optimized SVG icon library (Lucide-based)
│   ├── native/           # Bridge controllers for native mobile platform APIs
│   └── TopBar & BottomNav# Primary PWA navigation headers & tabs
├── context/              # React Context Providers (Auth, Event, Network, Notifications)
├── lib/                  # Library configurations (Supabase, API Client, Cache policies)
├── public/               # Static assets, Web Manifest, and PWA Service Worker (sw.js)
├── android/              # Capacitor Android Studio folder configuration
└── ios/                  # Capacitor Xcode project configuration
```

---

## ⚙️ Environment Variables

Copy the template configuration into a local file:
```bash
cp .env.local.example .env.local
```

Key environment configurations defined in `env.local`:
*   `NEXT_PUBLIC_APP_URL`: Canonical root URL of the web server (used in OAuth redirects).
*   `NEXT_PUBLIC_SUPABASE_URL`: Endpoint of the Supabase instance.
*   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase client anonymous API key.
*   `NEXT_PUBLIC_API_URL`: Root base URL of the primary SOCIO backend services.
*   `NEXT_PUBLIC_APP_VERSION`: App version metadata checked during startup to trigger onboarding updates.

---

## 💻 Local Development

### 1. Install Dependencies
Initialize package dependencies:
```bash
npm ci
```

### 2. Launch Local Server
Run Next.js in development mode:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application in your browser.

---

## 🔧 Production Build & Optimization

To check, compile, and prepare the project for deployment:

```bash
# Perform linter audits (zero warnings allowed in CI)
npm run lint

# Create optimized production build
npm run build

# Start server in production mode
npm run start
```

### Performance & Audit Pipelines
The project includes automated audit utilities:
*   `npm run perf:audit:architecture`: Profiles file relationships, component hydration levels, and script footprint.
*   `npm run perf:audit:routes`: Audits the compiled bundle chunk boundaries, route weights, and JavaScript payloads.
*   `npm run perf:lighthouse`: Measures Lighthouse metrics on `/` and `/discover` under Simulated Mobile Throttling.
*   `npm run perf:baseline:full`: Automates full linting, building, and reporting processes.

---

## 📱 Hybrid Android App Build (Capacitor)

The codebase compiles to a native Android application using Capacitor:

### Step 1: Compile Web Assets
Build the Next.js static files:
```bash
npm run build
```

### Step 2: Synchronize Assets
Sync web builds and plugin configurations into the Android sub-project:
```bash
npx cap sync android
```

### Step 3: Run / Build the Application
Open the Android Studio workspace:
```bash
npx cap open android
```
Alternatively, compile the APK directly from the CLI:
```bash
cd android && ./gradlew assembleDebug
```
The compiled package is written to:
`android/app/build/outputs/apk/debug/app-debug.apk`

---

## 💾 Caching & Synchronicity Models

*   **Authoritative Server Cache**: Backed by a high-performance Valkey cache layer on the backend API layer.
*   **PWA Cache**: The Service Worker (`public/sw.js`) intercepts page resources for offline loads but forces API requests (`/api/pwa/*`) to use a Network-Only approach.
*   **Database Cache**: IndexedDB (using Dexie) caches structured JSON records for profiles and tickets to support immediate offline validation.
*   **Client State**: SWR handles stale-while-revalidate client cache management for instant route changes, and in-memory caches handle micro-latency.

---

## 🛡️ Contributor Rules

Every pull request must align with the repository guidelines. Please consult the [CODE_OF_CONDUCT.md](file:///c:/projects/SOCIO/sociomobilev2/CODE_OF_CONDUCT.md) for specifics:
1.  **Zero Lints**: Build and lint steps must run without any errors or warnings.
2.  **Tokens Only**: Do not introduce hex values or inline styling — utilize variables mapped in `globals.css`.
3.  **Strict Security**: Do not commit secrets, private environment values, or raw URL constants. Always fetch values through process environment parameters.
