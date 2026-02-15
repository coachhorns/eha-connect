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

export interface Player {
  id: string;
  slug: string;
  firstName: string;
  lastName: string;
  position: string | null;
  heightInches: number | null;
  weight: number | null;
  graduationYear: number | null;
  school: string | null;
  city: string | null;
  state: string | null;
  profileImageUrl: string | null;
  bio: string | null;
  gpa: number | null;
  userId: string | null;
  createdAt: string;
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
  state: string | null;
  logoUrl: string | null;
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
