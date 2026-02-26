import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Paths that bypass the coming-soon redirect
const ALLOWED_PREFIXES = [
  '/coming-soon',
  '/join/',
  '/director/',
  '/auth/',
  '/api/',
  '/admin/',
  '/scorekeeper/',
  '/_next/',
  '/images/',
  '/icons/',
]

const ALLOWED_EXACT = [
  '/sw.js',
  '/manifest.json',
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
]

const PREVIEW_SECRET = process.env.PREVIEW_SECRET || 'eha2025preview'
const PREVIEW_COOKIE = '__eha_preview'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Allow exact-match static files
  if (ALLOWED_EXACT.includes(pathname)) {
    return NextResponse.next()
  }

  // 2. Allow paths by prefix
  for (const prefix of ALLOWED_PREFIXES) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next()
    }
  }

  // 3. Allow mobile API requests (Bearer token)
  const authHeader = request.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    return NextResponse.next()
  }

  // 4. Check preview bypass cookie
  const previewCookie = request.cookies.get(PREVIEW_COOKIE)
  if (previewCookie?.value === '1') {
    return NextResponse.next()
  }

  // 5. Check preview bypass query param — set cookie and redirect to clean URL
  const previewParam = request.nextUrl.searchParams.get('preview')
  if (previewParam === PREVIEW_SECRET) {
    const cleanUrl = new URL(pathname, request.url)
    const response = NextResponse.redirect(cleanUrl)
    response.cookies.set(PREVIEW_COOKIE, '1', {
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return response
  }

  // 6. Check if user is authenticated with ADMIN or PROGRAM_DIRECTOR role
  try {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    })

    if (token?.role === 'ADMIN' || token?.role === 'PROGRAM_DIRECTOR') {
      return NextResponse.next()
    }
  } catch {
    // Token parsing failed — continue to redirect
  }

  // 7. Redirect everything else to coming-soon
  return NextResponse.redirect(new URL('/coming-soon', request.url))
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
}
