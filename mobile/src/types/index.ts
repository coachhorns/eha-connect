// ── User & Auth ──────────────────────────────────────────────

export type UserRole = 'PLAYER' | 'PARENT' | 'SCOREKEEPER' | 'PROGRAM_DIRECTOR' | 'ADMIN';

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: UserRole;
}

export interface AuthSession {
  user: User;
  token: string;
}

// ── Players ──────────────────────────────────────────────────

export interface PlayerGuardian {
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
  };
}

export interface Player {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  position: string | null;
  primaryPosition: string | null;
  heightFeet: number | null;
  heightInches: number | null;
  weight: number | null;
  graduationYear: number | null;
  school: string | null;
  city: string | null;
  state: string | null;
  profilePhoto: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  gpa: number | null;
  userId: string | null;
  isVerified: boolean;
  createdAt: string;
  _count?: {
    gameStats: number;
    achievements: number;
  };
  guardians?: PlayerGuardian[];
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    role: string;
  };
  careerStats?: PlayerCareerStats | null;
  gameStats?: PlayerGameStats[];
}

export interface PlayerGameStats {
  id: string;
  gameId: string;
  playerId: string;
  teamId: string;
  minutes: number;
  points: number;
  fgMade: number;
  fgAttempted: number;
  fg3Made: number;
  fg3Attempted: number;
  ftMade: number;
  ftAttempted: number;
  offRebounds: number;
  defRebounds: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fouls: number;
  game: {
    id: string;
    scheduledAt: string | null;
    homeScore: number;
    awayScore: number;
    status: string;
    homeTeam: { name: string; slug: string } | null;
    awayTeam: { name: string; slug: string } | null;
    event: { name: string; slug: string } | null;
  };
}

export interface PlayerCareerStats {
  gamesPlayed: number;
  totals: PlayerStats;
  averages: PlayerStats;
  shooting: {
    fgPct: number;
    fg3Pct: number;
    ftPct: number;
  };
}

export interface PlayerStats {
  gamesPlayed: number;
  points: number;
  rebounds: number;
  assists: number;
  steals: number;
  blocks: number;
  turnovers: number;
  fgPercentage: number;
  threePtPercentage: number;
  ftPercentage: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
}

export interface PlayerMedia {
  id: string;
  url: string;
  type: 'IMAGE' | 'VIDEO';
  caption: string | null;
  createdAt: string;
}

// ── Events ───────────────────────────────────────────────────

export interface Event {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  location: string | null;
  city: string | null;
  state: string | null;
  imageUrl: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ACTIVE' | 'COMPLETED';
  ncaaCertified: boolean;
  createdAt: string;
}

// ── Games ────────────────────────────────────────────────────

export interface Game {
  id: string;
  eventId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeam: Team;
  awayTeam: Team;
  homeScore: number;
  awayScore: number;
  status: 'SCHEDULED' | 'LIVE' | 'FINAL';
  scheduledTime: string | null;
  court: string | null;
  period: number;
}

// ── Teams ────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  organization: string | null;
  ageGroup: string | null;
  logoUrl: string | null;
}

export interface RosterPlayer {
  id: string;
  playerId: string;
  teamId: string;
  jerseyNumber: string | null;
  player: Player;
}

// ── Leaderboard ──────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number;
  player: Player;
  value: number;
  statKey: string;
  gamesPlayed: number;
}

// ── Standings ────────────────────────────────────────────────

export interface Standing {
  team: Team;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  streak: string;
}

// ── Recruiting ───────────────────────────────────────────────

export interface College {
  id: string;
  name: string;
  division: string;
  conference: string | null;
  city: string | null;
  state: string | null;
  logoUrl: string | null;
  coaches?: CollegeCoach[];
}

export interface CollegeCoach {
  id: string;
  firstName: string;
  lastName: string;
  title: string | null;
  email: string | null;
}

export interface RecruitingEmailLog {
  id: string;
  coachName: string;
  coachEmail: string;
  collegeName: string;
  sentAt: string;
  players: { firstName: string; lastName: string }[];
}

export interface CollegeFilters {
  divisions: string[];
  states: string[];
}

export interface RecruitingLog {
  id: string;
  playerId: string;
  collegeId: string;
  college: College;
  type: string;
  notes: string | null;
  date: string;
}
