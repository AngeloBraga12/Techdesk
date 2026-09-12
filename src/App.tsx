import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import Customers from './components/Customers'
import Equipment from './components/Equipment'
import OrderForm from './components/OrderForm'
import ServiceOrders from './components/ServiceOrders'
import { customers as seedCustomers, equipment as seedEquipment, serviceOrders as seedOrders } from './data/mock'
import { readStorage, writeStorage } from './utils/storage'
import { api } from './services/api'
import type { Customer, Equipment as EquipmentType, OrderStatus, ServiceOrder } from './types'

type View = 'dashboard' | 'orders' | 'customers' | 'equipment'
const customerKey = 'techdesk:customers'
const equipmentKey = 'techdesk:equipment'
const ordersKey = 'techdesk:orders'

export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [customers, setCustomers] = useState<Customer[]>(() => readStorage(customerKey, seedCustomers))
  const [equipment, setEquipment] = useState<EquipmentType[]>(() => readStorage(equipmentKey, seedEquipment))
  const [orders, setOrders] = useState<ServiceOrder[]>(() => readStorage(ordersKey, seedOrders))
  const [orderForm, setOrderForm] = useState<ServiceOrder | null | false>(false)
  const [toast, setToast] = useState('')

  useEffect(() => writeStorage(customerKey, customers), [customers])
  useEffect(() => writeStorage(equipmentKey, equipment), [equipment])
  useEffect(() => writeStorage(ordersKey, orders), [orders])
  useEffect(() => { if (!toast) return; const timer = window.setTimeout(() => setToast(''), 2500); return () => window.clearTimeout(timer) }, [toast])

  useEffect(() => {
    let active = true
    async function hydrateFromApi() {
      try {
        await api.health()
        const [remoteCustomers, remoteEquipment, remoteOrders] = await Promise.all([
          api.customers.list(),
          api.equipment.list(),
          api.orders.list(),
        ])
        if (!active) return
        setCustomers(remoteCustomers)
        setEquipment(remoteEquipment)
        setOrders(remoteOrders)
        setToast('API conectada')
      } catch {
        if (active) setToast('API indisponível. Usando dados locais.')
      }
    }
    void hydrateFromApi()
    return () => { active = false }
  }, [])

  async function saveOrder(order: ServiceOrder) {
    try {
      if (order.id) {
        const saved = await api.orders.update(order.id, order)
        setOrders(current => current.map(item => item.id === saved.id ? saved : item))
      } else {
        const { id: _id, ...payload } = order
        const saved = await api.orders.create(payload)
        setOrders(current => [saved, ...current])
      }
      setToast(order.id ? 'Ordem atualizada' : 'Ordem de serviço criada')
    } catch {
      if (order.id) setOrders(current => current.map(item => item.id === order.id ? order : item))
      else setOrders(current => [{ ...order, id: Math.max(...current.map(item => item.id), 1000) + 1 }, ...current])
      setToast('API indisponível. Alteração salva localmente.')
    }
    setOrderForm(false)
    setView('orders')
  }

  async function deleteOrder(id: number) {
    if (!window.confirm(`Excluir a OS #${id}?`)) return
    try {
      await api.orders.remove(id)
      setOrders(current => current.filter(item => item.id !== id))
      setToast('Ordem removida')
    } catch {
      setOrders(current => current.filter(item => item.id !== id))
      setToast('API indisponível. Ordem removida localmente.')
    }
  }

  async function updateStatus(id: number, status: OrderStatus) {
    try {
      const saved = await api.orders.update(id, { status })
      setOrders(current => current.map(item => item.id === saved.id ? saved : item))
      setToast('Status atualizado')
    } catch {
      setOrders(current => current.map(item => item.id === id ? { ...item, status, updatedAt: new Date().toISOString() } : item))
      setToast('API indisponível. Status atualizado localmente.')
    }
  }

  async function addCustomer(customer: Customer) {
    try {
      const { id: _id, createdAt: _createdAt, ...payload } = customer
      const saved = await api.customers.create(payload)
      setCustomers(current => [saved, ...current])
      setToast('Cliente cadastrado')
    } catch {
      setCustomers(current => [customer, ...current])
      setToast('API indisponível. Cliente salvo localmente.')
    }
  }

  async function addEquipment(item: EquipmentType) {
    try {
      const { id: _id, ...payload } = item
      const saved = await api.equipment.create(payload)
      setEquipment(current => [saved, ...current])
      setToast('Equipamento cadastrado')
    } catch {
      setEquipment(current => [item, ...current])
      setToast('API indisponível. Equipamento salvo localmente.')
    }
  }

  const nav = (next: View) => setView(next)
  const pageTitle = { dashboard: 'Visão geral', orders: 'Ordens de serviço', customers: 'Clientes', equipment: 'Equipamentos' }[view]
  return <div className="app">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">T</span><span>tech<span>desk</span></span></div><nav aria-label="Navegação principal">
      <button className={view === 'dashboard' ? 'active' : ''} onClick={() => nav('dashboard')}>Visão geral</button>
      <button className={view === 'orders' ? 'active' : ''} onClick={() => nav('orders')}>Ordens de serviço</button>
      <button className={view === 'customers' ? 'active' : ''} onClick={() => nav('customers')}>Clientes</button>
      <button className={view === 'equipment' ? 'active' : ''} onClick={() => nav('equipment')}>Equipamentos</button>
    </nav><div className="sidebar-bottom"><div className="mini-user"><span>AB</span><div><strong>Angelo Braga</strong><small>Administrador</small></div></div></div></aside>
    <main className="main"><div className="mobile-heading"><p className="eyebrow">TechDesk</p><h1>{pageTitle}</h1></div>
      {view === 'dashboard' && <Dashboard orders={orders} customers={customers} onNewOrder={() => setOrderForm(null)} />}
      {view === 'orders' && <><header className="topbar compact"><div><p className="eyebrow">Operação</p><h1>Ordens de serviço</h1><p className="muted">Crie, edite e acompanhe cada atendimento.</p></div><button className="primary" onClick={() => setOrderForm(null)}>+ Nova ordem</button></header><ServiceOrders orders={orders} customers={customers} equipment={equipment} onEdit={setOrderForm} onDelete={deleteOrder} onStatus={updateStatus} /></>}
      {view === 'customers' && <><header className="topbar compact"><div><p className="eyebrow">Cadastro</p><h1>Clientes</h1></div></header><Customers customers={customers} onAdd={addCustomer} /></>}
      {view === 'equipment' && <><header className="topbar compact"><div><p className="eyebrow">Inventário</p><h1>Equipamentos</h1></div></header><Equipment customers={customers} equipment={equipment} onAdd={addEquipment} /></>}
    </main>
    {orderForm !== false && <OrderForm customers={customers} equipment={equipment} order={orderForm || undefined} onSave={saveOrder} onClose={() => setOrderForm(false)} />}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}
