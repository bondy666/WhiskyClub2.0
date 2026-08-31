import type { Request } from 'express'

export interface CurrentUser {
  userId: string
  name: string
  email?: string
  provider: string
}

// Parses the Azure App Service EasyAuth principal header when deployed.
function fromEasyAuthHeader(req: Request): CurrentUser | null {
  const header = req.header('x-ms-client-principal')
  if (!header) return null
  try {
    const decoded = JSON.parse(Buffer.from(header, 'base64').toString('utf8'))
    const claims: { typ: string; val: string }[] = decoded.claims ?? []
    const byType = (t: string) =>
      claims.find((c) => c.typ === t || c.typ.endsWith('/' + t))?.val
    const email =
      byType('emailaddress') ||
      byType('email') ||
      byType('preferred_username') ||
      decoded.userDetails
    const name = byType('name') || email || decoded.userDetails || 'Guild Member'
    return {
      userId: decoded.userId ?? byType('nameidentifier') ?? '',
      name,
      email,
      provider: decoded.identityProvider ?? decoded.auth_typ ?? '',
    }
  } catch {
    return null
  }
}

const DEV_USER: CurrentUser = {
  userId: 'dev-simon',
  name: 'Simon Bond',
  email: 'sbond@simonbond.uk',
  provider: 'dev',
}

export function getCurrentUser(req: Request): CurrentUser | null {
  const easy = fromEasyAuthHeader(req)
  if (easy) return easy
  if (process.env.DEV_AUTH === 'true') return DEV_USER
  return null
}
