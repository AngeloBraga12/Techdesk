import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import type { Express, NextFunction, Request, Response } from 'express'
import { prisma } from './db.js'

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

type AuthUser = { id: string; name: string; email: string; role: 'ADMIN' | 'TECHNICIAN' }
type AuthRequest = Request & { user?: AuthUser }
const attempts = new Map<string, { count: number; resetAt: number }>()
function normalizeEmail(value: unknown) { return typeof value === 'string' ? value.trim().toLowerCase() : '' }
function validEmail(email: string) { return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }
function validPassword(password: unknown): password is string { return typeof password === 'string' && password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX }
function clientKey(req: Request) { return req.ip || req.socket.remoteAddress || 'unknown' }
function loginRateKey(req: Request, email: string) { return `${clientKey(req)}:${email || '<invalid>'}` }
function rateLimitFailedLogin(key: string) { const now = Date.now(); const current = attempts.get(key); if (!current || current.resetAt <= now) { attempts.set(key, { count: 1, resetAt: now + 15 * 60 * 1000 }); return false }; current.count += 1; return current.count > 5 }
function resetLoginAttempts(key: string) { attempts.delete(key) }
async function hashPassword(password: string) { const salt = randomBytes(16); const derived = await scryptAsync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P, maxmem: SCRYPT_MAXMEM }); return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('base64url')}$${derived.toString('base64url')}` }
async function verifyPassword(password: string, encoded: string) { const [algorithm, n, r, p, saltText, hashText] = encoded.split('$'); if (algorithm !== 'scrypt' || !n || !r || !p || !saltText || !hashText) return false; const expected = Buffer.from(hashText, 'base64url'); const derived = await scryptAsync(password, Buffer.from(saltText, 'base64url'), expected.length, { N: Number(n), r: Number(r), p: Number(p), maxmem: SCRYPT_MAXMEM }); return expected.length === derived.length && timingSafeEqual(expected, derived) }
function hashSessionToken(token: string) { return createHash('sha256').update(token).digest('hex') }
function parseSessionCookie(req: Request) { const header = req.headers.cookie; if (!header) return null; const prefix = `${SESSION_COOKIE}=`; const item = header.split(';').map(part => part.trim()).find(part => part.startsWith(prefix)); return item ? decodeURIComponent(item.slice(prefix.length)) : null }
function setSessionCookie(res: Response, token: string) { const secure = process.env.NODE_ENV === 'production'; res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`) }
function clearSessionCookie(res: Response) { const secure = process.env.NODE_ENV === 'production'; res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict${secure ? '; Secure' : ''}`) }
function publicUser(user: { id: string; name: string; email: string; role: 'ADMIN' | 'TECHNICIAN' }): AuthUser { return { id: user.id, name: user.name, email: user.email, role: user.role } }

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) { try { const rawToken = parseSessionCookie(req); if (!rawToken || rawToken.length < 40) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Autenticação necessária.' }); const session = await prisma.session.findUnique({ where: { tokenHash: hashSessionToken(rawToken) }, include: { user: true } }); if (!session || session.expiresAt <= new Date() || !session.user.active) { if (session) await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined); clearSessionCookie(res); return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Sessão inválida ou expirada.' }) }; await prisma.session.update({ where: { id: session.id }, data: { lastUsedAt: new Date() } }); req.user = publicUser(session.user); return next() } catch (error) { return next(error) } }
export function requireRole(...roles: AuthUser['role'][]) { return (req: AuthRequest, res: Response, next: NextFunction) => { if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Autenticação necessária.' }); if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'FORBIDDEN', message: 'Permissão insuficiente.' }); return next() } }

export function registerAuthRoutes(app: Express) {
  app.post('/api/auth/register', async (req, res, next) => { try { const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''; const email = normalizeEmail(req.body?.email); const password = req.body?.password; if (!name || name.length > 120 || !validEmail(email) || !validPassword(password)) return res.status(400).json({ error: 'VALIDATION_ERROR', message: `Nome, e-mail válido e senha entre ${PASSWORD_MIN} e ${PASSWORD_MAX} caracteres são obrigatórios.` }); if (process.env.NODE_ENV === 'production' && process.env.AUTH_ALLOW_REGISTRATION !== 'true') return res.status(403).json({ error: 'REGISTRATION_DISABLED', message: 'Cadastro público desativado.' }); const existingCount = await prisma.user.count(); const existing = await prisma.user.findUnique({ where: { email } }); if (existing) return res.status(409).json({ error: 'EMAIL_IN_USE', message: 'E-mail já cadastrado.' }); const user = await prisma.user.create({ data: { name, email, passwordHash: await hashPassword(password), role: existingCount === 0 ? 'ADMIN' : 'TECHNICIAN' } }); return res.status(201).json({ user: publicUser(user), bootstrapAdmin: existingCount === 0 }) } catch (error) { return next(error) } })
  app.post('/api/auth/login', async (req, res, next) => { try { const email = normalizeEmail(req.body?.email); const password = req.body?.password; const rateKey = loginRateKey(req, email); if (rateLimitFailedLogin(rateKey)) return res.status(429).json({ error: 'RATE_LIMITED', message: 'Muitas tentativas de autenticação. Tente novamente mais tarde.' }); if (!validEmail(email) || typeof password !== 'string' || password.length > PASSWORD_MAX) return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' }); const user = await prisma.user.findUnique({ where: { email } }); if (!user || !user.active || !(await verifyPassword(password, user.passwordHash))) { if (rateLimitFailedLogin(rateKey)) return res.status(429).json({ error: 'RATE_LIMITED', message: 'Muitas tentativas de autenticação. Tente novamente mais tarde.' }); return res.status(401).json({ error: 'INVALID_CREDENTIALS', message: 'E-mail ou senha inválidos.' }) }; resetLoginAttempts(rateKey); await prisma.session.deleteMany({ where: { expiresAt: { lt: new Date() } } }); const token = randomBytes(32).toString('base64url'); await prisma.session.create({ data: { tokenHash: hashSessionToken(token), userId: user.id, expiresAt: new Date(Date.now() + SESSION_TTL_MS) } }); setSessionCookie(res, token); return res.json({ user: publicUser(user) }) } catch (error) { return next(error) } })
  app.post('/api/auth/logout', async (req, res, next) => { try { const rawToken = parseSessionCookie(req); if (rawToken) await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(rawToken) } }); clearSessionCookie(res); return res.status(204).send() } catch (error) { return next(error) } })
  app.get('/api/auth/me', authenticate, (req: AuthRequest, res) => res.json({ user: req.user }))
}
