import { z } from 'zod'

const uuid = z.string().uuid('ID inválido.')
const nonEmpty = (label: string) => z.string().trim().min(1, `${label} é obrigatório.`)
const optionalEmail = z.string().trim().email('E-mail inválido.').max(254).optional().nullable()
const money = z.coerce.number().finite('Valor inválido.').min(0, 'Valor não pode ser negativo.').max(9999999999.99, 'Valor fora do limite.')

export const orderStatuses = ['Orçamento', 'Em análise', 'Aprovado', 'Em reparo', 'Pronto', 'Entregue'] as const

export const customerCreateSchema = z.object({
  name: nonEmpty('Nome').max(120, 'Nome muito longo.'),
  phone: nonEmpty('Telefone').max(30, 'Telefone muito longo.'),
  email: optionalEmail,
}).strict()

export const customerUpdateSchema = customerCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Informe ao menos um campo para atualizar.',
)

const equipmentFields = {
  customerId: uuid,
  type: nonEmpty('Tipo').max(80, 'Tipo muito longo.'),
  brand: nonEmpty('Marca').max(80, 'Marca muito longa.'),
  model: nonEmpty('Modelo').max(120, 'Modelo muito longo.'),
  serialNumber: z.string().trim().max(120, 'Número de série muito longo.').optional().nullable(),
  problemDescription: z.string().trim().max(2000, 'Descrição do problema muito longa.').optional().default(''),
}

export const equipmentCreateSchema = z.object(equipmentFields).strict()
export const equipmentUpdateSchema = equipmentCreateSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Informe ao menos um campo para atualizar.',
)

const orderFields = {
  customerId: uuid,
  equipmentId: uuid,
  issue: nonEmpty('Problema').max(2000, 'Problema muito longo.'),
  diagnosis: z.string().trim().max(4000, 'Diagnóstico muito longo.').default(''),
  estimate: money.default(0),
  status: z.enum(orderStatuses).default('Orçamento'),
}

export const orderCreateSchema = z.object(orderFields).strict()
export const orderUpdateSchema = z.object({
  customerId: uuid.optional(),
  equipmentId: uuid.optional(),
  issue: nonEmpty('Problema').max(2000, 'Problema muito longo.').optional(),
  diagnosis: z.string().trim().max(4000, 'Diagnóstico muito longo.').optional(),
  estimate: money.optional(),
  status: z.enum(orderStatuses).optional(),
}).strict().refine(
  (value) => Object.keys(value).length > 0,
  'Informe ao menos um campo para atualizar.',
)

export const uuidParamSchema = z.object({ id: uuid }).strict()
export const orderIdParamSchema = z.object({ id: z.coerce.number().int().positive('ID da ordem inválido.') }).strict()

export function validationMessage(error: z.ZodError) {
  return error.issues.map((issue) => issue.message).join(' ')
}
