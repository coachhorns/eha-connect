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
    price: 75,
    interval: 'year',
    description: 'Best value - Save $45',
    features: [
      'Full player profile',
      'Stats tracking for all events',
      'Achievement badges',
      'Photo/video gallery',
      'College coach exposure',
      'PDF profile download',
    ],
  },
  SEMI_ANNUAL: {
    name: 'Semi-Annual',
    price: 50,
    interval: '6 months',
    description: 'Great for one season',
    features: [
      'Full player profile',
      'Stats tracking for all events',
      'Achievement badges',
      'Photo/video gallery',
      'College coach exposure',
      'PDF profile download',
    ],
  },
  MONTHLY: {
    name: 'Monthly Plan',
    price: 10,
    interval: 'month',
    description: '$10/month for 12 months',
    features: [
      'Full player profile',
      'Stats tracking for all events',
      'Achievement badges',
      'Photo/video gallery',
      'College coach exposure',
      'PDF profile download',
    ],
  },
}

// Family Plan Pricing (additional children)
export const familyPricing = {
  // Base prices in cents
  base: {
    ANNUAL: 7500,      // $75
    SEMI_ANNUAL: 5000, // $50
    MONTHLY: 1000,     // $10
  },
  // Additional child prices in cents
  additionalChild: {
    ANNUAL: 5000,      // $50 per additional child per year
    SEMI_ANNUAL: 3500, // $35 per additional child per 6 months
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

// Position options
export const positions = [
  { value: 'PG', label: 'Point Guard' },
  { value: 'SG', label: 'Shooting Guard' },
  { value: 'SF', label: 'Small Forward' },
  { value: 'PF', label: 'Power Forward' },
  { value: 'C', label: 'Center' },
]

// Age groups
export const ageGroups = ['17U', '16U', '15U', '14U', '13U', '12U', '11U', '10U', '9U', '8U']

// Divisions
export const divisions = ['EPL', 'Gold', 'Silver']

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
