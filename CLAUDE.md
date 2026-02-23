# EHA Connect — Claude Code Context

> **Elite Hoops Association** | Basketball player management, recruiting, live scoring, and stats platform.
> Production URL: **https://ehaconnect.com** | Deployed on **Vercel**

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Web App — Tech Stack](#3-web-app--tech-stack)
4. [Web App — Environment Variables](#4-web-app--environment-variables)
5. [Database — Full Prisma Schema](#5-database--full-prisma-schema)
6. [Web App — Authentication](#6-web-app--authentication)
7. [Web App — Pages & Routes](#7-web-app--pages--routes)
8. [Web App — API Routes](#8-web-app--api-routes)
9. [Web App — Components & Lib](#9-web-app--components--lib)
10. [Web App — Subscriptions & Payments](#10-web-app--subscriptions--payments)
11. [Web App — Email (Resend)](#11-web-app--email-resend)
12. [Web App — Exposure Events Integration](#12-web-app--exposure-events-integration)
13. [Mobile App — Tech Stack](#13-mobile-app--tech-stack)
14. [Mobile App — Navigation Structure](#14-mobile-app--navigation-structure)
15. [Mobile App — Screens (Detailed)](#15-mobile-app--screens-detailed)
16. [Mobile App — API Client & Endpoints](#16-mobile-app--api-client--endpoints)
17. [Mobile App — Design System](#17-mobile-app--design-system)
18. [Mobile App — Components](#18-mobile-app--components)
19. [Mobile App — State & Storage](#19-mobile-app--state--storage)
20. [Key Patterns & Rules](#20-key-patterns--rules)
21. [Current Development Status](#21-current-development-status)

---

## 1. Project Overview

EHA Connect is a full-stack sports management platform built for the Elite Hoops Association (EHA). It serves several distinct user types:

| Role | Description |
|------|-------------|
| `PARENT` | Default role. Manages a player's profile, views stats, sends recruiting emails. |
| `PLAYER` | Athlete who has claimed their own profile. |
| `PROGRAM_DIRECTOR` | Runs a club program. Manages teams/rosters, registers for events, sends bulk recruiting emails. |
| `SCOREKEEPER` | Assigned to live-score specific games. No profile management access. |
| `ADMIN` | Full platform access. Manages events, games, schedules, brackets, users. |

**Core feature pillars:**
- **Player Profiles** — stats, photos, film/highlights, bio, social links, recruiting profile
- **Live Scoring** — real-time scorekeeper interface with undo support and per-player stats
- **Events** — tournament/showcase creation, team registration, bracket generation, standings
- **College Recruiting** — searchable college/coach database, one-click email with branded player card
- **Leaderboards & Standings** — across all EHA events
- **Subscriptions** — Stripe-powered paywall for stats access
- **Mobile App** — Expo/React Native companion app mirroring core features

---

## 2. Monorepo Structure

```
eha-connect/                     ← Git root
├── src/                         ← Next.js web app
│   ├── app/                     ← App Router pages & API routes
│   │   ├── admin/               ← Admin panel pages
│   │   ├── api/                 ← All API routes
│   │   ├── auth/                ← Sign in / sign up / role selection
│   │   ├── claim-player/        ← Claim player profile page
│   │   ├── dashboard/           ← Player/parent dashboard
│   │   ├── director/            ← Program director portal
│   │   ├── events/              ← Public events pages
│   │   ├── games/               ← Game detail
│   │   ├── invite/              ← Guardian invite acceptance
│   │   ├── leaderboards/        ← Leaderboards pages
│   │   ├── players/             ← Player directory & profiles
│   │   ├── pricing/             ← Pricing page
│   │   ├── results/             ← Game results
│   │   ├── scorekeeper/         ← Live scoring interface
│   │   ├── standings/           ← Standings page
│   │   ├── teams/               ← Teams directory & profiles
│   │   ├── layout.tsx           ← Root layout (providers, navbar, footer)
│   │   ├── page.tsx             ← Landing/home page
│   │   └── globals.css          ← Global styles (Tailwind v4)
│   ├── components/              ← Shared React components
│   │   ├── admin/               ← Admin-only components (EventForm)
│   │   ├── dashboard/           ← Dashboard components (InviteCoParentModal)
│   │   ├── events/              ← CollegesAttending
│   │   ├── layout/              ← Navbar, Footer
│   │   ├── players/             ← PlayerCard, FilmRoomSection, PhotoGallery, etc.
│   │   ├── providers/           ← QueryProvider, SessionProvider
│   │   ├── recruiting/          ← RecruitingButton, RecruitingModal, RecruitingPacketModal
│   │   └── ui/                  ← Generic UI primitives
│   ├── hooks/
│   │   └── useGameSync.ts       ← WebSocket/polling hook for live game updates
│   ├── lib/
│   │   ├── auth.ts              ← NextAuth config (Google + Credentials, JWT strategy)
│   │   ├── constants.ts         ← App-wide constants
│   │   ├── email.ts             ← Resend email client + email builders
│   │   ├── exposure.ts          ← ExposureClient (Exposure Events API integration)
│   │   ├── get-session.ts       ← getSessionUser() — unified auth (web cookie + mobile Bearer)
│   │   ├── mobile-auth.ts       ← JWT generation/verification for mobile (jose, 30d expiry)
│   │   ├── offline-db.ts        ← IndexedDB for scorekeeper offline support (idb)
│   │   ├── permissions.ts       ← canViewStats(), isPrimaryGuardian(), canManagePlayer()
│   │   ├── prisma.ts            ← Prisma client singleton
│   │   ├── scheduler/
│   │   │   └── engine.ts        ← Auto-scheduler engine (constraint-based game scheduling)
│   │   ├── stripe.ts            ← Stripe client + price IDs + PRICE_AMOUNTS
│   │   ├── stripe-dynamic.ts    ← Dynamic Stripe import (avoids edge runtime issues)
│   │   ├── sync/
│   │   │   └── exposure.ts      ← Sync logic between EHA and Exposure Events
│   │   ├── timezone.ts          ← Timezone utilities
│   │   ├── utils.ts             ← cn(), general helpers
│   │   └── video.ts             ← Video URL helpers
│   └── types/
│       └── next-auth.d.ts       ← Extends NextAuth session to include id & role
├── prisma/
│   ├── schema.prisma            ← Full database schema (PostgreSQL / NeonDB)
│   └── seed.ts                  ← Database seeder
├── mobile/                      ← Expo React Native app
│   ├── app/                     ← Expo Router file-based navigation
│   │   ├── (auth)/              ← Auth screens (not inside tabs)
│   │   │   └── sign-in.tsx      ← Login screen
│   │   ├── (tabs)/              ← Main tab navigator
│   │   │   ├── _layout.tsx      ← Custom morphing liquid tab bar
│   │   │   ├── index.tsx        ← Home / Player Dashboard
│   │   │   ├── events/
│   │   │   │   ├── index.tsx    ← Events list
│   │   │   │   └── [id].tsx     ← Event detail (Info / Schedule / Standings)
│   │   │   ├── leaderboards.tsx ← Stats Hub (My Stats / Leaderboards / Standings)
│   │   │   ├── profile.tsx      ← My Profile
│   │   │   └── more.tsx         ← More menu (settings, sign out)
│   │   ├── players/
│   │   │   ├── [slug].tsx       ← Player detail screen
│   │   │   └── game-log.tsx     ← Full game log
│   │   └── recruiting.tsx       ← 3-step recruiting wizard (modal overlay)
│   ├── api/                     ← API client modules
│   │   ├── client.ts            ← Base HTTP client (Bearer token auth)
│   │   ├── auth.ts              ← Auth API calls
│   │   ├── events.ts            ← Events API calls
│   │   ├── leaderboards.ts      ← Leaderboards API calls
│   │   ├── players.ts           ← Players API calls
│   │   ├── recruiting.ts        ← Recruiting API calls
│   │   └── subscription.ts      ← Subscription API calls
│   ├── components/              ← Shared mobile components
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Loading.tsx
│   │   │   └── StatBox.tsx
│   │   ├── DynamicSheet.tsx     ← Reusable bottom sheet
│   │   ├── EventCard.tsx        ← 185px event card with banner image
│   │   ├── GameCard.tsx         ← Game matchup card
│   │   ├── RecruitingPacketSheet.tsx
│   │   └── RegisterTeamSheet.tsx
│   ├── constants/
│   │   ├── colors.ts            ← Full design token system
│   │   └── config.ts            ← API URL config (defaults to https://ehaconnect.com)
│   ├── contexts/
│   │   └── AuthContext.tsx      ← User auth state + signIn/signOut
│   ├── hooks/                   ← Custom hooks (if any)
│   ├── types/
│   │   └── index.ts             ← All TypeScript types
│   ├── assets/
│   │   └── eha-connect-logo.png ← Logo used in headers
│   ├── app.json                 ← Expo app config
│   └── package.json
├── public/                      ← Next.js public assets
│   └── logo.png                 ← Logo used in recruiting emails
├── CLAUDE.md                    ← This file
└── package.json                 ← Web app dependencies
```

---

## 3. Web App — Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.2 | Framework (App Router, SSR, API routes) |
| React | 19.2.3 | UI |
| TypeScript | ^5 | Type safety |
| Tailwind CSS | v4 | Styling |
| Prisma | 7.2.0 | ORM |
| PostgreSQL | — | Database (NeonDB serverless) |
| NextAuth | 4.24.13 | Web authentication |
| jose | — | JWT creation/verification for mobile auth |
| bcryptjs | ^3.0.3 | Password hashing |
| Stripe | 20.1.2 | Payments (subscriptions + event registrations) |
| Resend | 6.9.1 | Transactional email |
| Vercel Blob | ^2.0.1 | File/image storage |
| @tanstack/react-query | 5.90.19 | Server state management |
| DnD Kit | — | Drag-and-drop scheduling UI |
| Lucide React | 0.562.0 | Icons |
| PapaParse | 5.5.3 | CSV parsing (roster import) |
| date-fns + date-fns-tz | 4.1.0 | Date formatting |
| OpenAI | 6.16.0 | (integrated, usage TBD) |
| idb | 8.0.3 | IndexedDB (scorekeeper offline mode) |
| next-pwa | 10.2.9 | PWA support |
| @neondatabase/serverless | 1.0.2 | NeonDB WebSocket driver |

**Build command:** `npx prisma generate && next build`
**Dev command:** `next dev`

---

## 4. Web App — Environment Variables

```env
# Database
DATABASE_URL=                    # NeonDB PostgreSQL connection string

# Auth
NEXTAUTH_URL=https://ehaconnect.com
NEXTAUTH_SECRET=                 # Also used for mobile JWT signing

# OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ANNUAL=             # Price ID for $50/year plan
STRIPE_PRICE_SEMI_ANNUAL=        # Price ID for $35/6-month plan
STRIPE_PRICE_MONTHLY=            # Price ID for $10/month plan

# Email
RESEND_API_KEY=
EMAIL_FROM=EHA Connect <noreply@ehaconnect.com>

# File Storage
BLOB_READ_WRITE_TOKEN=           # Vercel Blob token

# Exposure Events Integration
EXPOSURE_API_KEY=
EXPOSURE_SECRET_KEY=
EXPOSURE_ORG_ID=
```

---

## 5. Database — Full Prisma Schema

**Provider:** PostgreSQL (NeonDB serverless)

### Models

#### `User`
```
id, email (unique), emailVerified, password, name, image
role: UserRole (PLAYER|PARENT|SCOREKEEPER|PROGRAM_DIRECTOR|ADMIN)
createdAt, updatedAt
→ accounts[], sessions[], players[], subscription?, ownedPrograms[], guardians[], sentInvites[], recruitingEmails[]
```

#### `Account` (NextAuth OAuth)
```
id, userId, type, provider, providerAccountId
refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
→ user (User)
```

#### `Session` (NextAuth)
```
id, sessionToken (unique), userId, expires → user (User)
```

#### `VerificationToken`
```
identifier, token (unique), expires
```

#### `Subscription`
```
id, userId (unique)
plan: SubscriptionPlan (ANNUAL|SEMI_ANNUAL|MONTHLY)
status: SubscriptionStatus (ACTIVE|PAST_DUE|CANCELED|EXPIRED|TRIALING)
stripeCustomerId, stripeSubscriptionId, stripePriceId
childCount (default 1)
currentPeriodStart, currentPeriodEnd, cancelAtPeriodEnd
```
Actual prices (from stripe.ts): ANNUAL=$50, SEMI_ANNUAL=$35, MONTHLY=$10

#### `Guardian`
```
id, userId, playerId
role: GuardianRole (PRIMARY|SECONDARY|PLAYER)
isPayer: Boolean
@@unique([userId, playerId])
→ user (User), player (Player)
```

#### `GuardianInvite`
```
id, token (unique, cuid), email, playerId, invitedBy
role: GuardianRole, expiresAt, acceptedAt
→ player (Player), inviter (User)
```

#### `Player`
```
id, slug (unique)
firstName, lastName, email, phone
heightFeet, heightInches, weight (lbs)
primaryPosition, secondaryPosition: Position (PG|SG|SF|PF|C)
jerseyNumber
school, city, state, graduationYear
profilePhoto (URL), bio (Text), gpa, transcriptUrl (PDF URL)
isVerified, verifiedAt, dateOfBirth, gradeLevel (6-12)
twitterHandle, instagramHandle, hudlUrl, youtubeUrl, highlightUrl, maxPrepsUrl
isActive, createdAt, updatedAt
userId? (legacy — use guardians)
exposureId? (unique — Exposure Events system ID)
→ teamRosters[], gameStats[], achievements[], media[], guardians[], guardianInvites[], recruitingEmailPlayers[]
```

#### `Program` (Club)
```
id, slug (unique), name, directorName, directorEmail, directorPhone
logo (URL), city, state, isActive
ownerId? → owner (User)
exposureId? (unique)
→ teams[]
```

#### `Team`
```
id, slug (unique), name, logo (URL)
city, state, division, gender (Boys|Girls)
wins, losses
coachName, coachEmail, coachPhone
isActive, programId? → program (Program)
exposureId? (unique)
→ roster[], homeGames[], awayGames[], eventTeams[]
```

#### `TeamRoster`
```
id, teamId, playerId
jerseyNumber, isStarter, isCaptain
joinedAt, leftAt?
@@unique([teamId, playerId])
```

#### `Event`
```
id, slug (unique), name
type: EventType (TOURNAMENT|LEAGUE|SHOWCASE|CAMP)
description (Text)
venue, address, city, state
startDate, endDate, registrationDeadline?
divisions: String[] (e.g. ["EPL 17", "EPL 16"])
entryFee: Decimal?
bannerImage, flyerImage (1080x1440)
isPublished, isNcaaCertified, isActive
exposureId? (unique)
→ games[], teams[], awards[], venues[], brackets[], constraints[], collegeRegistrations[]
```

#### `EventTeam`
```
id, eventId, teamId
pool?, seed?
eventWins, eventLosses, pointsFor, pointsAgainst
registeredAt, scheduleRequests (Json?)
@@unique([eventId, teamId])
```

#### `EventAward`
```
id, eventId
type: AwardType (MVP|ALL_TOURNAMENT_FIRST|ALL_TOURNAMENT_SECOND|CHAMPION|RUNNER_UP|DEFENSIVE_MVP|SCORING_LEADER|ASSISTS_LEADER|REBOUNDS_LEADER)
division?, playerId?, teamId?
```

#### `Venue`
```
id, name, address, city, state, zip
timezone (default "America/Chicago")
→ courts[], events[]
```

#### `Court`
```
id, name (e.g. "Court 1"), venueId
→ venue (Venue), games[]
@@unique([venueId, name])
```

#### `Bracket`
```
id, eventId, name, type: BracketType (SINGLE_ELIM|DOUBLE_ELIM|POOL_PLAY|ROUND_ROBIN)
settings (Json — e.g. {gamesPerRound: 2, seedingMethod: "record"})
→ event, games[], slots[]
```

#### `BracketSlot`
```
id, bracketId, round, position
gameId? (unique — linked game once scheduled)
@@unique([bracketId, round, position])
```

#### `ScheduleConstraint`
```
id, eventId
type: ConstraintType (NO_CONFLICT|MIN_REST|VENUE_BLOCK)
entityType: String (TEAM|COURT|VENUE)
entityId?, params (Json — {minMinutes: 60} | {blockedTimes: [...]})
```

#### `Game`
```
id, eventId?
homeTeamId, awayTeamId
homeScore, awayScore
scheduledAt, startedAt?, endedAt?
courtId?, court? (legacy string field)
status: GameStatus (SCHEDULED|WARMUP|IN_PROGRESS|HALFTIME|FINAL|POSTPONED|CANCELED)
currentPeriod, periodScores (Json?)
division?, gameType: GameType (POOL|BRACKET|CONSOLATION|CHAMPIONSHIP|EXHIBITION)
poolCode?
bracketId?, bracketRound?, bracketPosition?
isOfficial (stats finalized)
exposureId? (unique string)
homeTeamLabel?, awayTeamLabel? (for bracket display e.g. "1st in A")
→ stats[], statLog[], bracketSlot?
```

#### `GameStats` (per-player per-game stats)
```
id, gameId, playerId, teamId
minutes, points
fgMade, fgAttempted, fg3Made, fg3Attempted, ftMade, ftAttempted
offRebounds, defRebounds, rebounds
assists, steals, blocks, turnovers, fouls, plusMinus
@@unique([gameId, playerId])
```

#### `StatLog` (live stat event log, supports undo)
```
id, gameId, playerId?, teamId
statType: StatType (PTS_2|PTS_3|PTS_FT|FG_MISS|FG3_MISS|FT_MISS|OREB|DREB|AST|STL|BLK|TO|FOUL)
value (default 1, can be 2 or 3 for points)
period, gameTime?, isUndone, createdAt, createdBy?
@@index([gameId, createdAt])
```

#### `Achievement`
```
id, playerId
type: AchievementType (MVP|ALL_TOURNAMENT|CHAMPION|STAT_LEADER|DEFENSIVE_PLAYER|MOST_IMPROVED|SPORTSMANSHIP|ALL_STAR|TRIPLE_DOUBLE|DOUBLE_DOUBLE)
title, description?, eventId?, eventName?, season?
```

#### `Media`
```
id, playerId
type: MediaType (PHOTO|VIDEO|HIGHLIGHT)
url, thumbnail?, title?, description?
eventId?, gameId?
isPublic, isFeatured
uploadedAt
```

#### `College`
```
id, name, slug (unique), division, conference?, city?, state?, region?, logo?
@@unique([name, state])
→ coaches[], recruitingEmails[], eventRegistrations[]
```

#### `CollegeCoach`
```
id, collegeId, firstName, lastName, title?, email?, phone?
→ college (College), recruitingEmails[], eventRegistrations[]
```

#### `RecruitingEmail`
```
id, sentById → User
coachId? → CollegeCoach, collegeId? → College
coachName (denormalized), coachEmail (denormalized), collegeName (denormalized)
sentAt
→ players: RecruitingEmailPlayer[]
```

#### `RecruitingEmailPlayer`
```
id, recruitingEmailId, playerId
@@unique([recruitingEmailId, playerId])
```

#### `EventCollegeRegistration` (Recruiting Packet)
```
id, eventId, collegeCoachId?, collegeId?
firstName, lastName, school, email (.edu), division
amountPaid: Decimal, stripeSessionId?, stripePaymentId?
paymentStatus: PaymentStatus (PENDING|COMPLETED|FAILED|REFUNDED)
wantsPhysicalCopy: Boolean
@@unique([eventId, email])
```

#### `SystemSetting`
```
key (id), value (Text), isPrivate, updatedAt
```

---

## 6. Web App — Authentication

**Strategy:** JWT sessions (not database sessions)

**Providers:**
1. **Google OAuth** — `allowDangerousEmailAccountLinking: true`
2. **Credentials** — email + bcrypt password verification

**JWT/Session callbacks:** Attach `id` and `role` to token and session.

**Mobile auth** (`src/lib/mobile-auth.ts`):
- Creates 30-day JWT signed with `NEXTAUTH_SECRET` using `jose` (HS256)
- Token payload: `{ id: userId, role }`
- `getMobileUser(request)` — verifies Bearer token, looks up user in DB

**Unified auth** (`src/lib/get-session.ts` — `getSessionUser(request?)`):
- ALWAYS use this in API routes (not `getServerSession` directly)
- Checks `Authorization: Bearer <token>` first (mobile)
- Falls back to `getServerSession` cookie (web)
- Returns `{ id, role, name, email, image }` or `null`

**Sign-in page:** `/auth/signin`
**Error page:** `/auth/error`
**Role selection:** `/auth/role-selection` (after first sign up)

---

## 7. Web App — Pages & Routes

### Public Pages
| Route | Purpose |
|-------|---------|
| `/` | Landing/home page |
| `/auth/signin` | Sign in (credentials + Google) |
| `/auth/signup` | Register new account |
| `/auth/role-selection` | Choose role after sign up |
| `/events` | Public events list |
| `/events/[slug]` | Event detail (Info, Schedule, Standings, Teams) |
| `/events/[slug]/register` | Team event registration |
| `/events/[slug]/register/director` | Director event registration flow |
| `/players` | Player directory |
| `/players/[slug]` | Player public profile (stats paywalled) |
| `/teams` | Teams directory |
| `/teams/[slug]` | Team profile |
| `/leaderboards` | Leaderboards overview |
| `/leaderboards/leaderboard` | Specific category leaderboard |
| `/standings` | League standings |
| `/results` | Game results |
| `/games/[id]` | Game box score |
| `/pricing` | Subscription pricing page |

### Authenticated Pages
| Route | Purpose |
|-------|---------|
| `/dashboard` | Player/parent dashboard (stats, schedule, recruiting) |
| `/dashboard/players/new` | Create player profile |
| `/dashboard/players/[id]/edit` | Edit player profile |
| `/dashboard/settings` | Account settings |
| `/claim-player` | Claim an unclaimed player profile |
| `/invite/[token]` | Accept guardian invite |

### Director Pages (`PROGRAM_DIRECTOR` role)
| Route | Purpose |
|-------|---------|
| `/director/get-started` | Onboarding start |
| `/director/onboarding` | Program setup wizard |
| `/director/dashboard` | Director home |
| `/director/program/edit` | Edit program details |
| `/director/teams/new` | Create team |
| `/director/teams/[id]` | Team management (roster, stats) |
| `/director/roster-manager` | Drag-and-drop roster manager across teams |

### Scorekeeper Pages
| Route | Purpose |
|-------|---------|
| `/scorekeeper` | Scorekeeper's assigned game list |
| `/scorekeeper/game/[id]` | Live scoring interface (real-time stats, undo, period control) |

### Admin Pages (`/admin/*`) — `ADMIN` role required
| Route | Purpose |
|-------|---------|
| `/admin` | Admin dashboard |
| `/admin/events` | List events |
| `/admin/events/new` | Create event |
| `/admin/events/[id]` | Event detail |
| `/admin/events/[id]/edit` | Edit event |
| `/admin/events/[id]/teams` | Manage event teams |
| `/admin/games` | List games |
| `/admin/games/new` | Create game |
| `/admin/games/[id]` | Game detail |
| `/admin/games/[id]/edit` | Edit game |
| `/admin/teams` | List teams |
| `/admin/teams/new` | Create team |
| `/admin/teams/[id]` | Team detail |
| `/admin/teams/[id]/edit` | Edit team |
| `/admin/programs` | List programs |
| `/admin/programs/new` | Create program |
| `/admin/programs/[id]` | Program detail |
| `/admin/programs/[id]/edit` | Edit program |
| `/admin/players` | Player directory |
| `/admin/players/new` | Create player |
| `/admin/users` | User management |
| `/admin/venues` | Venue list |
| `/admin/venues/new` | Create venue |
| `/admin/venues/[id]/edit` | Edit venue |
| `/admin/schedule` | Schedule view |
| `/admin/scheduler/auto` | Auto-scheduler (constraint engine) |
| `/admin/brackets/new` | Create bracket |
| `/admin/brackets` | List brackets |
| `/admin/colleges/import` | Import colleges CSV |
| `/admin/settings` | System settings |
| `/admin/settings/payments` | Payment settings |

---

## 8. Web App — API Routes

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| `*` | `/api/auth/[...nextauth]` | NextAuth handler |
| `POST` | `/api/auth/mobile/login` | Email/password login → returns `{ user, token }` |
| `GET` | `/api/auth/mobile/session` | Verify mobile token → returns `{ user }` |
| `POST` | `/api/auth/mobile/google` | Google OAuth for mobile → returns `{ user, token }` |
| `POST` | `/api/auth/register` | Register new user |

### User
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/user/players` | Players owned by current user |
| `GET` | `/api/user/guarded-players` | Players user is guardian of |
| `PUT` | `/api/user/players/[id]` | Update player profile |
| `GET/POST` | `/api/user/players/[id]/media` | Get/upload player media |
| `GET` | `/api/user/subscription` | Subscription status |

### Players
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/players` | List players (public) |
| `GET` | `/api/players/[slug]` | Player detail with careerStats |
| `POST` | `/api/claim-player` | Claim player profile |
| `POST` | `/api/guardians/invite` | Invite co-parent or player |
| `GET` | `/api/guardians/invite/[token]` | Get/accept invite |

### Events (Public)
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/events` | List published events |
| `GET` | `/api/public/events/[id]` | Event detail (no auth) |
| `GET` | `/api/public/games/[id]` | Games for an event (no auth) |
| `GET` | `/api/public/standings` | Standings by `?eventId=` (no auth) |
| `GET` | `/api/public/results` | Results by `?eventId=` (no auth) |

### Event Registration
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/events/[id]/register` | Register team for event |
| `POST` | `/api/events/[id]/register-teams` | Batch register teams |
| `GET/POST` | `/api/events/[id]/teams` | Event teams |
| `GET/PUT/DELETE` | `/api/events/[id]/teams/[teamId]` | Specific event team |

### Recruiting
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/colleges` | Search colleges + coaches (`?search=`, `?division=`, `?state=`, `?schoolId=`) |
| `POST` | `/api/recruiting/send-email` | Send branded recruiting email |
| `GET` | `/api/recruiting/log` | Recruiting email history |
| `GET` | `/api/recruiting-packet/attendees` | Colleges attending an event |
| `POST` | `/api/recruiting-packet/register` | College coach registers for recruiting packet |
| `GET` | `/api/recruiting-packet/search-coach` | Search coaches by email |

### Leaderboards & Standings
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/leaderboards` | Leaderboard by `?stat=ppg\|rpg\|apg\|spg\|bpg\|fgPct` |
| `GET` | `/api/standings` | League standings |
| `GET` | `/api/teams` | Teams list |

### Director
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/director/program` | Get director's program |
| `GET/POST` | `/api/director/teams` | Teams in program |
| `GET/PUT/DELETE` | `/api/director/teams/[id]` | Specific team |
| `GET/POST` | `/api/director/teams/[id]/roster` | Roster management |
| `POST` | `/api/director/teams/[id]/roster/batch` | Batch add roster |
| `POST` | `/api/director/teams/[id]/roster/parse` | Parse roster CSV |
| `POST` | `/api/director/teams/[id]/push-exposure` | Push team to Exposure Events |
| `GET` | `/api/director/players/search` | Search all players |
| `POST` | `/api/director/roster-manager/move` | Move player between teams |

### Scorekeeper
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/scorekeeper/games` | Assigned games |
| `GET/PUT` | `/api/scorekeeper/games/[id]` | Game detail |
| `POST` | `/api/scorekeeper/games/[id]/stats` | Submit box score stats |
| `PUT` | `/api/scorekeeper/games/[id]/status` | Change game status |
| `POST` | `/api/scorekeeper/stats` | Log a single live stat event |
| `POST` | `/api/scorekeeper/stats/undo` | Undo last stat |

### Stripe
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/stripe/checkout` | Create checkout session |
| `POST` | `/api/stripe/webhook` | Stripe webhook (fulfillment) |

### Upload
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/upload` | Upload file to Vercel Blob |

### Admin API (all require `ADMIN` role)
| Method | Route | Description |
|--------|-------|-------------|
| `GET/POST` | `/api/admin/events` | List/create events |
| `GET/PUT/DELETE` | `/api/admin/events/[id]` | Event CRUD |
| `GET/POST` | `/api/admin/events/[id]/teams` | Event teams |
| `POST` | `/api/admin/events/[id]/push-team` | Push team to Exposure |
| `GET` | `/api/admin/events/[id]/export-colleges` | Export college list |
| `GET` | `/api/admin/events/[id]/export-restrictions` | Export schedule restrictions |
| `GET/POST` | `/api/admin/games` | Games |
| `GET/PUT/DELETE` | `/api/admin/games/[id]` | Game CRUD |
| `GET/POST` | `/api/admin/teams` | Teams |
| `GET/PUT/DELETE` | `/api/admin/teams/[id]` | Team CRUD |
| `GET/POST` | `/api/admin/programs` | Programs |
| `GET/PUT/DELETE` | `/api/admin/programs/[id]` | Program CRUD |
| `GET` | `/api/admin/users` | Users list |
| `PUT/DELETE` | `/api/admin/users/[id]` | User management |
| `GET/POST` | `/api/admin/venues` | Venues |
| `PUT/DELETE` | `/api/admin/venues/[id]` | Venue CRUD |
| `GET` | `/api/admin/schedule` | Schedule view |
| `POST` | `/api/admin/scheduler/auto` | Auto-generate schedule |
| `GET/POST` | `/api/admin/brackets` | Brackets |
| `POST` | `/api/admin/brackets/generate` | Generate bracket |
| `POST` | `/api/admin/colleges/import` | Import colleges CSV |
| `GET/PUT` | `/api/admin/settings` | System settings |
| `GET` | `/api/admin/stats` | Platform stats |
| `POST` | `/api/admin/upload` | Admin file upload |
| `GET` | `/api/admin/exposure/preview-events` | Preview Exposure sync |
| `POST` | `/api/admin/exposure/sync-events` | Sync events from Exposure |
| `POST` | `/api/admin/exposure/sync-schedule` | Sync schedule from Exposure |
| `GET` | `/api/admin/debug` | Debug info |

---

## 9. Web App — Components & Lib

### Layout Components (`src/components/layout/`)
- **`Navbar`** — Top nav with logo, links, auth state, role-based menu
- **`Footer`** — Site footer

### UI Primitives (`src/components/ui/`)
- **`Button`** — variant (primary|secondary|outline|ghost), size (sm|md|lg)
- **`Card`** — bordered card with padding
- **`Input`** — styled form input
- **`Select`** — styled select dropdown
- **`Modal`** — overlay modal
- **`Avatar`** — user/player avatar with fallback initials
- **`Badge`** — status/role badge
- **`Tabs`** — tabbed interface
- **`ImageUpload`** — drag-and-drop image upload with crop (react-easy-crop)
- **`VerifiedBadge`** — verified player checkmark

### Player Components (`src/components/players/`)
- **`PlayerCard`** — player listing card
- **`FilmRoomSection`** — embedded Hudl/YouTube highlights
- **`PhotoGallery`** — photo grid
- **`StatsPaywall`** — gate component requiring subscription/guardian
- **`ContactCoachButton`** — trigger to email a coach
- **`ShareProfileButton`** — share player profile link

### Recruiting Components (`src/components/recruiting/`)
- **`RecruitingButton`** — "Email Coaches" trigger
- **`RecruitingModal`** — college/coach search + email composer (multi-step)
- **`RecruitingPacketModal`** — college coach registration for recruiting packet

### Provider Components
- **`QueryProvider`** — wraps app with `@tanstack/react-query` QueryClient
- **`SessionProvider`** — NextAuth session provider

### Key Library Functions

**`getSessionUser(request?)`** — Use in every API route that needs auth. Supports both web (cookie) and mobile (Bearer token).

**`canViewStats(userId, playerId)`** — Permission check. Returns true if: guardian, admin, director (player on roster), active subscriber, or player is claimed.

**`ExposureClient`** — HTTP client for Exposure Events API. HMAC-SHA256 signed requests. Used to sync teams, games, schedule.

**`sendEmail({ to, subject, html, replyTo? })`** — Sends via Resend. Uses `noreply@ehaconnect.com`. Returns `{ success, id }` or `{ success: false, error }`.

**`buildInviteEmail()`** / **`buildInviteAcceptedEmail()`** — Pre-built HTML email templates for guardian invites.

**`createMobileToken(userId, role)`** — Creates 30-day JWT for mobile app.

**`verifyMobileToken(token)`** — Verifies mobile JWT.

---

## 10. Web App — Subscriptions & Payments

**Plans** (from `src/lib/stripe.ts`):
| Plan | Env Key | Amount |
|------|---------|--------|
| `ANNUAL` | `STRIPE_PRICE_ANNUAL` | $50.00/year |
| `SEMI_ANNUAL` | `STRIPE_PRICE_SEMI_ANNUAL` | $35.00/6 months |
| `MONTHLY` | `STRIPE_PRICE_MONTHLY` | $10.00/month |

**Paywall logic** (`src/lib/permissions.ts → canViewStats()`):
- Unclaimed player profiles require subscription to view stats
- If player has any guardian → any logged-in user can view (player is "claimed")
- Guardians, Program Directors (for their roster), Admins always have access

**Stripe Webhook** (`/api/stripe/webhook`) — handles payment fulfillment, subscription status updates

**Event Recruiting Packet** — separate one-time Stripe payment for college coaches to register for an event. Amount in `EventCollegeRegistration.amountPaid`.

---

## 11. Web App — Email (Resend)

**From:** `EHA Connect <noreply@ehaconnect.com>`
**Client:** Resend SDK (`resend` package)

**Email types:**
1. **Recruiting email** — Branded HTML with player card (gradient dark navy + red), player photo/stats/badges, "View Profile" CTA button. Reply-To set to player's email. Built in `src/app/api/recruiting/send-email/route.ts`.
2. **Guardian invite (to parent)** — Invite co-parent to manage player profile.
3. **Player invite** — Invite athlete to claim their own profile.
4. **Invite accepted confirmation** — Sent to inviter when invite is accepted.

---

## 12. Web App — Exposure Events Integration

**What it is:** Exposure Events (`exposureevents.com`) is the tournament management system EHA uses. EHA Connect syncs with it.

**Client** (`src/lib/exposure.ts`):
- Base URL: `https://exposureevents.com/api`
- Auth: HMAC-SHA256 signed requests (`APIKey&VERB&TIMESTAMP&URI` uppercased → hashed with SecretKey → Base64) in `Authentication` header
- Methods: `getEvents()`, `getEvent(id)`, `createTeam()`, `updateTeam()`, `getSchedule(eventId)`

**Sync operations** (admin routes):
- `POST /api/admin/exposure/sync-events` — pull events from Exposure → create/update in EHA DB
- `POST /api/admin/exposure/sync-schedule` — pull games/schedule from Exposure
- `GET /api/admin/exposure/preview-events` — preview what would sync

**Linking:** `exposureId` field on `Event`, `Team`, `Program`, `Player`, `Game` models stores Exposure system IDs.

---

## 13. Mobile App — Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Expo | 54.0.33 | Framework |
| React Native | 0.81.5 | UI |
| React | 19.1.0 | UI |
| TypeScript | ~5.9.2 | Type safety |
| Expo Router | ~6.0.23 | File-based navigation |
| @tanstack/react-query | ^5.90.0 | Data fetching & caching |
| React Native Reanimated | ~4.1.1 | 60fps animations |
| React Native Gesture Handler | ~2.28.0 | Pan/tap gestures |
| Expo Blur | ~15.0.8 | BlurView for frosted glass |
| Expo Image | ~3.0.11 | Optimized image loading |
| Expo Haptics | ~15.0.8 | Haptic feedback |
| Expo Secure Store | ~15.0.8 | Token storage |
| Expo Notifications | ~0.32.16 | Push notifications |
| Expo Linear Gradient | ~15.0.8 | Gradient overlays |
| React Native WebView | ^13.15.0 | Google Maps embed |
| React Native SVG | 15.12.1 | Custom icons |
| @expo-google-fonts/outfit | ^0.4.3 | Outfit font family |
| @expo-google-fonts/inter | ^0.4.2 | Inter font family |
| date-fns | ^4.1.0 | Date formatting |

**Dev server:** `cd mobile && npx expo start`
**iOS build:** `eas build --platform ios`
**Android build:** `eas build --platform android`

**API URL config** (`mobile/constants/config.ts`):
- Order: `expoConfig.extra.apiUrl` → `EXPO_PUBLIC_API_URL` env var → `'https://ehaconnect.com'`
- **Important:** Expo Go always hits production (`https://ehaconnect.com`). Backend changes must be deployed to affect Expo Go.

---

## 14. Mobile App — Navigation Structure

```
_layout.tsx (root)
└── (tabs)/_layout.tsx   ← Custom Liquid Tab Bar (5 tabs)
    ├── Tab 0: index.tsx               → Home / Player Dashboard
    ├── Tab 1: events/
    │   ├── index.tsx                  → Events list
    │   └── [id].tsx                   → Event detail (3 segments)
    ├── Tab 2: leaderboards.tsx        → Stats Hub (3 segments)
    ├── Tab 3: profile.tsx             → My Profile
    └── Tab 4: more.tsx               → More (settings, sign out)

(auth)/
└── sign-in.tsx          → Login screen

players/
├── [slug].tsx           → Player detail
└── game-log.tsx         → Full game log

recruiting.tsx           → 3-step recruiting wizard (full-screen modal)
```

**Tab reset behavior (all tabs):** Each tab listens for `tabPress` event via `navigation.addListener('tabPress')`. When the tab icon is tapped while already on that tab, the stack pops to root. When switching to a tab that has a deep nested stack, the `_layout.tsx` navigates to the root screen of that tab.

---

## 15. Mobile App — Screens (Detailed)

### Tab 0 — Home (`index.tsx`)
**Header:** Frosted glass (BlurView intensity=80, dark tint) — iOS: 100px, Android: 80px. EHA Connect logo (72x72) + "Player Dashboard" title + bell notification button.

**Content sections:**
1. **Player Hero** — Full-width profile photo (`SCREEN_WIDTH × SCREEN_WIDTH * 1.1`) with gradient overlay. Shows player name, school, class year, position. Fallback: navy bg with initials.
2. **Season Averages Card** — PPG/RPG/APG (large), STL/BLK/TO (secondary), FG%/3P%/FT% (shooting). Tappable → Game Log.
3. **UP NEXT** — Next 3 upcoming games/events with date, time, teams, court.
4. **College Recruiting** (Premium gold-accented section) — Lists players with "Email Coaches" button each. Shows last 5 sent recruiting emails (coach, college, date).
5. **Notification Panel** — Modal overlay (260px), top-right anchored. Toggles for: New Game Added, Schedule Change, Game Update. Persisted to `SecureStore` key `notifPrefs`.

**Data:** `playersApi.getMyPlayers()`, `playersApi.getGuardedPlayers()`, `eventsApi.list()`, `playersApi.getBySlug()`, `recruitingApi.getEmailLog()`

---

### Tab 1 — Events (`events/index.tsx`)
**Header:** Frosted glass — iOS: 100px, Android: 80px. Logo + "Events" title.

**Collapsible controls (110px):** Scroll down >5px hides them, scroll up reveals. Contains:
- Search bar (`rgba(255,255,255,0.07)` background, `⌕` icon)
- Filter pills: All | ● Live | Upcoming | Past

**List:** `FlatList` of `EventCard` components (185px height, banner image, gradient overlay, LIVE badge, NCAA CERTIFIED badge).

**Tab reset:** `tabPress` listener calls `navigation.popToTop()` if deep in stack.

#### Event Detail (`events/[id].tsx`)
**Hero:** 340px with banner image, gradient overlay, back button, event name/dates/location overlaid.

**Three segments:**
- **INFO:** Description, division chips, Google Maps embed (180px WebView), "Get Directions" button, Recruiting Packet card, Register Team card.
- **SCHEDULE:** Division filter pills → games grouped by day → `GameCard` per game.
- **STANDINGS:** Multi-pool table (Team, W, L, DIFF), alternating row colors.

**Data:** `eventsApi.getById()`, `eventsApi.getGames()`, `eventsApi.getStandings()`

---

### Tab 2 — Stats Hub (`leaderboards.tsx`)
**Header:** Frosted glass — iOS: 152px, Android: 132px. Logo + "Stats Hub" title + 3-segment control embedded in header.

**Tab reset:** `tabPress` listener resets `segment` to `'mystats'` and `statsMode` to `'avg'`.

**Three segments:**

#### MY STATS
- Compact identity row: 48px avatar, name, position, class year, GP badge
- Toggle: Per Game | Season Totals
- Stats card: PTS/REB/AST (large ~30px), STL/BLK/TO (secondary ~20px), FG%/3P%/FT%
- **My Rankings:** Shows rank for PPG/RPG/APG/SPG/BPG/FG%. Gold (1st), Silver (2nd), Bronze (3rd) badges. Tappable → jumps to Leaderboards segment for that category.

#### LEADERBOARDS
- Horizontal scrollable pills: PPG | RPG | APG | SPG | BPG | FG%
- Active: red background
- Rows: rank badge (top 3 colored), avatar (42px), name/position/year, stat value
- Alternating row backgrounds: `Colors.surface` / `#182234`
- Current user highlighted: gold text + 2px gold left border

#### STANDINGS
- Accordion by division: header (name, count, chevron) + expandable table
- Columns: Team logo (24px) + name | GP | W (green) | L (red) | DIFF (green/red)
- Alternating: `Colors.surface` / `#182234`

**Data:** 6 parallel leaderboard queries via `Promise.all`, `playersApi.getBySlug()`, `/api/standings` (lazy loaded on segment switch)

---

### Tab 3 — Profile (`profile.tsx`)
Avatar (100x100, 3px red border), name, position/class year badges, school, location, height/weight/GPA card, bio, "View Full Profile" and "Edit Profile" buttons. If parent with multiple players: list of player switcher.

**Data:** `playersApi.getMyPlayers()`, `playersApi.getGuardedPlayers()`

---

### Tab 4 — More (`more.tsx`)
- Account card: red avatar (56px) with initial, name, email, role badge
- Subscription: plan + status, "Manage" button → Stripe
- Program section (PROGRAM_DIRECTOR/ADMIN): My Teams, Recruiting
- General: Notifications, Privacy Policy, Terms of Service
- Sign Out (red, confirmation alert)
- Version: "EHA Connect v1.0.0"

**Data:** `subscriptionApi.getStatus()`

---

### Recruiting Screen (`recruiting.tsx`) — Full-screen modal overlay
**3-step wizard:**

1. **Search & Filter** — Debounced search (400ms), division filter pills, college result rows
2. **Coaches List** — College header, coach rows with "Email" button (red) per coach
3. **Compose Email** — Read-only TO field, subject (pre-filled), message textarea (pre-filled template), Send button

**Data:** `recruitingApi.getFilters()`, `recruitingApi.searchColleges()`, `recruitingApi.getCollegeWithCoaches()`, `recruitingApi.sendEmail()`

---

### Auth — Sign In (`(auth)/sign-in.tsx`)
- Background action photo with `contentPosition: { left: '62%', top: '50%' }` (reveals EHA backboard logo)
- Dark overlay: `rgba(5, 10, 25, 0.72)`
- Logo (340x180)
- Email + password inputs
- Sign In button (semi-transparent white)
- "Don't have an account? Create one" link

**Data:** `authApi.login(email, password)` → POST `/api/auth/mobile/login`

---

### Custom Tab Bar (`(tabs)/_layout.tsx`)
**Design:** Morphing liquid pill bar — compact pill (56px height, 320px width max) expands to full panel (175px height, 380px width max) when "More" is tapped.

**Tab icons:** Custom SVG-style hand-coded icons (no external library). Each icon: home, calendar, chart/stats, person, grid.

**Behavior:**
- Pan gesture: draggable pill snaps to tab positions. Clamped to prevent accidental "more" activation.
- Proximity animation: icon scale/opacity based on distance from active pill center
- Spring physics: SLIDE_SPRING, MORPH_SPRING, SNAP_SPRING, EXPAND_SPRING (custom damping/stiffness)
- Haptics: medium impact on expand, light on action press
- Backdrop tap: closes expanded panel

**More panel quick actions:**
- Email Coaches (gold `#F59E0B`)
- Schedule (info blue `#3B82F6`)
- Rankings (red `#EF4444`)
- My Profile (green `#10B981`)

**Tab reset logic (in `navigateToTab`):**
- If already focused: emit `tabPress` only (no `navigate`). Lets child screen's `tabPress` listener handle `popToTop`.
- If switching to unfocused tab with deep stack: reads `state.routes[index].state.index > 0` and navigates to root screen via `{ screen: rootName }`.

---

## 16. Mobile App — API Client & Endpoints

**Base client** (`mobile/api/client.ts`):
- Default base URL: `https://ehaconnect.com` (from `mobile/constants/config.ts`)
- Auth: reads JWT from `SecureStore`, attaches as `Authorization: Bearer <token>`
- Methods: `get<T>(path, params?)`, `post<T>(path, body?)`, `put<T>(path, body?)`, `delete<T>(path)`

### Events API (`mobile/api/events.ts`)
| Method | Endpoint | Returns |
|--------|----------|---------|
| `list()` | `GET /api/events?limit=50` | `Event[]` |
| `getById(id)` | `GET /api/public/events/{id}` | `Event` |
| `getGames(eventId)` | `GET /api/public/games/{eventId}` | `Game[]` |
| `getStandings(eventId)` | `GET /api/public/standings?eventId={id}` | standings map |
| `getResults(eventId)` | `GET /api/public/results?eventId={id}` | `Game[]` |
| `getTeams(eventId)` | `GET /api/events/{id}/teams` | `{ teams }` |

### Players API (`mobile/api/players.ts`)
| Method | Endpoint | Returns |
|--------|----------|---------|
| `list(params?)` | `GET /api/players` | `Player[]` |
| `getBySlug(slug)` | `GET /api/players/{slug}` | `Player` with careerStats |
| `getMyPlayers()` | `GET /api/user/players` | `Player[]` |
| `getGuardedPlayers()` | `GET /api/user/guarded-players` | `Player[]` |
| `updatePlayer(id, data)` | `PUT /api/user/players/{id}` | `Player` |
| `getMedia(id)` | `GET /api/user/players/{id}/media` | `PlayerMedia[]` |
| `uploadMedia(id, formData)` | `POST /api/user/players/{id}/media` | `PlayerMedia` |
| `claimPlayer(data)` | `POST /api/claim-player` | `{ success }` |

### Leaderboards API (`mobile/api/leaderboards.ts`)
| Method | Endpoint | Returns |
|--------|----------|---------|
| `get(params?)` | `GET /api/leaderboards?stat=ppg\|rpg\|apg\|spg\|bpg\|fgPct` | `LeaderboardEntry[]` |

### Recruiting API (`mobile/api/recruiting.ts`)
| Method | Endpoint | Returns |
|--------|----------|---------|
| `getFilters()` | `GET /api/colleges` | `CollegeFilters` |
| `searchColleges(q)` | `GET /api/colleges?search={q}` | `{ colleges }` |
| `filterColleges(params)` | `GET /api/colleges?division=&state=` | `{ colleges }` |
| `getCollegeWithCoaches(id)` | `GET /api/colleges?schoolId={id}` | `{ college }` |
| `sendEmail(data)` | `POST /api/recruiting/send-email` | `{ success, id }` |
| `getEmailLog()` | `GET /api/recruiting/log` | `RecruitingEmailLog[]` |

### Auth API (`mobile/api/auth.ts`)
| Method | Endpoint | Returns |
|--------|----------|---------|
| `login(email, password)` | `POST /api/auth/mobile/login` | `{ user, token }` |
| `register(data)` | `POST /api/auth/register` | `LoginResponse` |
| `getSession()` | `GET /api/auth/mobile/session` | `{ user }` |
| `googleAuth(idToken)` | `POST /api/auth/mobile/google` | `LoginResponse` |

### Subscription API (`mobile/api/subscription.ts`)
| Method | Endpoint | Returns |
|--------|----------|---------|
| `getStatus()` | `GET /api/user/subscription` | `Subscription` |
| `createCheckout(priceId)` | `POST /api/stripe/checkout` | `{ url }` |

---

## 17. Mobile App — Design System

### Colors (`mobile/constants/colors.ts`)
```typescript
Colors = {
  // EHA Brand
  navy: '#0F172A',
  navySurface: '#1E293B',
  navyLight: '#334155',
  red: '#EF4444',
  redLight: '#F87171',
  gold: '#F59E0B',
  goldLight: '#FBBF24',
  silver: '#9CA3AF',

  // Backgrounds
  background: '#0F172A',
  surface: '#1E293B',
  surfaceLight: '#334155',
  surfaceElevated: '#475569',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textInverse: '#0F172A',

  // Status
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',

  // UI
  border: '#334155',
  borderLight: '#475569',
  inputBackground: '#1E293B',
  tabBarBackground: '#0F172A',
  tabBarBorder: '#1E293B',
  activeTab: '#EF4444',
  inactiveTab: '#64748B',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  shimmer: 'rgba(255, 255, 255, 0.05)',
}

Spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 }
FontSize = { xs: 11, sm: 13, md: 15, lg: 17, xl: 20, xxl: 24, xxxl: 32, hero: 40 }
BorderRadius = { sm: 6, md: 10, lg: 14, xl: 20, full: 9999 }

Fonts = {
  heading: 'Outfit_700Bold',
  headingSemiBold: 'Outfit_600SemiBold',
  headingBlack: 'Outfit_800ExtraBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemiBold: 'Inter_600SemiBold',
  bodyBold: 'Inter_700Bold',
}
```

### Frosted Glass Header Pattern (ALL tabs use this)
```tsx
<View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100 }}>
  <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill}>
    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center',
                   paddingHorizontal: Spacing.lg, backgroundColor: 'rgba(15, 23, 42, 0.5)',
                   paddingTop: Platform.OS === 'ios' ? 50 : 30 }}>
      <Image source={require('../../../assets/eha-connect-logo.png')}
             style={{ width: 72, height: 72 }} contentFit="contain" />
      <Text style={{ fontFamily: Fonts.headingBlack, color: Colors.textPrimary, fontSize: FontSize.lg }}>
        Tab Name
      </Text>
    </View>
  </BlurView>
  <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0,
                  height: 1, backgroundColor: 'rgba(255, 255, 255, 0.08)' }} />
</View>
```

**Header heights:**
- Home / Events: iOS 100px, Android 80px
- Stats Hub (has segment control in header): iOS 152px, Android 132px

### Alternating Row Colors (tables, leaderboards)
- Primary: `Colors.surface` (`#1E293B`)
- Secondary: `#182234`
- "You" highlight: gold text + 2px left border `Colors.gold`

### Standard List Content Padding
```tsx
contentContainerStyle={{ paddingTop: HEADER_HEIGHT + CONTROLS_HEIGHT + Spacing.md, paddingBottom: 100 }}
```

---

## 18. Mobile App — Components

### UI Primitives (`mobile/components/ui/`)

**`Button`** — `variant` (primary=red|secondary=navy|outline=red border|ghost=red text), `size` (sm 36px|md 44px|lg 52px), `loading`, `disabled`. Haptic light on press.

**`Card`** — Padded bordered card (`Colors.border`, `BorderRadius.lg`). variant (default|elevated|navy).

**`StatBox`** — Label + value display. `highlight` variant: navy bg, gold value. Min-width 70px.

**`Loading`** — Centered `ActivityIndicator` + optional message.

### Domain Components

**`EventCard`** (`mobile/components/EventCard.tsx`) — 185px height. Banner image with gradient. LIVE badge (red), NCAA CERTIFIED badge (gold border). Bottom overlay: event name, dates, location.

**`GameCard`** (`mobile/components/GameCard.tsx`) — Home vs Away matchup. Score, scheduled time, court, status badge.

**`DynamicSheet`** — Reusable bottom sheet modal.

**`RecruitingPacketSheet`** — Modal for college coach event registration.

**`RegisterTeamSheet`** — Modal for director to register teams at event.

---

## 19. Mobile App — State & Storage

**Auth State** (`mobile/contexts/AuthContext.tsx`):
- Context provides: `user`, `token`, `signIn(email, password)`, `signOut()`
- Token stored in `SecureStore` key: `authToken`
- User stored in `SecureStore` key: `authUser`

**Server State:** `@tanstack/react-query` with `QueryClient`. Queries keyed by endpoint + params. Pull-to-refresh via `refetch()`.

**SecureStore keys:**
- `authToken` — Mobile JWT
- `authUser` — Serialized user object
- `notifPrefs` — Notification preferences JSON

**No Redux/Zustand.** State is React Query (server) + useState (local) + AuthContext (auth) only.

---

## 20. Key Patterns & Rules

### Always use `getSessionUser(request)` in API routes
Never use `getServerSession(authOptions)` directly in API routes — it won't work for mobile clients. The unified helper handles both web cookies and mobile Bearer tokens.

```typescript
// ✅ Correct
import { getSessionUser } from '@/lib/get-session'
export async function GET(request: Request) {
  const user = await getSessionUser(request)
  if (!user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}

// ❌ Wrong (breaks mobile)
import { getServerSession } from 'next-auth'
const session = await getServerSession(authOptions)
```

### Mobile API calls always include Bearer token
The `mobile/api/client.ts` base client reads from `SecureStore` and attaches `Authorization: Bearer <token>` automatically. All API modules use this client.

### Tab bar double-tap resets to root
Each screen that is a tab root should have this `useEffect`:
```typescript
useEffect(() => {
  const unsub = navigation.addListener('tabPress' as any, () => {
    if (navigation.canGoBack()) navigation.popToTop()
    // OR for screens with local state to reset:
    setSegment('default')
  })
  return unsub
}, [navigation])
```

### Recruiting email multi-player support
`send-email` route accepts both `playerSlugs: string[]` (array) and `playerSlug: string` (single, backwards compat). Always log to `RecruitingEmail` + `RecruitingEmailPlayer` junction table.

### Exposure Events ID linking
When syncing from Exposure Events, always store the external ID in the `exposureId` field on the model. This prevents duplicates on re-sync and enables two-way updates.

### Stats paywall
Use `canViewStats(userId, playerId)` from `src/lib/permissions.ts`. The web player profile page wraps detailed stats in `<StatsPaywall>`. Claimed players (has any guardian) are viewable by any logged-in user without subscription.

### File upload
Use Vercel Blob (`@vercel/blob`) via `POST /api/upload`. Blob token in `BLOB_READ_WRITE_TOKEN`.

---

## 21. Current Development Status

### Web App — Completed Features
- [x] Full authentication (Google OAuth + email/password, role selection)
- [x] Player profiles with stats, photos, film room, bio, social links
- [x] Guardian system (PRIMARY/SECONDARY/PLAYER roles, invite flow)
- [x] Program Director portal (program management, multi-team rosters, CSV import)
- [x] Events system (create, publish, divisions, team registration)
- [x] Live scorekeeper interface (real-time stat logging, undo, period control, offline support)
- [x] Bracket generation (single elim, double elim, pool play, round robin)
- [x] Auto-scheduler (constraint-based game generation)
- [x] Leaderboards (PPG/RPG/APG/SPG/BPG/FG%)
- [x] Standings
- [x] College recruiting (searchable DB, branded email with player card)
- [x] Recruiting packet (college coach event registration, Stripe payment)
- [x] Stripe subscriptions (Annual/Semi-Annual/Monthly plans)
- [x] Admin panel (full CRUD for all entities)
- [x] Exposure Events integration (sync events, teams, schedule)
- [x] Email system (Resend — invites, recruiting, confirmations)
- [x] Player media (photos, videos, highlights)
- [x] PWA support

### Mobile App — Completed Features
- [x] Authentication (email/password sign in, JWT tokens in SecureStore)
- [x] Custom morphing liquid tab bar (5 tabs, spring physics, pan gesture, haptics)
- [x] Home / Player Dashboard (hero photo, season stats, upcoming games, recruiting log)
- [x] Events list with search, Live/Upcoming/Past filters
- [x] Event detail with 3 segments (Info + Maps, Schedule, Standings)
- [x] Stats Hub (My Stats / Leaderboards / Standings segments, division rankings)
- [x] My Profile screen
- [x] More screen (settings, subscription management, sign out)
- [x] Recruiting wizard (3-step: college search → coach select → email compose)
- [x] Recruiting email log on home screen
- [x] Player detail screen with stats
- [x] Game log screen
- [x] Push notification preferences (3 toggles, persisted to SecureStore)
- [x] Tab bar double-tap resets to root for all tabs
- [x] Stats Hub always resets to "My Stats" segment when switching tabs

### Known Patterns / Past Bugs Fixed
- **Mobile 401 on recruiting email:** Was caused by using `getServerSession` (cookie-only) instead of `getSessionUser(request)` (supports Bearer token). Fixed in `send-email/route.ts` and `log/route.ts`.
- **Tab bar not resetting on re-tap:** Fixed by only emitting `tabPress` (not calling `navigate`) when already on the focused tab. Child screen's listener handles `popToTop`.
- **Stats Hub segment persisting:** Fixed with `tabPress` listener resetting local `segment` state (not a navigation issue, just local React state not resetting because tabs stay mounted).

### Active Branch
`main` (all mobile work merged directly to main after feature completion)

### Deployment
- **Platform:** Vercel
- **Trigger:** Push to `main` → auto-deploy
- **Production:** https://ehaconnect.com
- **Mobile:** Expo Go (development) | EAS Build (production)
