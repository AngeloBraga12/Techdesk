import express, { type ErrorRequestHandler, type Response } from 'express'
import cors from 'cors'
import { prisma } from './db.js'
import {
  validateCustomerCreate, validateCustomerUpdate, validateEquipmentCreate, validateEquipmentUpdate,
  validateOrderCreate, validateOrderUpdate, validateOrderIdParam, validateUuidParam,
} from './validation.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)
const isProduction = process.env.NODE_ENV === 'production'
const allowedOrigins = (process.env.CORS_ORIGINS ?? (isProduction ? '' : 'http://localhost:5173,http://127.0.0.1:5173'))
  .split(',').map((origin) => origin.trim()).filter(Boolean)

app.disable('x-powered-by')
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error('CORS origin not allowed.'))
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  maxAge: 600,
}))
app.use(express.json({ limit: '1mb', strict: true }))

const badRequest = (res: Response, message: string) => res.status(400).json({ error: 'VALIDATION_ERROR', message })

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    return res.json({ status: 'ok', service: 'TechDesk API', database: 'connected' })
  } catch {
    return res.status(503).json({ status: 'error', service: 'TechDesk API', database: 'unavailable' })
  }
})

app.get('/api/customers', async (_req, res) => res.json(await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } })))
app.get('/api/equipment', async (_req, res) => res.json(await prisma.equipment.findMany({ orderBy: { createdAt: 'desc' } })))
app.get('/api/orders', async (_req, res) => {
  const orders = await prisma.serviceOrder.findMany({ orderBy: { createdAt: 'desc' } })
  return res.json(orders.map((order: Awaited<ReturnType<typeof prisma.serviceOrder.findMany>>[number]) => ({ ...order, estimate: Number(order.estimate) })))
})

app.post('/api/customers', async (req, res) => {
  const validation = validateCustomerCreate(req.body)
  if (!validation.ok) return badRequest(res, validation.message)
  const { name, phone, email } = validation.value
  const customer = await prisma.customer.create({ data: { name: String(name), phone: String(phone), email: email ? String(email) : null } })
  return res.status(201).json(customer)
})

app.put('/api/customers/:id', async (req, res) => {
  if (!validateUuidParam(req.params.id)) return badRequest(res, 'ID de cliente inválido.')
  const validation = validateCustomerUpdate(req.body)
  if (!validation.ok) return badRequest(res, validation.message)
  try {
    return res.json(await prisma.customer.update({ where: { id: req.params.id }, data: validation.value as Parameters<typeof prisma.customer.update>[0]['data'] }))
  } catch (error) {
    if (isPrismaNotFound(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado.' })
    throw error
  }
})

app.delete('/api/customers/:id', async (req, res) => {
  if (!validateUuidParam(req.params.id)) return badRequest(res, 'ID de cliente inválido.')
  try {
    await prisma.customer.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (error) {
    if (isPrismaNotFound(error) || isPrismaConstraint(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado ou possui registros vinculados.' })
    throw error
  }
})

app.post('/api/equipment', async (req, res) => {
  const validation = validateEquipmentCreate(req.body)
  if (!validation.ok) return badRequest(res, validation.message)
  try {
    const item = await prisma.equipment.create({ data: validation.value as Parameters<typeof prisma.equipment.create>[0]['data'] })
    return res.status(201).json(item)
  } catch (error) {
    if (isPrismaConstraint(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Cliente não encontrado.' })
    throw error
  }
})

app.put('/api/equipment/:id', async (req, res) => {
  if (!validateUuidParam(req.params.id)) return badRequest(res, 'ID de equipamento inválido.')
  const validation = validateEquipmentUpdate(req.body)
  if (!validation.ok) return badRequest(res, validation.message)
  try {
    return res.json(await prisma.equipment.update({ where: { id: req.params.id }, data: validation.value as Parameters<typeof prisma.equipment.update>[0]['data'] }))
  } catch (error) {
    if (isPrismaNotFound(error) || isPrismaConstraint(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado ou cliente inválido.' })
    throw error
  }
})

app.delete('/api/equipment/:id', async (req, res) => {
  if (!validateUuidParam(req.params.id)) return badRequest(res, 'ID de equipamento inválido.')
  try {
    await prisma.equipment.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch (error) {
    if (isPrismaNotFound(error) || isPrismaConstraint(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado ou possui ordens vinculadas.' })
    throw error
  }
})

app.post('/api/orders', async (req, res) => {
  const validation = validateOrderCreate(req.body)
  if (!validation.ok) return badRequest(res, validation.message)
  const { customerId, equipmentId, issue, diagnosis = '', estimate = 0, status = 'Orçamento' } = validation.value
  const equipment = await prisma.equipment.findFirst({ where: { id: String(equipmentId), customerId: String(customerId) } })
  if (!equipment) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado para este cliente.' })

  const order = await prisma.serviceOrder.create({
    data: {
      customerId: String(customerId), equipmentId: String(equipmentId), issue: String(issue), diagnosis: String(diagnosis), estimate: Number(estimate), status: String(status),
      history: { create: { toStatus: String(status), note: 'Ordem criada.' } },
    },
  })
  return res.status(201).json({ ...order, estimate: Number(order.estimate) })
})

app.put('/api/orders/:id', async (req, res) => {
  if (!validateOrderIdParam(req.params.id)) return badRequest(res, 'ID de ordem inválido.')
  const validation = validateOrderUpdate(req.body)
  if (!validation.ok) return badRequest(res, validation.message)
  const id = Number(req.params.id)
  const current = await prisma.serviceOrder.findUnique({ where: { id } })
  if (!current) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ordem de serviço não encontrada.' })

  const { customerId, equipmentId, issue, diagnosis, estimate, status } = validation.value
  const nextCustomerId = String(customerId ?? current.customerId)
  const nextEquipmentId = String(equipmentId ?? current.equipmentId)
  const equipment = await prisma.equipment.findFirst({ where: { id: nextEquipmentId, customerId: nextCustomerId } })
  if (!equipment) return res.status(404).json({ error: 'NOT_FOUND', message: 'Equipamento não encontrado para este cliente.' })

  const statusChanged = status !== undefined && status !== current.status
  const order = await prisma.serviceOrder.update({
    where: { id },
    data: {
      customerId: nextCustomerId, equipmentId: nextEquipmentId,
      issue: issue === undefined ? current.issue : String(issue), diagnosis: diagnosis === undefined ? current.diagnosis : String(diagnosis),
      estimate: estimate === undefined ? current.estimate : Number(estimate), status: status === undefined ? current.status : String(status),
      ...(statusChanged ? { history: { create: { fromStatus: current.status, toStatus: String(status) } } } : {}),
    },
  })
  return res.json({ ...order, estimate: Number(order.estimate) })
})

app.delete('/api/orders/:id', async (req, res) => {
  if (!validateOrderIdParam(req.params.id)) return badRequest(res, 'ID de ordem inválido.')
  try {
    await prisma.serviceOrder.delete({ where: { id: Number(req.params.id) } })
    return res.status(204).send()
  } catch (error) {
    if (isPrismaNotFound(error)) return res.status(404).json({ error: 'NOT_FOUND', message: 'Ordem de serviço não encontrada.' })
    throw error
  }
})

app.get('/api/orders/:id/history', async (req, res) => {
  if (!validateOrderIdParam(req.params.id)) return badRequest(res, 'ID de ordem inválido.')
  const history = await prisma.serviceOrderHistory.findMany({ where: { serviceOrderId: Number(req.params.id) }, orderBy: { createdAt: 'asc' } })
  return res.json(history)
})

app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND', message: 'Rota não encontrada.' }))

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error)
  if (error?.message === 'CORS origin not allowed.') return res.status(403).json({ error: 'CORS_FORBIDDEN', message: 'Origem não autorizada.' })
  if (error?.type === 'entity.parse.failed') return res.status(400).json({ error: 'INVALID_JSON', message: 'JSON inválido.' })
  if (error?.type === 'entity.too.large') return res.status(413).json({ error: 'PAYLOAD_TOO_LARGE', message: 'Corpo da requisição excede o limite de 1 MB.' })

  console.error('Unhandled API error', { method: req.method, path: req.path, error })
  return res.status(500).json({ error: 'INTERNAL_ERROR', message: isProduction ? 'Erro interno do servidor.' : 'Erro interno do servidor. Consulte os logs para detalhes.' })
}
app.use(errorHandler)

function isPrismaNotFound(error: unknown) { return isPrismaError(error, 'P2025') }
function isPrismaConstraint(error: unknown) { return isPrismaError(error, 'P2003') }
function isPrismaError(error: unknown, code: string) { return typeof error === 'object' && error !== null && 'code' in error && error.code === code }

app.listen(port, () => console.log(`TechDesk API running on http://localhost:${port}`))
