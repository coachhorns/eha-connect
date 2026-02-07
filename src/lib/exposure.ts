import crypto from 'crypto'

interface ExposureConfig {
    apiKey: string
    secretKey: string
    orgId?: string
}

export class ExposureClient {
    private config: ExposureConfig
    private baseUrl = 'https://exposureevents.com/api'

    constructor(config: ExposureConfig) {
        this.config = config
    }

    /**
     * Generates the HMAC-SHA256 signature required for authentication.
     * Format: APIKey&VERB&Timestamp&URI -> UpperCase -> Hashed with SecretKey -> Base64
     */
    private generateSignature(verb: string, uri: string, timestamp: string): string {
        // "The message being hashed is composed of the following parameters in the following order: 
        // API key, http verb, timestamp, and the relative URI. 
        // These parameters are seperated by an ampersand (&), and should be upper case."
        const payload = `${this.config.apiKey}&${verb}&${timestamp}&${uri}`.toUpperCase()
        const hmac = crypto.createHmac('sha256', this.config.secretKey)
        hmac.update(payload)
        return hmac.digest('base64')
    }

    private async request<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', body?: any): Promise<T> {
        const timestamp = new Date().toISOString()

        // Clean up URI for signature (must match exactly what is sent)
        // Docs example uses /api/v1/events
        const uri = endpoint.startsWith('/') ? `/api${endpoint}` : `/api/${endpoint}`

        const signature = this.generateSignature(method, uri, timestamp)

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            // "The signed request is stored in the authentication header... composed of the API key and a base64 encoded hashed signature seperated by a period."
            'Authentication': `${this.config.apiKey}.${signature}`,
            'Timestamp': timestamp
        }

        const url = `${this.baseUrl}${endpoint}`

        try {
            const res = await fetch(url, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            })

            if (!res.ok) {
                const errorText = await res.text()
                throw new Error(`Exposure API Error (${res.status}): ${errorText}`)
            }

            return res.json() as Promise<T>
        } catch (error) {
            console.error('Exposure API Request Failed:', error)
            throw error
        }
    }

    // --- Events ---

    async getEvents(params?: { seasonId?: string; type?: string }) {
        const query = params ? `?${new URLSearchParams(params as any)}` : ''
        // Endpoint: GET /api/v1/events
        return this.request<{ Events: any[] }>(`/v1/events${query}`)
    }

    async getEvent(id: string) {
        return this.request<any>(`/v1/events/${id}`)
    }

    // --- Teams ---

    async createTeam(data: ExposureTeamRequest) {
        // Endpoint: POST /api/v1/teams
        return this.request<{ Id: number }>(`/v1/teams`, 'POST', data)
    }

    async updateTeam(teamId: string, data: ExposureTeamRequest) {
        return this.request<any>(`/v1/teams/${teamId}`, 'PUT', data)
    }

    // --- Schedule ---

    async getSchedule(eventId: string) {
        return this.request<any>(`/v1/events/${eventId}/games`)
    }
}

// Interfaces based on Exposure API Docs
export interface ExposureTeamPlayer {
    FirstName: string
    LastName: string
    Number: string
    // Position? MemberType?
}

export interface ExposureTeamRequest {
    EventId: number    // Required - Exposure Event ID
    DivisionId: number // Required
    Name: string       // Required
    Notes?: string     // For Schedule Requests
    Players?: ExposureTeamPlayer[]
    Address?: {
        City?: string
        StateRegion?: string
        PostalCode?: string
    }
    CoachName?: string // Not in standard payload but useful if supported or put in notes
}

// Singleton instance (initialized with env vars)
export const exposureClient = new ExposureClient({
    apiKey: process.env.EXPOSURE_API_KEY || '',
    secretKey: process.env.EXPOSURE_SECRET_KEY || '',
    orgId: process.env.EXPOSURE_ORG_ID,
})
