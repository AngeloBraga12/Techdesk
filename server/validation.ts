export const orderStatuses = ['Orçamento', 'Em análise', 'Aprovado', 'Em reparo', 'Pronto', 'Entregue'] as const
export type OrderStatus = (typeof orderStatuses)[number]

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; message: string }
type FieldSpec = { required?: boolean; max?: number; nullable?: boolean; number?: boolean }

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function validateObject(body: unknown, specs: Record<string, FieldSpec>, partial = false): ValidationResult<Record<string, unknown>> {
  if (!isObject(body)) return { ok: false, message: 'Corpo da requisição deve ser um objeto JSON.' }
  if (partial && Object.keys(body).length === 0) return { ok: false, message: 'Informe ao menos um campo para atualizar.' }

  for (const key of Object.keys(body)) {
    if (!Object.prototype.hasOwnProperty.call(specs, key)) return { ok: false, message: `Campo não permitido: ${key}.` }
  }

  for (const [key, spec] of Object.entries(specs)) {
    const value = body[key]
    if (value === undefined) {
      if (spec.required && !partial) return { ok: false, message: `${key} é obrigatório.` }
      continue
    }
    if (value === null && spec.nullable) continue
    if (spec.number) {
      if (typeof value !== 'number' && typeof value !== 'string') return { ok: false, message: `${key} deve ser um número.` }
      const numeric = Number(value)
      if (!Number.isFinite(numeric)) return { ok: false, message: `${key} inválido.` }
      continue
    }
    if (typeof value !== 'string') return { ok: false, message: `${key} deve ser texto.` }
    const trimmed = value.trim()
    if (!trimmed && spec.required) return { ok: false, message: `${key} é obrigatório.` }
    if (spec.max && trimmed.length > spec.max) return { ok: false, message: `${key} excede o limite de ${spec.max} caracteres.` }
  }

  const normalized = { ...body }
  for (const [key, spec] of Object.entries(specs)) {
    if (spec.number && normalized[key] !== undefined) normalized[key] = Number(normalized[key])
    else if (typeof normalized[key] === 'string') normalized[key] = (normalized[key] as string).trim()
  }
  return { ok: true, value: normalized }
}

const customerSpecs: Record<string, FieldSpec> = {
  name: { required: true, max: 120 }, phone: { required: true, max: 30 }, email: { max: 254, nullable: true },
}
const equipmentSpecs: Record<string, FieldSpec> = {
  customerId: { required: true, max: 36 }, type: { required: true, max: 80 }, brand: { required: true, max: 80 }, model: { required: true, max: 120 }, serialNumber: { max: 120, nullable: true }, problemDescription: { max: 2000 },
}
const orderSpecs: Record<string, FieldSpec> = {
  customerId: { required: true, max: 36 }, equipmentId: { required: true, max: 36 }, issue: { required: true, max: 2000 }, diagnosis: { max: 4000 }, estimate: { number: true }, status: {},
}

function validateCommon(result: ValidationResult<Record<string, unknown>>) {
  if (!result.ok) return result
  if (result.value.email !== undefined && result.value.email !== null && !emailPattern.test(String(result.value.email))) return { ok: false as const, message: 'E-mail inválido.' }
  return result
}

export function validateCustomerCreate(body: unknown) { return validateCommon(validateObject(body, customerSpecs)) }
export function validateCustomerUpdate(body: unknown) { return validateCommon(validateObject(body, customerSpecs, true)) }

function validateEquipmentBody(body: unknown, partial: boolean) {
  const result = validateObject(body, equipmentSpecs, partial)
  if (!result.ok) return result
  if (result.value.customerId !== undefined && !uuidPattern.test(String(result.value.customerId))) return { ok: false as const, message: 'customerId inválido.' }
  return result
}
export function validateEquipmentCreate(body: unknown) { return validateEquipmentBody(body, false) }
export function validateEquipmentUpdate(body: unknown) { return validateEquipmentBody(body, true) }

function validateOrderBody(body: unknown, partial: boolean): ValidationResult<Record<string, unknown>> {
  const result = validateObject(body, orderSpecs, partial)
  if (!result.ok) return result
  for (const field of ['customerId', 'equipmentId']) {
    if (result.value[field] !== undefined && !uuidPattern.test(String(result.value[field]))) return { ok: false, message: `${field} inválido.` }
  }
  if (result.value.estimate !== undefined) {
    const value = Number(result.value.estimate)
    if (!Number.isFinite(value) || value < 0 || value > 9999999999.99) return { ok: false, message: 'Orçamento inválido.' }
    result.value.estimate = value
  }
  if (result.value.status !== undefined && !orderStatuses.includes(String(result.value.status) as OrderStatus)) return { ok: false, message: 'Status da ordem inválido.' }
  return result
}

export function validateOrderCreate(body: unknown) { return validateOrderBody(body, false) }
export function validateOrderUpdate(body: unknown) { return validateOrderBody(body, true) }
export function validateUuidParam(id: string) { return uuidPattern.test(id) }
export function validateOrderIdParam(id: string) { const value = Number(id); return Number.isInteger(value) && value > 0 }
