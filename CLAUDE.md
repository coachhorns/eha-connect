# EHA Connect — Claude Code Context

> **Elite Hoops Association** | Basketball player management, recruiting, live scoring, and stats platform.
> Production URL: **https://ehaconnect.com** | Deployed on **Vercel**

---

## 1. Project Overview

EHA Connect is a full-stack sports management platform for the Elite Hoops Association.

| Role | Description |
|------|-------------|
| `PARENT` | Default role. Manages player profile, views stats, sends recruiting emails. |
| `PLAYER` | Athlete who has claimed their own profile. |
| `PROGRAM_DIRECTOR` | Runs a club program. Manages teams/rosters, registers for events. |
| `SCOREKEEPER` | Assigned to live-score specific games. No profile management access. |
| `ADMIN` | Full platform access. |

**Core features:** Player profiles, live scoring, events/brackets, college recruiting, leaderboards, Stripe subscriptions, mobile app.

---

## 2. Monorepo Structure

```
eha-connect/
├── src/                    ← Next.js web app (App Router)
│   ├── app/                ← Pages & API routes
│   │   ├── admin/          ← Admin panel
│   │   ├── api/            ← All API routes
│   │   ├── auth/           ← Sign in / sign up / role selection
│   │   ├── dashboard/      ← Player/parent dashboard
│   │   ├── director/       ← Program director portal
│   │   ├── scorekeeper/    ← Live scoring interface
│   │   └── [events,players,teams,leaderboards,standings,results,games,pricing]/
│   ├── components/         ← layout/, players/, recruiting/, dashboard/, ui/
│   ├── hooks/useGameSync.ts
│   └── lib/
│       ├── auth.ts          ← NextAuth config
│       ├── get-session.ts   ← getSessionUser() — ALWAYS use this in API routes
│       ├── mobile-auth.ts   ← JWT for mobile (jose, 30d, HS256)
│       ├── permissions.ts   ← canViewStats(), isPrimaryGuardian(), canManagePlayer()
│       ├── prisma.ts        ← Prisma singleton
│       ├── email.ts         ← Resend client + email builders
│       ├── exposure.ts      ← ExposureClient (HMAC-signed API)
│       ├── stripe.ts        ← Stripe client + price IDs
│       ├── utils.ts         ← cn(), formatHeight/Position/GraduationYear, generateSlug, formatDate/DateTime/GameTime
│       └── scheduler/engine.ts ← Constraint-based auto-scheduler
├── prisma/
│   ├── schema.prisma       ← Full DB schema — READ THIS for model details
│   └── seed.ts
├── mobile/                 ← Expo React Native app
│   ├── app/
│   │   ├── (auth)/sign-in.tsx
│   │   ├── (tabs)/         ← _layout.tsx (liquid tab bar), index, events/, leaderboards, profile, more
│   │   ├── players/[slug].tsx + game-log.tsx
│   │   └── recruiting.tsx  ← 3-step wizard
│   ├── api/                ← client.ts + auth/events/players/leaderboards/recruiting/subscription/teams
│   ├── components/         ← ui/ (Button, Card, Loading, StatBox), EventCard, GameCard, DynamicSheet
│   ├── constants/colors.ts ← Full design token system — READ THIS for colors/fonts/spacing
│   ├── constants/config.ts ← API URL (defaults to https://ehaconnect.com)
│   ├── contexts/AuthContext.tsx
│   └── lib/storage.ts      ← SecureStore helpers
└── [next.config.ts, prisma.config.ts, package.json]
```

**Web dev:** `next dev` | **Build:** `npx prisma generate && next build`
**Mobile dev:** `cd mobile && npx expo start`
**Mobile builds:** `eas build --platform ios|android`

---

## 3. Tech Stack

**Web:** Next.js (App Router), React 19, TypeScript, Tailwind v4, Prisma 7, PostgreSQL (NeonDB), NextAuth 4, Stripe, Resend, Vercel Blob, Tanstack Query, DnD Kit, jose, bcryptjs, idb (offline), next-pwa

**Mobile:** Expo 54, React Native 0.81, Expo Router, Tanstack Query, Reanimated 4, Gesture Handler, Expo Blur/Image/Haptics/SecureStore/Notifications/LinearGradient, React Native WebView/SVG, Outfit + Inter fonts

---

## 4. Environment Variables

```env
DATABASE_URL=                    # NeonDB PostgreSQL
NEXTAUTH_URL=https://ehaconnect.com
NEXTAUTH_SECRET=                 # Also signs mobile JWTs
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ANNUAL=             # $50/year
STRIPE_PRICE_SEMI_ANNUAL=        # $35/6 months
STRIPE_PRICE_MONTHLY=            # $10/month
RESEND_API_KEY=
EMAIL_FROM=EHA Connect <noreply@ehaconnect.com>
BLOB_READ_WRITE_TOKEN=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
NEXT_PUBLIC_APP_URL=
EXPOSURE_API_KEY=
EXPOSURE_SECRET_KEY=
EXPOSURE_ORG_ID=
```

---

## 5. Database Schema

**See `prisma/schema.prisma` for full schema.** Key models:

| Model | Key fields |
|-------|-----------|
| `User` | id, email, password, role (PLAYER\|PARENT\|SCOREKEEPER\|PROGRAM_DIRECTOR\|ADMIN) |
| `Player` | id, slug, firstName, lastName, positions, school, graduationYear, exposureId, userId? |
| `Guardian` | userId, playerId, role (PRIMARY\|SECONDARY\|PLAYER), isPayer |
| `Team` | id, slug, name, division, gender, programId, exposureId |
| `Event` | id, slug, name, type (TOURNAMENT\|LEAGUE\|SHOWCASE\|CAMP), divisions[], exposureId |
| `Game` | id, eventId, homeTeamId, awayTeamId, status, courtId, bracketId, exposureId |
| `GameStats` | gameId, playerId, teamId — full box score per player |
| `StatLog` | gameId, statType, isUndone — live event log (supports undo) |
| `Subscription` | userId, plan (ANNUAL\|SEMI_ANNUAL\|MONTHLY), status, stripeIds |
| `College` + `CollegeCoach` | recruiting database |
| `RecruitingEmail` + `RecruitingEmailPlayer` | email log (multi-player) |
| `Bracket` + `BracketSlot` | bracket structure |
| `Venue` + `Court` | game locations |
| `EventCollegeRegistration` | recruiting packet (Stripe one-time payment) |

---

## 6. Authentication

**Strategy:** JWT sessions (not DB sessions)
**Providers:** Google OAuth (`allowDangerousEmailAccountLinking: true`) + Credentials (bcrypt)
**Session:** `id` and `role` attached to JWT and session via callbacks.

**Mobile auth** (`src/lib/mobile-auth.ts`):
- 30-day JWT signed with `NEXTAUTH_SECRET` (HS256 via jose)
- Payload: `{ id: userId, role }`

**Unified auth** (`src/lib/get-session.ts`):
- **ALWAYS use `getSessionUser(request)` in API routes** — never `getServerSession` directly
- Checks `Authorization: Bearer <token>` first (mobile), falls back to cookie (web)
- Returns `{ id, role, name, email, image }` or `null`

---

## 7. Pages & Routes

### Public
`/`, `/events`, `/events/[slug]`, `/players`, `/players/[slug]`, `/teams`, `/teams/[slug]`, `/leaderboards`, `/standings`, `/results`, `/games/[id]`, `/pricing`, auth pages

### Authenticated
`/dashboard`, `/dashboard/players/new`, `/dashboard/players/[id]/edit`, `/claim-player`, `/invite/[token]`

### Director (`PROGRAM_DIRECTOR`)
`/director/get-started`, `/director/onboarding`, `/director/dashboard`, `/director/program/edit`, `/director/teams/[id]`, `/director/roster-manager`

### Scorekeeper
`/scorekeeper`, `/scorekeeper/game/[id]`

### Admin (`/admin/*`)
Full CRUD for: events, games, teams, programs, players, users, venues, brackets, colleges. Plus: schedule view, auto-scheduler, exposure sync, settings/payments.

---

## 8. API Routes

### Key patterns
- Auth: `POST /api/auth/mobile/login` → `{ user, token }`, `GET /api/auth/mobile/session`
- Players: `GET /api/players/[slug]` (with careerStats), `GET /api/user/players`, `GET /api/user/guarded-players`
- Events: `GET /api/events`, `GET /api/public/events/[id]`, `GET /api/public/games/[id]`, `/api/public/standings`, `/api/public/results`
- Leaderboards: `GET /api/leaderboards?stat=ppg|rpg|apg|spg|bpg|fgPct`
- Recruiting: `GET /api/colleges?search=&division=&state=&schoolId=`, `POST /api/recruiting/send-email`, `GET /api/recruiting/log`
- Scorekeeper: `POST /api/scorekeeper/stats` (log stat), `POST /api/scorekeeper/stats/undo`
- Stripe: `POST /api/stripe/checkout`, `POST /api/stripe/webhook`
- Upload: `POST /api/upload` (Vercel Blob)
- Director: `/api/director/teams/[id]/roster`, `/api/director/roster-manager/move`
- Admin: `/api/admin/exposure/sync-events`, `/api/admin/exposure/sync-schedule`, `/api/admin/scheduler/auto`, `/api/admin/brackets/generate`

---

## 9. Key Library Functions

**`getSessionUser(request?)`** — Unified auth for API routes. Supports web + mobile.

**`canViewStats(userId, playerId)`** — Returns true if: guardian, admin, director (player on roster), active subscriber, or player is claimed (has any guardian).

**`ExposureClient`** (`src/lib/exposure.ts`) — HMAC-SHA256 signed requests to `exposureevents.com/api`. Methods: `getEvents()`, `getEvent(id)`, `createTeam()`, `updateTeam()`, `getSchedule(eventId)`.

**`sendEmail({ to, subject, html, replyTo? })`** — Resend SDK. From `noreply@ehaconnect.com`.

**`createMobileToken(userId, role)`** / **`verifyMobileToken(token)`** — 30-day mobile JWTs.

**`canViewStats`** / **`isPrimaryGuardian`** / **`canManagePlayer`** — in `src/lib/permissions.ts`.

---

## 10. Subscriptions & Payments

| Plan | Amount |
|------|--------|
| `ANNUAL` | $50.00/year |
| `SEMI_ANNUAL` | $35.00/6 months |
| `MONTHLY` | $10.00/month |

**Paywall:** Unclaimed player profiles require subscription. If player has any guardian → any logged-in user can view. Guardians, Directors (own roster), Admins always have access.

**Recruiting Packet** — Separate one-time Stripe payment for college coaches to register for an event (`EventCollegeRegistration`).

---

## 11. Email (Resend)

**From:** `EHA Connect <noreply@ehaconnect.com>`

**Types:** Recruiting email (branded HTML player card, Reply-To = player email), guardian invite, player invite, invite accepted confirmation.

---

## 12. Exposure Events Integration

**What:** `exposureevents.com` is EHA's tournament management system. EHA Connect syncs from it.

**Auth:** HMAC-SHA256 (`APIKey&VERB&TIMESTAMP&URI` → hashed → Base64 in `Authentication` header).

**Sync:** Admin routes pull events/schedule from Exposure and upsert into EHA DB. `exposureId` field on `Event`, `Team`, `Program`, `Player`, `Game` prevents duplicate syncs.

---

## 13. Mobile App

### Navigation
```
(tabs)/
  _layout.tsx   ← Morphing liquid pill tab bar (5 tabs, pan gesture, spring physics)
  index.tsx     ← Home / Player Dashboard
  events/       ← Events list + Event detail (Info/Schedule/Standings)
  leaderboards  ← Stats Hub (My Stats/Leaderboards/Standings segments)
  profile.tsx   ← My Profile
  more.tsx      ← Settings, subscription, sign out
(auth)/sign-in.tsx
players/[slug].tsx + game-log.tsx
recruiting.tsx    ← 3-step wizard (college search → coach select → compose)
```

### API Client (`mobile/api/client.ts`)
Reads JWT from `SecureStore`, attaches `Authorization: Bearer <token>`. Base URL defaults to `https://ehaconnect.com`. See `mobile/api/*.ts` for per-domain methods.

> **Important:** Expo Go always hits production. Backend changes must be deployed to affect Expo Go.

### Design System
See **`mobile/constants/colors.ts`** for full color tokens, spacing, font sizes, border radii, and font names.

**Key values:** navy `#0F172A`, red `#EF4444`, gold `#F59E0B`, surface `#1E293B`
**Fonts:** Outfit (headings), Inter (body)
**Header heights:** Home/Events iOS 100px / Android 80px. Stats Hub iOS 152px / Android 132px.
**Frosted glass headers:** `BlurView intensity=80 tint="dark"` + `rgba(15, 23, 42, 0.5)` overlay.
**Alternating rows:** `Colors.surface` (#1E293B) / `#182234`. Current user: gold text + 2px gold left border.

### State & Storage
- **Auth:** `AuthContext` — `user`, `token`, `signIn()`, `signOut()`
- **Server state:** Tanstack Query (pull-to-refresh via `refetch()`)
- **SecureStore keys:** `authToken`, `authUser`, `notifPrefs`
- No Redux/Zustand.

---

## 14. Key Patterns & Rules

### ✅ ALWAYS use `getSessionUser(request)` in API routes
```typescript
import { getSessionUser } from '@/lib/get-session'
export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
// ❌ Never: getServerSession(authOptions) — breaks mobile Bearer token auth
```

### Tab bar double-tap resets to root
```typescript
useEffect(() => {
  const unsub = navigation.addListener('tabPress' as any, () => {
    if (navigation.canGoBack()) navigation.popToTop()
    // OR reset local state: setSegment('mystats')
  })
  return unsub
}, [navigation])
```

### Recruiting email — multi-player support
`send-email` accepts `playerSlugs: string[]` (array) or `playerSlug: string` (legacy single). Always log to `RecruitingEmail` + `RecruitingEmailPlayer` junction.

### Exposure Events ID linking
Always store `exposureId` on synced models (Event, Team, Program, Player, Game) to prevent duplicate re-syncs.

### Stats paywall
Use `canViewStats(userId, playerId)` from `permissions.ts`. Web wraps stats in `<StatsPaywall>`.

### File upload
Vercel Blob via `POST /api/upload`. Token in `BLOB_READ_WRITE_TOKEN`.

---

## 15. Development Status & Known Bugs

### Completed (Web)
Auth, player profiles, guardian system, director portal, events, live scoring, brackets, auto-scheduler, leaderboards, standings, recruiting, recruiting packet, Stripe subscriptions, admin panel, Exposure sync, email, media, PWA.

### Completed (Mobile)
Auth, liquid tab bar, player dashboard, events (list + detail), stats hub, profile, more screen, recruiting wizard, recruiting email log, player detail, game log, push notification prefs, tab reset behavior.

### Known Bugs Fixed (don't regress)
- **Mobile 401 on recruiting email** — caused by `getServerSession` (cookie-only). Fixed: use `getSessionUser(request)`. Affects `send-email/route.ts` and `log/route.ts`.
- **Tab bar not resetting on re-tap** — fixed by only emitting `tabPress` (not calling `navigate`) when already focused. Child screen's listener handles `popToTop`.
- **Stats Hub segment persisting** — fixed with `tabPress` listener resetting local `segment` state (tabs stay mounted, state doesn't auto-reset on switch).

### Deployment
- **Platform:** Vercel | **Trigger:** push to `main` | **Production:** https://ehaconnect.com
- **Mobile:** Expo Go (dev hits production) | EAS Build (production)
- **Branch:** `main` (all work merged directly)
