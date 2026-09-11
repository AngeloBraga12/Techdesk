export type OrderStatus = 'Orçamento' | 'Em análise' | 'Aprovado' | 'Em reparo' | 'Pronto' | 'Entregue'

export type Customer = {
  id: string
  name: string
  phone: string
  email?: string
  createdAt: string
}

export type Equipment = {
  id: string
  customerId: string
  type: string
  brand: string
  model: string
  serialNumber?: string
  problemDescription: string
}

export type ServiceOrder = {
  id: number
  customerId: string
  equipmentId: string
  issue: string
  diagnosis: string
  estimate: number
  status: OrderStatus
  createdAt: string
  updatedAt: string
}
