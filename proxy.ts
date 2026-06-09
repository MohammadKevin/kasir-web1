import {
  NextRequest,
  NextResponse,
} from 'next/server'

const PUBLIC_ROUTES = [
  '/',
  '/login',
]

const ROLE_ROUTES = {
  ADMIN: '/dashboard/admin',
  STORE: '/dashboard/store',
}

function isTokenValid(
  token?: string,
) {
  if (!token) return false

  try {
    return (
      token
        .split('.')
        .length === 3
    )
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

  const isPublic =
    PUBLIC_ROUTES.includes(
      pathname,
    )

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

    res.cookies.delete(
      'token',
    )
    res.cookies.delete(
      'userRole',
    )

    return res
  }

  if (
    isLoggedIn &&
    pathname === '/login'
  ) {
    return NextResponse.redirect(
      new URL(
        ROLE_ROUTES[
          role as keyof typeof ROLE_ROUTES
        ] ?? '/login',
        request.url,
      ),
    )
  }

  if (
    pathname.startsWith(
      '/dashboard/admin',
    ) &&
    role !== 'ADMIN'
  ) {
    return NextResponse.redirect(
      new URL(
        '/login',
        request.url,
      ),
    )
  }

  if (
    pathname.startsWith(
      '/dashboard/store',
    ) &&
    role !== 'STORE'
  ) {
    return NextResponse.redirect(
      new URL(
        '/login',
        request.url,
      ),
    )
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}