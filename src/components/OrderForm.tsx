import { useEffect, useState, type FormEvent } from 'react'
import type { Customer, Equipment, OrderStatus, ServiceOrder } from '../types'

const statuses: OrderStatus[] = ['Orçamento', 'Em análise', 'Aprovado', 'Em reparo', 'Pronto', 'Entregue']

type Props = {
  customers: Customer[]
  equipment: Equipment[]
  order?: ServiceOrder
  onSave: (order: ServiceOrder) => void
  onClose: () => void
}

export default function OrderForm({ customers, equipment, order, onSave, onClose }: Props) {
  const [customerId, setCustomerId] = useState(order?.customerId ?? customers[0]?.id ?? '')
  const [equipmentId, setEquipmentId] = useState(order?.equipmentId ?? '')
  const [issue, setIssue] = useState(order?.issue ?? '')
  const [diagnosis, setDiagnosis] = useState(order?.diagnosis ?? '')
  const [estimate, setEstimate] = useState(String(order?.estimate ?? ''))
  const [status, setStatus] = useState<OrderStatus>(order?.status ?? 'Orçamento')

  const customerEquipment = equipment.filter(item => item.customerId === customerId)
  useEffect(() => {
    if (!customerEquipment.some(item => item.id === equipmentId)) setEquipmentId(customerEquipment[0]?.id ?? '')
  }, [customerId])

  function submit(event: FormEvent) {
    event.preventDefault()
    const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    onSave({ id: order?.id ?? 0, customerId, equipmentId, issue, diagnosis, estimate: Number(estimate) || 0, status, createdAt: order?.createdAt ?? new Date().toISOString(), updatedAt: `Agora, ${now}` })
  }

  return <div className="overlay" onMouseDown={event => event.currentTarget === event.target && onClose()}>
    <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="order-title">
      <div className="modal-head"><div><p className="eyebrow">{order ? 'Editar ordem' : 'Nova ordem'}</p><h2 id="order-title">{order ? `OS #${order.id}` : 'Criar atendimento'}</h2></div><button type="button" className="icon" onClick={onClose} aria-label="Fechar">×</button></div>
      <label>Cliente<select required value={customerId} onChange={event => setCustomerId(event.target.value)}>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select></label>
      <label>Equipamento<select required value={equipmentId} onChange={event => setEquipmentId(event.target.value)}>{customerEquipment.map(item => <option key={item.id} value={item.id}>{item.brand} {item.model} · {item.type}</option>)}</select></label>
      <label>Problema relatado<input required value={issue} onChange={event => setIssue(event.target.value)} placeholder="Descreva o problema" /></label>
      <label>Diagnóstico<textarea value={diagnosis} onChange={event => setDiagnosis(event.target.value)} placeholder="Diagnóstico técnico" rows={3} /></label>
      <div className="form-grid"><label>Valor estimado<input required min="0" type="number" step="0.01" value={estimate} onChange={event => setEstimate(event.target.value)} placeholder="0,00" /></label><label>Status<select value={status} onChange={event => setStatus(event.target.value as OrderStatus)}>{statuses.map(item => <option key={item}>{item}</option>)}</select></label></div>
      <button className="primary" type="submit">{order ? 'Salvar alterações' : 'Criar ordem de serviço'}</button>
    </form>
  </div>
}
