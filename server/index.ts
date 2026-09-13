import express from 'express'
import cors from 'cors'
import { prisma } from './db.js'

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json())

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
  const { name, phone, email } = req.body
  if (!name || !phone) return res.status(400).json({ message: 'Nome e telefone são obrigatórios.' })
  const customer = await prisma.customer.create({ data: { name, phone, email: email || null } })
  return res.status(201).json(customer)
})

app.put('/api/customers/:id', async (req, res) => {
  try {
    return res.json(await prisma.customer.update({ where: { id: req.params.id }, data: req.body }))
  } catch {
    return res.status(404).json({ message: 'Cliente não encontrado.' })
  }
})

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch {
    return res.status(404).json({ message: 'Cliente não encontrado ou possui registros vinculados.' })
  }
})

app.post('/api/equipment', async (req, res) => {
  const { customerId, type, brand, model, serialNumber, problemDescription = '' } = req.body
  if (!customerId || !type || !brand || !model) return res.status(400).json({ message: 'Cliente, tipo, marca e modelo são obrigatórios.' })
  try {
    const item = await prisma.equipment.create({ data: { customerId, type, brand, model, serialNumber: serialNumber || null, problemDescription } })
    return res.status(201).json(item)
  } catch {
    return res.status(404).json({ message: 'Cliente não encontrado.' })
  }
})

app.put('/api/equipment/:id', async (req, res) => {
  try {
    return res.json(await prisma.equipment.update({ where: { id: req.params.id }, data: req.body }))
  } catch {
    return res.status(404).json({ message: 'Equipamento não encontrado ou cliente inválido.' })
  }
})

app.delete('/api/equipment/:id', async (req, res) => {
  try {
    await prisma.equipment.delete({ where: { id: req.params.id } })
    return res.status(204).send()
  } catch {
    return res.status(404).json({ message: 'Equipamento não encontrado ou possui ordens vinculadas.' })
  }
})

app.post('/api/orders', async (req, res) => {
  const { customerId, equipmentId, issue, diagnosis = '', estimate = 0, status = 'Orçamento' } = req.body
  if (!customerId || !equipmentId || !issue) return res.status(400).json({ message: 'Cliente, equipamento e problema são obrigatórios.' })
  const equipment = await prisma.equipment.findFirst({ where: { id: equipmentId, customerId } })
  if (!equipment) return res.status(404).json({ message: 'Equipamento não encontrado para este cliente.' })

  const order = await prisma.serviceOrder.create({
    data: {
      customerId, equipmentId, issue, diagnosis, estimate: Number(estimate) || 0, status,
      history: { create: { toStatus: status, note: 'Ordem criada.' } },
    },
  })
  return res.status(201).json({ ...order, estimate: Number(order.estimate) })
})

app.put('/api/orders/:id', async (req, res) => {
  const id = Number(req.params.id)
  const current = await prisma.serviceOrder.findUnique({ where: { id } })
  if (!current) return res.status(404).json({ message: 'Ordem de serviço não encontrada.' })

  const { customerId, equipmentId, issue, diagnosis, estimate, status } = req.body
  const nextCustomerId = customerId ?? current.customerId
  const nextEquipmentId = equipmentId ?? current.equipmentId
  const equipment = await prisma.equipment.findFirst({ where: { id: nextEquipmentId, customerId: nextCustomerId } })
  if (!equipment) return res.status(404).json({ message: 'Equipamento não encontrado para este cliente.' })

  const statusChanged = status !== undefined && status !== current.status
  const order = await prisma.serviceOrder.update({
    where: { id },
    data: {
      customerId: nextCustomerId,
      equipmentId: nextEquipmentId,
      issue: issue ?? current.issue,
      diagnosis: diagnosis ?? current.diagnosis,
      estimate: estimate === undefined ? current.estimate : Number(estimate) || 0,
      status: status ?? current.status,
      ...(statusChanged ? { history: { create: { fromStatus: current.status, toStatus: status } } } : {}),
    },
  })
  return res.json({ ...order, estimate: Number(order.estimate) })
})

app.delete('/api/orders/:id', async (req, res) => {
  try {
    await prisma.serviceOrder.delete({ where: { id: Number(req.params.id) } })
    return res.status(204).send()
  } catch {
    return res.status(404).json({ message: 'Ordem de serviço não encontrada.' })
  }
})

app.get('/api/orders/:id/history', async (req, res) => {
  const history = await prisma.serviceOrderHistory.findMany({ where: { serviceOrderId: Number(req.params.id) }, orderBy: { createdAt: 'asc' } })
  return res.json(history)
})

app.listen(port, () => console.log(`TechDesk API running on http://localhost:${port}`))
