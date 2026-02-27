// EHA Brand Colors
export const colors = {
  primary: '#FF6B00', // Orange
  secondary: '#1A1A2E', // Dark blue
  accent: '#FFD700', // Gold
  background: '#0F0F1A', // Dark background
  surface: '#1A1A2E', // Surface/card background
  surfaceLight: '#1a3a6e', // Lighter surface
  text: '#FFFFFF',
  textMuted: '#9CA3AF',
  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',
}

// Subscription Plans
export const subscriptionPlans = {
  ANNUAL: {
    name: 'Annual Pass',
    price: 50,
    interval: 'year',
    description: 'Best value - Save $70/year',
    features: [
      'Full player profile with bio & photos',
      'Live stats tracked at every EHA event',
      'Shareable recruiting profile URL',
      'Email 10,000+ college coaches directly',
      'Leaderboard rankings',
      'Photo & video highlight gallery',
    ],
  },
  SEMI_ANNUAL: {
    // Keeping for code compatibility, but effectively hidden or unused if frontend removes it
    name: 'Semi-Annual',
    price: 35,
    interval: '6 months',
    description: 'Seasonal Access',
    features: [],
  },
  MONTHLY: {
    name: 'Monthly Plan',
    price: 10,
    interval: 'month',
    description: 'Flexible month-to-month',
    features: [
      'Full player profile with bio & photos',
      'Live stats tracked at every EHA event',
      'Shareable recruiting profile URL',
      'Email 10,000+ college coaches directly',
      'Leaderboard rankings',
      'Photo & video highlight gallery',
    ],
  },
}

// Family Plan Pricing (additional children)
export const familyPricing = {
  // Base prices in cents
  base: {
    ANNUAL: 5000,      // $50
    SEMI_ANNUAL: 3500, // $35
    MONTHLY: 1000,     // $10
  },
  // Additional child prices in cents
  additionalChild: {
    ANNUAL: 3500,      // $35 per additional child per year
    SEMI_ANNUAL: 2500, // $25 per additional child per 6 months
    MONTHLY: 700,      // $7 per additional child per month
  },
}

// Calculate total price for family plan
export function calculateFamilyPrice(plan: 'ANNUAL' | 'SEMI_ANNUAL' | 'MONTHLY', childCount: number): number {
  const base = familyPricing.base[plan]
  const additionalChildren = Math.max(0, childCount - 1)
  const additionalCost = familyPricing.additionalChild[plan] * additionalChildren
  return base + additionalCost
}

// College Recruiting Packet Pricing (in cents)
// Database division values: NCAA D1, NCAA DII, NCAA DIII, NAIA, JC, JC-CCCAA, JC-D1, JC-D2, JC-D3, JC-NWAC
const DIVISION_PRICE_MAP: Record<string, number> = {
  'ncaa d1':    52500, // $525
  'ncaa di':    52500,
  'ncaa dii':   25000, // $250
  'ncaa d2':    25000,
  'ncaa diii':  10000, // $100
  'ncaa d3':    10000,
  'naia':       20000, // $200
  'jc':          5000, // $50
  'jc-cccaa':    5000,
  'jc-d1':       5000,
  'jc-d2':       5000,
  'jc-d3':       5000,
  'jc-nwac':     5000,
}

const DEFAULT_PACKET_PRICE = 10000 // $100 fallback

export function getPacketPrice(division: string): number {
  const normalized = division.trim().toLowerCase()
  return DIVISION_PRICE_MAP[normalized] ?? DEFAULT_PACKET_PRICE
}

export function getPacketPriceLabel(division: string): string {
  const cents = getPacketPrice(division)
  return `$${(cents / 100).toFixed(2)}`
}

// Position options
export const positions = [
  { value: 'PG', label: 'Point Guard' },
  { value: 'SG', label: 'Shooting Guard' },
  { value: 'SF', label: 'Small Forward' },
  { value: 'PF', label: 'Power Forward' },
  { value: 'C', label: 'Center' },
]

// Combined divisions (age group + tier in one field, matching Exposure EventDivision names)
export const divisions = [
  // 15U-17U top tier
  'EPL 17', 'EPL 16', 'EPL 15',
  // 15U-17U lower tier
  '17U', '16U', '15U',
  // 14U and below
  '14U', '13U', '12U', '11U', '10U', '9U', '8U',
]

/** Extract age number from a combined division string (e.g. "EPL 17" -> 17, "14U Gold" -> 14) */
export function getAgeFromDivision(division: string): number | null {
  const match = division.match(/(\d+)/)
  return match ? parseInt(match[1], 10) : null
}

// States
export const states = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
]

// Stat categories for display
export const statCategories = [
  { key: 'points', label: 'PTS', fullLabel: 'Points' },
  { key: 'rebounds', label: 'REB', fullLabel: 'Rebounds' },
  { key: 'assists', label: 'AST', fullLabel: 'Assists' },
  { key: 'steals', label: 'STL', fullLabel: 'Steals' },
  { key: 'blocks', label: 'BLK', fullLabel: 'Blocks' },
  { key: 'fg3Made', label: '3PM', fullLabel: '3-Pointers Made' },
  { key: 'turnovers', label: 'TO', fullLabel: 'Turnovers' },
  { key: 'fouls', label: 'PF', fullLabel: 'Fouls' },
]

// Achievement badge configs
export const achievementBadges = {
  MVP: { label: 'MVP', color: 'bg-yellow-500', icon: 'trophy' },
  ALL_TOURNAMENT: { label: 'All-Tournament', color: 'bg-orange-500', icon: 'star' },
  CHAMPION: { label: 'Champion', color: 'bg-purple-500', icon: 'crown' },
  STAT_LEADER: { label: 'Stat Leader', color: 'bg-blue-500', icon: 'chart' },
  DEFENSIVE_PLAYER: { label: 'Defensive Player', color: 'bg-green-500', icon: 'shield' },
  MOST_IMPROVED: { label: 'Most Improved', color: 'bg-teal-500', icon: 'trending-up' },
  SPORTSMANSHIP: { label: 'Sportsmanship', color: 'bg-pink-500', icon: 'heart' },
  ALL_STAR: { label: 'All-Star', color: 'bg-red-500', icon: 'star' },
  TRIPLE_DOUBLE: { label: 'Triple-Double', color: 'bg-indigo-500', icon: 'award' },
  DOUBLE_DOUBLE: { label: 'Double-Double', color: 'bg-cyan-500', icon: 'award' },
}
