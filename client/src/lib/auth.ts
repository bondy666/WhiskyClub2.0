import type { AuthUser } from '../types'

// Reads the server's membership-aware identity endpoint. Returns null when the
// visitor is not signed in. Signed-in accounts that are not registered Guild
// members are returned with `isMember: false`.
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/api/me', { credentials: 'include' })
    if (!res.ok) return null
    const data = await res.json()
    if (!data?.user) return null
    return {
      userId: data.user.userId ?? '',
      name: data.member?.name ?? data.user.name ?? 'Guild Member',
      email: data.user.email,
      provider: data.user.provider ?? '',
      isMember: !!data.isMember,
    }
  } catch {
    return null
  }
}

export function loginUrl(provider: 'aad' | 'google', redirect = '/') {
  return `/.auth/login/${provider}?post_login_redirect_uri=${encodeURIComponent(redirect)}`
}

export function logoutUrl(redirect = '/') {
  return `/.auth/logout?post_logout_redirect_uri=${encodeURIComponent(redirect)}`
}
