import express from 'express'
import cors from 'cors'
import { randomUUID } from 'node:crypto'

const app = express()
const port = Number(process.env.PORT ?? 3001)

app.use(cors())
app.use(express.json())

const customers = [
  { id: 'c-1', name: 'Maria Souza', phone: '(12) 99123-4567', email: 'maria@example.com', createdAt: new Date().toISOString() },
  { id: 'c-2', name: 'João Lima', phone: '(12) 99876-5432', email: 'joao@example.com', createdAt: new Date().toISOString() },
]

const equipment = [
  { id: 'e-1', customerId: 'c-1', type: 'Notebook', brand: 'Dell', model: 'Inspiron 15', problemDescription: 'Não inicia.' },
  { id: 'e-2', customerId: 'c-2', type: 'Desktop', brand: 'Lenovo', model: 'IdeaCentre', problemDescription: 'Lentidão e travamentos.' },
]

const orders = [
  { id: 1001, customerId: 'c-1', equipmentId: 'e-1', issue: 'Notebook não liga', diagnosis: 'Fonte apresenta falha.', estimate: 280, status: 'Em análise', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'TechDesk API' }))
app.get('/api/customers', (_req, res) => res.json(customers))
app.get('/api/equipment', (_req, res) => res.json(equipment))
app.get('/api/orders', (_req, res) => res.json(orders))

app.post('/api/customers', (req, res) => {
  const { name, phone, email } = req.body
  if (!name || !phone) return res.status(400).json({ message: 'Nome e telefone são obrigatórios.' })
  const customer = { id: randomUUID(), name, phone, email, createdAt: new Date().toISOString() }
  customers.unshift(customer)
  return res.status(201).json(customer)
})

app.put('/api/customers/:id', (req, res) => {
  const customer = customers.find(item => item.id === req.params.id)
  if (!customer) return res.status(404).json({ message: 'Cliente não encontrado.' })
  const { name, phone, email } = req.body
  if (name !== undefined) customer.name = name
  if (phone !== undefined) customer.phone = phone
  if (email !== undefined) customer.email = email
  return res.json(customer)
})

app.delete('/api/customers/:id', (req, res) => {
  const index = customers.findIndex(item => item.id === req.params.id)
  if (index < 0) return res.status(404).json({ message: 'Cliente não encontrado.' })
  customers.splice(index, 1)
  return res.status(204).send()
})

app.post('/api/equipment', (req, res) => {
  const { customerId, type, brand, model, serialNumber, problemDescription = '' } = req.body
  if (!customerId || !type || !brand || !model) return res.status(400).json({ message: 'Cliente, tipo, marca e modelo são obrigatórios.' })
  if (!customers.some(customer => customer.id === customerId)) return res.status(404).json({ message: 'Cliente não encontrado.' })
  const item = { id: randomUUID(), customerId, type, brand, model, serialNumber, problemDescription }
  equipment.unshift(item)
  return res.status(201).json(item)
})

app.put('/api/equipment/:id', (req, res) => {
  const item = equipment.find(entry => entry.id === req.params.id)
  if (!item) return res.status(404).json({ message: 'Equipamento não encontrado.' })
  const { customerId, type, brand, model, serialNumber, problemDescription } = req.body
  if (customerId !== undefined && !customers.some(customer => customer.id === customerId)) return res.status(404).json({ message: 'Cliente não encontrado.' })
  Object.assign(item, { customerId, type, brand, model, serialNumber, problemDescription })
  return res.json(item)
})

app.delete('/api/equipment/:id', (req, res) => {
  const index = equipment.findIndex(item => item.id === req.params.id)
  if (index < 0) return res.status(404).json({ message: 'Equipamento não encontrado.' })
  equipment.splice(index, 1)
  return res.status(204).send()
})

app.post('/api/orders', (req, res) => {
  const { customerId, equipmentId, issue, diagnosis = '', estimate = 0, status = 'Orçamento' } = req.body
  if (!customerId || !equipmentId || !issue) return res.status(400).json({ message: 'Cliente, equipamento e problema são obrigatórios.' })
  if (!customers.some(customer => customer.id === customerId)) return res.status(404).json({ message: 'Cliente não encontrado.' })
  if (!equipment.some(item => item.id === equipmentId && item.customerId === customerId)) return res.status(404).json({ message: 'Equipamento não encontrado para este cliente.' })
  const now = new Date().toISOString()
  const order = { id: Math.max(1000, ...orders.map(item => item.id)) + 1, customerId, equipmentId, issue, diagnosis, estimate: Number(estimate) || 0, status, createdAt: now, updatedAt: now }
  orders.unshift(order)
  return res.status(201).json(order)
})

app.put('/api/orders/:id', (req, res) => {
  const order = orders.find(item => item.id === Number(req.params.id))
  if (!order) return res.status(404).json({ message: 'Ordem de serviço não encontrada.' })
  const { customerId, equipmentId, issue, diagnosis, estimate, status } = req.body
  if (customerId !== undefined && !customers.some(customer => customer.id === customerId)) return res.status(404).json({ message: 'Cliente não encontrado.' })
  const nextCustomerId = customerId ?? order.customerId
  const nextEquipmentId = equipmentId ?? order.equipmentId
  if (!equipment.some(item => item.id === nextEquipmentId && item.customerId === nextCustomerId)) return res.status(404).json({ message: 'Equipamento não encontrado para este cliente.' })
  Object.assign(order, { customerId, equipmentId, issue, diagnosis, estimate: estimate === undefined ? order.estimate : Number(estimate) || 0, status, updatedAt: new Date().toISOString() })
  return res.json(order)
})

app.delete('/api/orders/:id', (req, res) => {
  const index = orders.findIndex(item => item.id === Number(req.params.id))
  if (index < 0) return res.status(404).json({ message: 'Ordem de serviço não encontrada.' })
  orders.splice(index, 1)
  return res.status(204).send()
})

app.listen(port, () => console.log(`TechDesk API running on http://localhost:${port}`))
