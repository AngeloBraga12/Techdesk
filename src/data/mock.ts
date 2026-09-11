import type { Customer, Equipment, ServiceOrder } from '../types'

export const customers: Customer[] = [
  { id: 'c1', name: 'Mariana Costa', phone: '(12) 99124-3010', email: 'mariana@example.com', createdAt: '2026-09-08' },
  { id: 'c2', name: 'Rafael Souza', phone: '(12) 99871-4420', email: 'rafael@example.com', createdAt: '2026-09-07' },
  { id: 'c3', name: 'Camila Mendes', phone: '(12) 99640-1182', createdAt: '2026-09-06' },
  { id: 'c4', name: 'Lucas Ferreira', phone: '(12) 99112-7740', email: 'lucas@example.com', createdAt: '2026-09-05' },
]

export const equipment: Equipment[] = [
  { id: 'e1', customerId: 'c1', type: 'Notebook', brand: 'Dell', model: 'Inspiron 15', serialNumber: 'DEMO-001', problemDescription: 'Notebook não inicia' },
  { id: 'e2', customerId: 'c2', type: 'Smartphone', brand: 'Apple', model: 'iPhone 13', serialNumber: 'DEMO-002', problemDescription: 'Bateria com baixa autonomia' },
  { id: 'e3', customerId: 'c3', type: 'Console', brand: 'Sony', model: 'PlayStation 5', problemDescription: 'Limpeza e manutenção preventiva' },
  { id: 'e4', customerId: 'c4', type: 'Desktop', brand: 'Custom', model: 'PC Gamer', problemDescription: 'Diagnóstico de superaquecimento' },
]

export const serviceOrders: ServiceOrder[] = [
  { id: 1042, customerId: 'c1', equipmentId: 'e1', issue: 'Notebook não inicia', diagnosis: 'Falha no circuito de alimentação', estimate: 380, status: 'Em reparo', createdAt: '2026-09-10', updatedAt: 'Hoje, 14:32' },
  { id: 1041, customerId: 'c2', equipmentId: 'e2', issue: 'Troca de bateria', diagnosis: 'Saúde da bateria abaixo do recomendado', estimate: 290, status: 'Aprovado', createdAt: '2026-09-10', updatedAt: 'Hoje, 11:08' },
  { id: 1040, customerId: 'c3', equipmentId: 'e3', issue: 'Limpeza e manutenção', diagnosis: 'Acúmulo de poeira no sistema de refrigeração', estimate: 180, status: 'Pronto', createdAt: '2026-09-09', updatedAt: 'Ontem, 16:45' },
  { id: 1039, customerId: 'c4', equipmentId: 'e4', issue: 'Diagnóstico de superaquecimento', diagnosis: '', estimate: 120, status: 'Em análise', createdAt: '2026-09-09', updatedAt: 'Ontem, 10:21' },
]
