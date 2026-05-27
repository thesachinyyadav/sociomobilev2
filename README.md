# SOCIO Mobile Progressive Web App and Capacitor Reference Manual

This technical documentation provides a detailed system reference for the SOCIO mobile-first Progressive Web App (PWA) and Capacitor hybrid application codebase.

---

## 1. System Architecture

The client application is built on Next.js 16 using the App Router structure. It is optimized for mobile browser viewports and can be packaged into native mobile applications using the Capacitor bridge runtime.

| Architectural Component | Strategy and Technology | Implementation Details |
|---|---|---|
| Rendering Framework | Next.js App Router | Processes directory routes, handles server-side metadata generation, and compiles client-side pages. |
| Hybrid Application Bridge | Capacitor | Exposes device hardware interfaces such as camera permissions, notification bindings, and accelerometer telemetry. |
| Client Caching Layer | Dexie JS and IndexedDB | Provides offline caching of user tickets, event registries, and transaction records for offline execution. |
| State Management | React Context API | Manages user session state, event caching, active network routing, and motion gesture listeners. |
| Offline Fallback Router | Custom Service Worker | Uses sw.js script mapping to cache static bundles and asset layers for loading during network disconnection. |

---

## 2. Global Environment Configurations

Create a local configuration file named `.env.local` in the project root to set the following variables.

| Configuration Variable | Required | Default Value | Description |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | Yes | `https://app.withsocio.com` | Base URL used to handle native app deep links and redirections. |
| `NEXT_PUBLIC_PWA_URL` | Yes | `https://app.withsocio.com` | Base URL used to locate and bind the PWA manifest schema file. |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | None | Connection endpoint for the Supabase backend database instance. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | None | Anonymous key used to invoke public database queries and edge routes. |
| `NEXT_PUBLIC_API_URL` | Yes | None | Connection endpoint for the main express gateway server. |
| `NEXT_PUBLIC_APP_VERSION` | No | `1.0.0` | Application build version number utilized during synchronization. |

---

## 3. Global Context and State Providers

System states are managed using React Context providers located in the `context/` directory.

| Provider Name | File Path | State Variables and Actions | Functional Responsibility |
|---|---|---|---|
| `AuthProvider` | `context/AuthContext.tsx` | `session`, `userData`, `isLoading`, `signInWithGoogle()`, `signOut()` | Manages user credentials, token refresh cycles, and stores profile records. |
| `EventProvider` | `context/EventContext.tsx` | `allEvents`, `isLoading`, `mutate()` | Caches public event directories, handles list updates, and manages retrieval spinners. |
| `NotificationProvider` | `context/NotificationContext.tsx` | `notifications`, `isSubscribed`, `registerNotifications()`, `refresh()` | Integrates with OneSignal endpoints and VAPID push subscriptions. |
| `NetworkProvider` | `context/NetworkContext.tsx` | `status`, `isOnline` | Monitored by service hooks to show connection warnings when offline. |
| `ShakeToScanProvider` | `context/ShakeToScanContext.tsx` | `shakeEnabled`, `activeScanEvent`, `enableForEvent()`, `disableShake()` | Tracks accelerometer thresholds to open the volunteer QR scanner. |

---

## 4. UI Component Library Reference

Modular interface elements are stored in the `components/` directory.

| Component Name | File Path | Layout Properties | Functional Responsibility |
|---|---|---|---|
| `TopBar` | `components/TopBar.tsx` | Sticky header (56px) | Renders branding marks, logo assets, back navigation, and user avatars. |
| `BottomNav` | `components/BottomNav.tsx` | Fixed footer (56px) | Provides persistent dashboard tabs for navigation on mobile devices. |
| `ChatbotFab` | `components/ChatbotFab.tsx` | Fixed overlay | Renders floating FAB trigger that opens the SocioAssist AI chat canvas. |
| `QRCodeDisplay` | `components/QRCodeDisplay.tsx` | Centered flex block | Generates offline-capable QR ticket indicators using Jose JWT signatures. |
| `CampusSelector` | `components/CampusSelector.tsx` | Bottom sheet modal | Filters events and venues by matching campus locations. |
| `NetworkBanner` | `components/NetworkBanner.tsx` | Fixed top bar | Slides down when connections fail to report network disruptions. |
| `InstallPrompt` | `components/InstallPrompt.tsx` | Bottom modal | Guides users on adding the PWA application to their device home screen. |
| `DesktopGate` | `components/DesktopGate.tsx` | Full screen flex | Restricts layout views when opened on screens larger than mobile ratios. |

---

## 5. Master Routing Directory

The application exposes 22 active client-side routing endpoints.

| Route Path | Physical File Location | Access Policy | Primary Core UI Elements | API / Database Queries |
|---|---|---|---|---|
| `/` | `app/page.tsx` | Public | Quick Actions Grid, Featured Event Hero | Queries cached event lists, matches volunteer role states. |
| `/auth` | `app/auth/page.tsx` | Public | Google Login Panel, Brand Logo SVG | Handles login redirects, checks network connectivity state. |
| `/auth/callback` | `app/auth/callback/page.tsx` | Public | Loading Spinner | Verifies Supabase session parameters and redirects users. |
| `/catering` | `app/catering/page.tsx` | Role Gated | Catering Form, Vendor Cards | Fetches menu sheets and registers vendor transactions. |
| `/club/[id]` | `app/club/[id]/page.tsx` | Authenticated | Coordinator Cards, Contact Forms | Queries detail tables matching specific club identifiers. |
| `/clubs` | `app/clubs/page.tsx` | Authenticated | Search Bar, Club Card Grid | Queries list profiles for all student chapters. |
| `/discover` | `app/discover/page.tsx` | Authenticated | Categories Grid, Spotlight Hero | Retrieves active festivals and curated event metrics. |
| `/event/[id]` | `app/event/[id]/page.tsx` | Authenticated | Venue Card, Date-Time Badges | Queries event description lists from Supabase collections. |
| `/event/[id]/register` | `app/event/[id]/register/page.tsx` | Authenticated | Input Fields, Loading Button | Submits participant data arrays to registration endpoints. |
| `/events` | `app/events/page.tsx` | Authenticated | Search Row, Vertical Card Lists | Filters all campus events using search query inputs. |
| `/feedback/[eventId]` | `app/feedback/[eventId]/page.tsx` | Authenticated | Rating Stars, Feedback Textbox | Posts satisfaction scores and reviews for specific events. |
| `/fest/[id]` | `app/fest/[id]/page.tsx` | Authenticated | Event Grid, Fest Banner | Retrieves individual events associated with a festival slug. |
| `/fests` | `app/fests/page.tsx` | Authenticated | Horizontal Cards Grid | Retrieves master list of culture and tech festivals. |
| `/notifications` | `app/notifications/page.tsx` | Authenticated | Notification Rows, Clear Button | Fetches stored user announcements and alerts. |
| `/offline` | `app/offline/page.tsx` | Public | Offline Tips, Saved Tickets | Reads cached ticket logs from Dexie IndexedDB instance. |
| `/privacy` | `app/privacy/page.tsx` | Public | Content Block | Displays static privacy policy data sheets. |
| `/profile` | `app/profile/page.tsx` | Authenticated | QR Display, Registered Cards | Fetches user attendance records and ticket history. |
| `/profile/settings` | `app/profile/settings/page.tsx` | Authenticated | Push Toggles, Route Links | Saves user notification choices to local storage. |
| `/profile/settings/diagnostics` | `app/profile/settings/diagnostics/page.tsx` | Authenticated | Test Buttons, Log Console | Probes service workers, camera permission, and VAPID states. |
| `/terms` | `app/terms/page.tsx` | Public | Content Block | Displays static terms of service agreements. |
| `/volunteer` | `app/volunteer/page.tsx` | Role Gated | Assigned Event Cards, Shake Toggle | Fetches assigned events and initializes motion controls. |
| `/volunteer/scanner/[eventId]` | `app/volunteer/scanner/[eventId]/page.tsx` | Role Gated | WebRTC Video viewport, Toast Rows | Decodes scanned ticket tokens and updates attendance tables. |

---

## 6. Route Reference Manual and Specifications

### 1. Root Landing Page
* File path: `app/page.tsx`
* Security: Public

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Renders the primary dashboard portal. Displays personalized messages, quick shortcuts, and featured spotlight events. |
| Visual Layout | Mobile flex layout wrapped in standard padding limits. Excludes horizontal overflow, uses blur shapes for backdrops. |
| Hooks and Contexts | `useAuth`, `useEvents`, `useState`, `useEffect`. |
| Local States | `isHydrated` (boolean), `greetingText` (string). |
| API Integrations | Triggers read query from `allEvents` cached list; checks local role tags to toggle vendor and volunteer portals. |

### 2. Authentication Portal
* File path: `app/auth/page.tsx`
* Security: Public

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Manages secure login using Google credentials. Restricts access until sessions are resolved. |
| Visual Layout | Locked viewport using `h-[calc(100dvh-56px)]` height formulas. Fits elements within space to prevent scrolls. |
| Hooks and Contexts | `useAuth`, `useRouter`, `useState`, `useEffect`. |
| Local States | `isSubmitting` (boolean), `isOffline` (boolean), `authError` (string). |
| API Integrations | Calls `signInWithGoogle` auth endpoint. Re-routes users back to dynamic return paths after login. |

### 3. Auth Callback Processor
* File path: `app/auth/callback/page.tsx`
* Security: Public

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Resolves URL verification codes and state values passed back from OAuth providers. |
| Visual Layout | Minimal full-screen center layout showing spinner icons. |
| Hooks and Contexts | `useRouter`, `useEffect`. |
| Local States | None. |
| API Integrations | Verifies code strings with Supabase auth systems before finalizing login tokens. |

### 4. Catering Portal
* File path: `app/catering/page.tsx`
* Security: Role Gated (Catering/Admin)

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Allows food providers to inspect vendor orders, menu choices, and track student meal tickets. |
| Visual Layout | Split header listings with vertical grids highlighting menu choices. |
| Hooks and Contexts | `useAuth`, `useState`, `useEffect`. |
| Local States | `selectedMenu` (string), `isLoading` (boolean), `orderList` (array). |
| API Integrations | Reads vendor records and post updates to catering endpoint databases. |

### 5. Club Showcase Profile
* File path: `app/club/[id]/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Details contact links, coordinators, and member criteria for selected student organizations. |
| Visual Layout | Top banner image layouts matching structured description sections. |
| Hooks and Contexts | `useParams`, `useAuth`, `useState`, `useEffect`. |
| Local States | `clubData` (object), `isPending` (boolean), `formStatus` (string). |
| API Integrations | Calls `/clubs/:id` endpoints to fetch details. |

### 6. Clubs Directory Index
* File path: `app/clubs/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Compiles filterable catalog of all student associations and clubs. |
| Visual Layout | Sticky search head with double-column list blocks. |
| Hooks and Contexts | `useEvents`, `useState`, `useMemo`. |
| Local States | `search` (string), `categoryFilter` (string). |
| API Integrations | Fetches index rows from student organization databases. |

### 7. Discover Dashboard
* File path: `app/discover/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Hosts interactive catalogs of active fests, events, and curated recommendations. |
| Visual Layout | Horizontal carousels combined with responsive grid categories. |
| Hooks and Contexts | `useEvents`, `useAuth`, `useState`, `useMemo`, `useEffect`, `useRef`. |
| Local States | `search` (string), `activeFilters` (Set), `currentPage` (number), `fests` (array), `festsLoading` (boolean), `isSearchOpen` (boolean). |
| API Integrations | Invokes `/fests` fetch queries. Maps registration volumes to compute trending festivals. |

### 8. Event Specifications Detail
* File path: `app/event/[id]/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Details venue locations, dates, rules, entry costs, and access instructions. |
| Visual Layout | Full cover header, overlay details, and static bottom registration trigger. |
| Hooks and Contexts | `useParams`, `useEvents`, `useAuth`, `useState`, `useEffect`. |
| Local States | `eventData` (object), `isLoading` (boolean), `isRegistered` (boolean). |
| API Integrations | Queries single event data rows. Checks registration parameters to toggle action keys. |

### 9. Event Registration Portal
* File path: `app/event/[id]/register/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Submits participant applications for specific fests and events. |
| Visual Layout | Structured text input layouts containing dynamic check boxes. |
| Hooks and Contexts | `useParams`, `useRouter`, `useAuth`, `useState`. |
| Local States | `teamName` (string), `members` (array), `isSubmitting` (boolean), `errMsg` (string). |
| API Integrations | Sends registration payloads to `/events/:id/register` express endpoints. |

### 10. Events Search Index
* File path: `app/events/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Lists all scheduled campus events. Provides text filters and location settings. |
| Visual Layout | Continuous lists displaying date-stamp badges on cards. |
| Hooks and Contexts | `useEvents`, `useState`, `useMemo`. |
| Local States | `query` (string), `sortBy` (string). |
| API Integrations | Queries primary database event tables. |

### 11. Event Feedback Survey
* File path: `app/feedback/[eventId]/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Collects student reviews and satisfaction scores. |
| Visual Layout | Simple question layout displaying select-to-rate star interfaces. |
| Hooks and Contexts | `useParams`, `useRouter`, `useState`. |
| Local States | `rating` (number), `comment` (string), `submitting` (boolean). |
| API Integrations | Posts feedback structures to `/events/:eventId/feedback` endpoints. |

### 12. Festival Portal Hub
* File path: `app/fest/[id]/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Compiles event categories, timelines, and registration lists for a single festival. |
| Visual Layout | Top brand banners with segmented view controls. |
| Hooks and Contexts | `useParams`, `useEvents`, `useState`, `useMemo`. |
| Local States | `activeTab` (string), `isLoading` (boolean). |
| API Integrations | Filters cached event arrays to return festival activities. |

### 13. Festivals Directory
* File path: `app/fests/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Compiles and lists all culture, tech, and department fests. |
| Visual Layout | Grid display showing images, dates, and registration buttons. |
| Hooks and Contexts | `useEvents`, `useState`, `useEffect`. |
| Local States | `fests` (array), `loading` (boolean). |
| API Integrations | Triggers GET requests to load active fest entries. |

### 14. Notifications Feed
* File path: `app/notifications/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Lists system announcements and updates. |
| Visual Layout | Time-sorted alerts list with action elements to clean entries. |
| Hooks and Contexts | `useNotifications`, `useState`. |
| Local States | `isClearing` (boolean). |
| API Integrations | Loads announcement indices and updates notification read statuses. |

### 15. Offline Fallback Portal
* File path: `app/offline/page.tsx`
* Security: Public

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Default destination loaded when connections fail. Renders cached user tickets. |
| Visual Layout | Simple network error layouts coupled with ticket barcode views. |
| Hooks and Contexts | `useAuth`, `useState`, `useEffect`. |
| Local States | `offlineTickets` (array), `isCheckingConnection` (boolean). |
| API Integrations | Reads cache data from local IndexedDB storage. |

### 16. Privacy Policy Data Sheet
* File path: `app/privacy/page.tsx`
* Security: Public

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Displays mandatory privacy policy details. |
| Visual Layout | Full width text blocks with simple back actions. |
| Hooks and Contexts | None. |
| Local States | None. |
| API Integrations | Static layout with no database connections. |

### 17. Student Profile Dashboard
* File path: `app/profile/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Details user details and registers ticket passes. |
| Visual Layout | Double tab layouts showing profile details and ticket QR codes. |
| Hooks and Contexts | `useAuth`, `useState`, `useEffect`. |
| Local States | `tickets` (array), `loadingTickets` (boolean). |
| API Integrations | Queries user registration history database tables. |

### 18. Profile Preferences settings
* File path: `app/profile/settings/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Controls device notification channels. |
| Visual Layout | Stacked preferences controls. |
| Hooks and Contexts | `useAuth`, `useNotifications`, `useState`. |
| Local States | `pushEnabled` (boolean). |
| API Integrations | Updates notification settings stored in user profile settings tables. |

### 19. Hardware and VAPID Diagnostics
* File path: `app/profile/settings/diagnostics/page.tsx`
* Security: Authenticated

| Detail Type | Technical Specifications |
|---|---|
| Purpose | DevTools environment checks: VAPID push signals, service worker scope, camera access, and flashlights. |
| Visual Layout | Text logs panel with multi-button action triggers. |
| Hooks and Contexts | `useAuth`, `useNotifications`, `useState`, `useCallback`, `useEffect`. |
| Local States | `diag` (object), `busy` (string), `lastResult` (object), `nativeTorchEnabled` (boolean), `capturedPhotoUri` (string). |
| API Integrations | Calls diagnostic endpoints, handles `@capacitor/camera` triggers and `@capawesome/capacitor-torch` interfaces. |

### 20. Terms of Service Page
* File path: `app/terms/page.tsx`
* Security: Public

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Displays standard user terms agreements. |
| Visual Layout | Full page text display. |
| Hooks and Contexts | None. |
| Local States | None. |
| API Integrations | Static content with no database connections. |

### 21. Volunteer Workspace
* File path: `app/volunteer/page.tsx`
* Security: Role Gated (Volunteer)

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Lists assigned event details for coordinators. Toggles movement sensor bindings. |
| Visual Layout | Header details displaying event indicators and motion switches. |
| Hooks and Contexts | `useAuth`, `useShakeToScan`, `useState`, `useMemo`, `useCallback`, `useEffect`. |
| Local States | `events` (array), `isFetching` (boolean), `error` (string), `shakeError` (string). |
| API Integrations | Calls `/volunteer/events` database indexes. |

### 22. QR Scan verification Client
* File path: `app/volunteer/scanner/[eventId]/page.tsx` (renders ScannerClient)
* Security: Role Gated (Volunteer)

| Detail Type | Technical Specifications |
|---|---|
| Purpose | Decodes participant ticket QR codes and verifies entries. |
| Visual Layout | Camera preview viewport overlaying scan history grids. |
| Hooks and Contexts | `useParams`, `useAuth`, `useNetwork`, `useLoading`, `useNotifications`, `useShakeToScan`, `useState`, `useEffect`, `useRef`, `useLiveQuery`. |
| Local States | `isChecking` (boolean), `event` (object), `accessError` (string), `isScanning` (boolean), `cameraError` (string), `history` (array), `selectedRow` (object), `scanCount` (number), `viewportStatus` (string), `integrity` (object), `torchAvailable` (boolean), `torchEnabled` (boolean). |
| API Integrations | Checks system clocks for tampering. Calls `/events/:id/scan-qr` to verify admissions. |

---

## 7. Build and Verification CLI Reference

Perform local validation before merging updates.

| Operational Scope | Script Name | Executing Terminal Command |
|---|---|---|
| Development Node | `dev` | `next dev` |
| Code Optimization | `build` | `next build` |
| Local Host Deploy | `start` | `next start` |
| ESLint Inspections | `lint` | `eslint .` |
| Architecture Audits | `perf:audit:architecture` | `node scripts/perf/architecture-audit.mjs` |
| Payload Reporting | `perf:audit:routes` | `node scripts/perf/route-payload-report.mjs` |
| Lighthouse Diagnostics | `perf:lighthouse` | `node scripts/perf/run-lighthouse.mjs` |
| Execution Baselines | `perf:baseline:full` | `npm run lint && npm run perf:baseline` |

---

## 8. Capacitor Packaging Reference

The application compiles into native packages.

| Process Step | Action Performed | CLI Syntax |
|---|---|---|
| 1 | Compile the production bundles. | `npm run build` |
| 2 | Sync production files with Capacitor. | `npx cap sync android` |
| 3 | Boot Android Studio. | `npx cap open android` |
| 4 | Package the native debug APK. | `cd android && ./gradlew assembleDebug` |
