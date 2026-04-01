import { cookies } from 'next/headers'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!

export interface AuthPayload {
  role: 'admin' | 'receptionist'
  id?: string
  username?: string
}

export async function verifyAuth(): Promise<AuthPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload
    return payload
  } catch {
    return null
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}
