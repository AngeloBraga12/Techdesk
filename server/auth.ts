import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import type { Express, NextFunction, Request, Response } from 'express'
import { prisma } from './db.js'
import type { Prisma } from '../generated/prisma/client.js'

const scryptAsync = (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number; maxmem: number }) => new Promise<Buffer>((resolve, reject) => {
  scryptCallback(password, salt, keylen, options, (error, derived) => error ? reject(error) : resolve(derived as Buffer))
})
const SESSION_COOKIE = 'techdesk_session'
const SESSION_TTL_MS = 8 * 60 * 60 * 1000
const PASSWORD_MIN = 12
const PASSWORD_MAX = 128
const SCRYPT_N = 131072
const SCRYPT_R = 8
const SCRYPT_P = 1
const SCRYPT_KEYLEN = 32
const SCRYPT_MAXMEM = 256 * 1024 * 1024
const LOGIN_RATE_WINDOW_MS = 15 * 60 * 1000
const LOGIN_RATE_LIMIT = 5
const BOOTSTRAP_RATE_LIMIT = 5

type AuthUser = { id: string; name: string; email: string; role: 'ADMIN' | 'TECHNICIAN' }
type AuthRequest = Request & { user?: AuthUser }
type RateEntry = { count: number; resetAt: number }

const attemptsByIp = new Map<string, RateEntry>()
const attemptsByIdentity = new Map<string, RateEntry>()
const bootstrapAttemptsByIp = new Map<string, RateEntry>()

class RegistrationConflictError extends Error {
  code = 'EMAIL_IN_USE'
}

function normalizeEmail(value: unknown) { return typeof value === 'string' ? value.trim().toLowerCase() : '' }
function validEmail(email: string) { return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function validPassword(password: unknown): password is string { return typeof password === 'string' && password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX }
function validName(name: unknown) { return typeof name === 'string' && name.trim().length > 0 && name.trim().length <= 120 }
function clientKey(req: Request) { return req.ip || req.socket.remoteAddress || 'unknown' }

function pruneRateMap(map: Map<string, RateEntry>, now: number) {
  if (map.size < 10000) return
  for (const [key, entry] of map) if (entry.resetAt <= now) map.delete(key)
}

function consumeRateBucket(map: Map<string, RateEntry>, key: string, now: number, limit = LOGIN_RATE_LIMIT) {
  pruneRateMap(map, now)
  const current = map.get(key)
  if (!current || current.resetAt <= now) {
    map.set(key, { count: 1, resetAt: now + LOGIN_RATE_WINDOW_MS })
    return false
  }
  current.count += 1
  return current.count > limit
}

function loginRateLimited(req: Request, email: string) {
  const now = Date.now()
  const ipLimited = consumeRateBucket(attemptsByIp, clientKey(req), now)
  const identityLimited = consumeRateBucket(attemptsByIdentity, email || '<invalid>', now)
  return ipLimited || identityLimited
}

function resetLoginAttempts(req: Request, email: string) {
  attemptsByIp.delete(clientKey(req))
  attemptsByIdentity.delete(email || '<invalid>')
}

async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${derived.toString('base64url')}`
}

async function verifyPassword(password: string, encoded: string) {
  const [algorithm, n, r, p, saltText, hashText] = encoded.split('$')
  if (algorithm !== 'scrypt' || !n || !r || !p || !saltText || !hashText) return false
  const expected = Buffer.from(hashText, 'base64url')
  const derived = await scryptAsync(password, Buffer.from(saltText, 'base64url'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT_MAXMEM })
  return expected.length === derived.length && timingSafeEqual(expected, derived)
}

function hashSessionToken(token: string) { return createHash('sha256').update(token).digest('hex') }

function parseSessionCookie(req: Request) {
  const header = req.headers.cookie
  if (!header) return null
  const prefix = `${SESSION_COOKIE}=`
  const item = header.split(';').map(part => part.trim()).find(part => part.startsWith(prefix))
  return item ? decodeURIComponent(item.slice(prefix.length)) : null
}

function setSessionCookie(res: Response, token: string) {
  const secure = process.env.NODE_ENV === 'production'
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`)
}

function clearSessionCookie(res: Response) {
  const secure = process.env.NODE_ENV === 'production'
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`)
}

function publicUser(user: { id: string; name: string; email: string; role: 'ADMIN' | 'TECHNICIAN' }): AuthUser {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const rawToken = parseSessionCookie(req)
    if (!rawToken || rawToken.length < 40) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
    const session = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(rawToken) }, include: { user: true } })
    if (!session || session.expiresAt <= new Date() || !session.user.active) {
      if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined)
      clearSessionCookie(res)
      return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão inválida ou expirada.' })
    }
    await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } })
    req.user = publicUser(session.user)
    return next()
  } catch (error) {
    return next(error)
  }
}

export function requireRole(...roles: AuthUser['role'][]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Autenticação necessária.' })
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN', message: 'Permissão insuficiente.' })
    return next()
  }
}

export function registerAuthRoutes(app: Express) {
  app.post('/api/auth/bootstrap', async (req, res, next) => {
    try {
      const configuredToken = process.env.AUTH_BOOTSTRAP_TOKEN
      const suppliedToken = typeof req.headers['x-bootstrap-token'] === 'string' ? req.headers['x-bootstrap-token'] : ''
      if (!configuredToken || !suppliedToken || configuredToken.length < 32 || suppliedToken.length !== configuredToken.length || !timingSafeEqual(Buffer.from(suppliedToken), Buffer.from(configuredToken))) {
        return res.status(403).json({ error: 'BOOTSTRAP_FORBIDDEN', message: 'Bootstrap administrativo não autorizado.' })
      }
      if (consumeRateBucket(bootstrapAttemptsByIp, clientKey(req), Date.now(), BOOTSTRAP_RATE_LIMIT)) {
        return res.status(429).json({ error: 'RATE_LIMITED', message: 'Muitas tentativas de bootstrap. Tente novamente mais tarde.' })
      }

      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      const email = normalizeEmail(req.body?.email)
      const password = req.body?.password
      if (!validName(name) || !validEmail(email) || !validPassword(password)) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: `Nome, e-mail válido e senha entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres são obrigatórios.` })
      }

      const passwordHash = await hashPassword(password)
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('techdesk:bootstrap-admin'))`
        if (await tx.user.count() > 0) return null
        return tx.user.create({ data: { name, email, passwordHash, role: 'ADMIN' } })
      })
      if (!result) return res.status(409).json({ error: 'BOOTSTRAP_COMPLETE', message: 'O administrador inicial já foi criado.' })
      return res.status(201).json({ user: publicUser(result), bootstrapAdmin: true })
    } catch (error) {
      return next(error)
    }
  })

  app.post('/api/auth/register', async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      const email = normalizeEmail(req.body?.email)
      const password = req.body?.password
      if (!validName(name) || !validEmail(email) || !validPassword(password)) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: `Nome, e-mail válido e senha entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres são obrigatórios.` })
      }
      if (process.env.NODE_ENV === 'production' && process.env.AUTH_ALLOW_REGISTRATION !== 'true') {
        return res.status(403).json({ error: 'REGISTRATION_DISABLED', message: 'Cadastro público desativado.' })
      }

      const passwordHash = await hashPassword(password)
      const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('techdesk:bootstrap-admin'))`
        const existing = await tx.user.findUnique({ where: { email } })
        if (existing) throw new RegistrationConflictError('E-mail já cadastrado.')
        const existingCount = await tx.user.count()
        return tx.user.create({ data: { name, email, passwordHash, role: existingCount === 0 ? 'ADMIN' : 'TECHNICIAN' } })
      })
      return res.status(201).json({ user: publicUser(user), bootstrapAdmin: user.role === 'ADMIN' })
    } catch (error) {
      if (error instanceof RegistrationConflictError) return res.status(409).json({ error: error.code, message: 'E-mail já cadastrado.' })
      return next(error)
    }
  })

  app.post('/api/auth/login', async (req, res, next) => {
    try {
      const email = normalizeEmail(req.body?.email)
      const password = req.body?.password
      if (loginRateLimited(req, email)) return res.status(429).json({ error: 'RATE_LIMITED', message: 'Muitas tentativas de autenticação. Tente novamente mais tarde.' })
      if (!validEmail(email) || typeof password !== 'string' || password.length > PASSWORD_MAX) return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' })
      const user = await prisma.user.findUnique({ where: { email } })
      if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' })
      resetLoginAttempts(req, email)
      await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } })
      const token = randomBytes(32).toString('base64url')
      await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } })
      setSessionCookie(res, token)
      return res.json({ user: publicUser(user) })
    } catch (error) {
      return next(error)
    }
  })

  app.post('/api/auth/logout', async (req, res, next) => {
    try {
      const rawToken = parseSessionCookie(req)
      if (rawToken) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(rawToken) } })
      clearSessionCookie(res)
      return res.status(204).send()
    } catch (error) {
      return next(error)
    }
  })

  app.get('/api/auth/me', authenticate, (req: AuthRequest, res) => res.json({ user: req.user }))
}

export function registerAdminRoutes(app: Express) {
  app.get('/api/admin/users', requireRole('ADMIN'), async (_req, res, next) => {
    try {
      const users = await prisma.user.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } })
      return res.json(users)
    } catch (error) {
      return next(error)
    }
  })

  app.post('/api/admin/users', requireRole('ADMIN'), async (req, res, next) => {
    try {
      const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
      const email = normalizeEmail(req.body?.email)
      const password = req.body?.password
      if (!validName(name) || !validEmail(email) || !validPassword(password)) {
        return res.status(400).json({ error: 'VALIDATION_ERROR', message: `Nome, e-mail válido e senha entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres são obrigatórios.` })
      }
      const passwordHash = await hashPassword(password)
      const user = await prisma.user.create({ data: { name, email, passwordHash, role: 'TECHNICIAN' }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } })
      return res.status(201).json(user)
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: 'EMAIL_IN_USE', message: 'E-mail já cadastrado.' })
      return next(error)
    }
  })

  app.patch('/api/admin/users/:id', requireRole('ADMIN'), async (req: AuthRequest, res, next) => {
    try {
      const id = String(req.params.id)
      const active = req.body?.active
      if (typeof active !== 'boolean') return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'O campo active deve ser booleano.' })
      const target = await prisma.user.findUnique({ where: { id } })
      if (!target) return res.status(404).json({ error: 'NOT_FOUND', message: 'Usuário não encontrado.' })
      if (target.id === req.user?.id && !active) return res.status(400).json({ error: 'SELF_DEACTIVATION_FORBIDDEN', message: 'O administrador atual não pode desativar a própria conta.' })
      if (target.role === 'ADMIN' && !active) return res.status(400).json({ error: 'ADMIN_DEACTIVATION_FORBIDDEN', message: 'Contas administrativas não podem ser desativadas por este painel.' })
      const user = await prisma.user.update({ where: { id }, data: { active }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true } })
      if (!active) await prisma.session.deleteMany({ where: { userId: id } })
      return res.json(user)
    } catch (error) {
      return next(error)
    }
  })
}
