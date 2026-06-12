import {
  NextRequest,
  NextResponse,
} from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/sitemap.xml',
  '/robots.txt',
]

const ROLE_ROUTES = {
  ADMIN: '/dashboard/admin',
  STORE: '/dashboard/store',
}

function isTokenValid(token?: string) {
  if (!token) return false

  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false

    // Decode JWT payload
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    )
    
    if (payload.exp) {
      const currentTime = Math.floor(Date.now() / 1000)
      if (payload.exp < currentTime) {
        return false // Token expired
      }
    }

    return true
  } catch {
    return false
  }
}

export function proxy(
  request: NextRequest,
) {
  const pathname =
    request.nextUrl.pathname

  const token =
    request.cookies
      .get('token')
      ?.value

  const role =
    request.cookies
      .get('userRole')
      ?.value

  const isGoogleVerification =
    pathname.startsWith('/google') &&
    pathname.endsWith('.html')

  const isPublic =
    PUBLIC_ROUTES.includes(
      pathname,
    ) || isGoogleVerification

  const isLoggedIn =
    isTokenValid(token)

  if (
    !isLoggedIn &&
    !isPublic
  ) {
    const res =
      NextResponse.redirect(
        new URL(
          '/login',
          request.url,
        ),
      )

    res.cookies.delete('token')
    res.cookies.delete('userRole')
    res.cookies.delete('user')

    return res
  }

  if (
    isLoggedIn &&
    pathname === '/login'
  ) {
    const targetRoute = ROLE_ROUTES[role as keyof typeof ROLE_ROUTES]
    if (targetRoute) {
      return NextResponse.redirect(
        new URL(
          targetRoute,
          request.url,
        ),
      )
    }
    // Fallback if role is not recognized or matching targetRoute is undefined
    const res = NextResponse.next()
    return res
  }

  if (
    pathname.startsWith(
      '/dashboard/admin',
    ) &&
    role !== 'ADMIN'
  ) {
    const res = NextResponse.redirect(
      new URL(
        '/login',
        request.url,
      ),
    )
    res.cookies.delete('token')
    res.cookies.delete('userRole')
    res.cookies.delete('user')
    return res
  }

  if (
    pathname.startsWith(
      '/dashboard/store',
    ) &&
    role !== 'STORE'
  ) {
    const res = NextResponse.redirect(
      new URL(
        '/login',
        request.url,
      ),
    )
    res.cookies.delete('token')
    res.cookies.delete('userRole')
    res.cookies.delete('user')
    return res
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sitemap\\.xml|robots\\.txt|google.*\\.html).*)',
  ],
}