import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'rogmukto_secret_key_change_in_production'
)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth_token')?.value

  const protectedRoutes = ['/admin', '/reception', '/block-coordinator']
  const isProtected = protectedRoutes.some(r => pathname.startsWith(r))

  if (!isProtected) return NextResponse.next()

  if (!token) return NextResponse.redirect(new URL('/login', request.url))

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)

    if (pathname.startsWith('/admin') && payload.role !== 'admin') {
      if (payload.role === 'receptionist') return NextResponse.redirect(new URL('/reception', request.url))
      if (payload.role === 'block-coordinator') return NextResponse.redirect(new URL('/block-coordinator', request.url))
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname.startsWith('/reception') && payload.role !== 'receptionist' && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    if (pathname.startsWith('/block-coordinator') && payload.role !== 'block-coordinator' && payload.role !== 'admin') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  } catch {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}

export const config = {
  matcher: ['/admin/:path*', '/reception/:path*', '/block-coordinator/:path*'],
}
