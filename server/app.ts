import express, { type ErrorRequestHandler, type Response } from 'express'
import cors from 'cors'
import { prisma } from './db.js'
import { authenticate, registerAuthRoutes, requireRole } from './auth.js'
import {
  validateCustomerCreate, validateCustomerUpdate, validateEquipmentCreate, validateEquipmentUpdate,
  validateOrderCreate, validateOrderUpdate, validateOrderIdParam, validateUuidParam,
} from './validation.js'

export const app = express()
const isProduction = process.env.NODE_ENV === 'production'
const trustProxy = process.env.TRUST_PROXY
if (trustProxy) {
  const parsedTrustProxy = Number(trustProxy)
  if (!Number.isInteger(parsedTrustProxy) || parsedTrustProxy < 1) throw new Error('TRUST_PROXY must be a positive integer when configured.')
  app.set('trust proxy', parsedTrustProxy)
}
const allowedOrigins = (process.env.CORS_ORIGINS ?? (isProduction ? '' : 'http://localhost:5173,http://127.0.0.1:5173')).split(',').map(origin => origin.trim()).filter(Boolean)

app.disable('x-powered-by')
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'")
  if (isProduction) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  next()
})
app.use(cors({
  origin: (origin, callback) => { if (!origin || allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error('CORS origin not allowed.')) },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'], optionsSuccessStatus: 204, maxAge: 600,
}))
app.use(express.json({ limit: '1mb', strict: true }))
const badRequest = (res: Response, message: string) => res.status(400).json({ error: 'VALIDATION_ERROR', message })

registerAuthRoutes(app)
app.get('/api/health', async (_req, res) => { try { await prisma.$queryRaw`SELECT 1`; return res.json({ status: 'ok', service: 'TechDesk API', database: 'connected' }) } catch { return res.status(503).json({ status: 'error', service: 'TechDesk API', database: 'unavailable' }) } })
app.use('/api', authenticate)

app.get('/api/customers', async (_req, res) => res.json(await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } })))
app.get('/api/equipment', async (_req, res) => res.json(await prisma.equipment.findMany({ orderBy: { createdAt: 'desc' } })))
app.get('/api/orders', async (_req, res) => { const orders = await prisma.serviceOrder.findMany({ orderBy: { createdAt: 'desc' } }); return res.json(orders.map((order: Awaited<ReturnType<typeof prisma.serviceOrder.findMany>>[number]) => ({ ...order, estimate: Number(order.estimate) }))) })

app.post('/api/customers', async (req, res) => { const validation = validateCustomerCreate(req.body); if (!validation.ok) return badRequest(res, validation.message); const { name, phone, email } = validation.value; return res.status(201).json(await prisma.customer.create({ data: { name: String(name), phone: String(phone), email: email ? String(email) : null } })) })
app.put('/api/customers/:id', async (req, res) => { const id = String(req.params.id); if (!validateUuidParam(id)) return badRequest(res, 'ID de cliente inválido.'); const validation = validateCustomerUpdate(req.body); if (!validation.ok) return badRequest(res, validation.message); try { return res.json(await prisma.customer.update({ where: { id }, data: validation.value as Parameters<typeof prisma.customer.update>[0]['data'] })) } catch (error) { if (isPrismaNotFound(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado.' }); throw error } })
app.delete('/api/customers/:id', requireRole('ADMIN'), async (req, res) => { const id = String(req.params.id); if (!validateUuidParam(id)) return badRequest(res, 'ID de cliente inválido.'); try { await prisma.customer.delete({ where: { id } }); return res.status(204).send() } catch (error) { if (isPrismaNotFound(error) || isPrismaConstraint(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado ou possui registros vinculados.' }); throw error } })

app.post('/api/equipment', async (req, res) => { const validation = validateEquipmentCreate(req.body); if (!validation.ok) return badRequest(res, validation.message); try { return res.status(201).json(await prisma.equipment.create({ data: validation.value as Parameters<typeof prisma.equipment.create>[0]['data'] })) } catch (error) { if (isPrismaConstraint(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado.' }); throw error } })
app.put('/api/equipment/:id', async (req, res) => { const id = String(req.params.id); if (!validateUuidParam(id)) return badRequest(res, 'ID de equipamento inválido.'); const validation = validateEquipmentUpdate(req.body); if (!validation.ok) return badRequest(res, validation.message); try { return res.json(await prisma.equipment.update({ where: { id }, data: validation.value as Parameters<typeof prisma.equipment.update>[0]['data'] })) } catch (error) { if (isPrismaNotFound(error) || isPrismaConstraint(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado ou cliente inválido.' }); throw error } })
app.delete('/api/equipment/:id', requireRole('ADMIN'), async (req, res) => { const id = String(req.params.id); if (!validateUuidParam(id)) return badRequest(res, 'ID de equipamento inválido.'); try { await prisma.equipment.delete({ where: { id } }); return res.status(204).send() } catch (error) { if (isPrismaNotFound(error) || isPrismaConstraint(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado ou possui ordens vinculadas.' }); throw error } })

app.post('/api/orders', async (req, res) => { const validation = validateOrderCreate(req.body); if (!validation.ok) return badRequest(res, validation.message); const { customerId, equipmentId, issue, diagnosis = '', estimate = 0, status = 'Orçamento' } = validation.value; const equipment = await prisma.equipment.findFirst({ where: { id: String(equipmentId), customerId: String(customerId) } }); if (!equipment) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado para este cliente.' }); const order = await prisma.serviceOrder.create({ data: { customerId: String(customerId), equipmentId: String(equipmentId), issue: String(issue), diagnosis: String(diagnosis), estimate: Number(estimate), status: String(status), history: { create: { toStatus: String(status), note: 'Ordem criada.' } } } }); return res.status(201).json({ ...order, estimate: Number(order.estimate) }) })
app.put('/api/orders/:id', async (req, res) => { const idText = String(req.params.id); if (!validateOrderIdParam(idText)) return badRequest(res, 'ID de ordem inválido.'); const validation = validateOrderUpdate(req.body); if (!validation.ok) return badRequest(res, validation.message); const id = Number(idText); const current = await prisma.serviceOrder.findUnique({ where: { id } }); if (!current) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ordem de serviço não encontrada.' }); const { customerId, equipmentId, issue, diagnosis, estimate, status } = validation.value; const nextCustomerId = String(customerId ?? current.customerId); const nextEquipmentId = String(equipmentId ?? current.equipmentId); const equipment = await prisma.equipment.findFirst({ where: { id: nextEquipmentId, customerId: nextCustomerId } }); if (!equipment) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado para este cliente.' }); const statusChanged = status !== undefined && status !== current.status; const order = await prisma.serviceOrder.update({ where: { id }, data: { customerId: nextCustomerId, equipmentId: nextEquipmentId, issue: issue === undefined ? current.issue : String(issue), diagnosis: diagnosis === undefined ? current.diagnosis : String(diagnosis), estimate: estimate === undefined ? current.estimate : Number(estimate), status: status === undefined ? current.status : String(status), ...(statusChanged ? { history: { create: { fromStatus: current.status, toStatus: String(status) } } } : {}) } }); return res.json({ ...order, estimate: Number(order.estimate) }) })
app.delete('/api/orders/:id', requireRole('ADMIN'), async (req, res) => { const idText = String(req.params.id); if (!validateOrderIdParam(idText)) return badRequest(res, 'ID de ordem inválido.'); try { await prisma.serviceOrder.delete({ where: { id: Number(idText) } }); return res.status(204).send() } catch (error) { if (isPrismaNotFound(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ordem de serviço não encontrada.' }); throw error } })
app.get('/api/orders/:id/history', async (req, res) => { const idText = String(req.params.id); if (!validateOrderIdParam(idText)) return badRequest(res, 'ID de ordem inválido.'); return res.json(await prisma.serviceOrderHistory.findMany({ where: { serviceOrderId: Number(idText) }, orderBy: { createdAt: 'asc' } })) })

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Rota não encontrada.' }))
const errorHandler: ErrorRequestHandler = (error, req, res, next) => { if (res.headersSent) return next(error); if (error?.message === 'CORS origin not allowed.') return res.status(403).json({ error: 'CORS_FORBIDDEN', message: 'Origem não autorizada.' }); if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'INVALID_JSON', message: 'JSON inválido.' }); if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Corpo da requisição excede o limite de 1 MB.' }); console.error('Unhandled API error', { method: req.method, path: req.path, error: error instanceof Error ? error.message : 'Unknown error' }); return res.status(500).json({ error: 'INTERNAL_ERROR', message: isProduction ? 'Erro interno do servidor.' : 'Erro interno do servidor. Consulte os logs para detalhes.' }) }
app.use(errorHandler)
function isPrismaNotFound(error: unknown) { return isPrismaError(error, 'P2025') }
function isPrismaConstraint(error: unknown) { return isPrismaError(error, 'P2003') }
function isPrismaError(error: unknown, code: string) { return typeof error === 'object' && error !== null && 'code' in error && error.code === code }
