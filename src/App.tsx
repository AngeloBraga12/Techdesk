import { useEffect, useState } from 'react'
import Dashboard from './components/Dashboard'
import Customers from './components/Customers'
import Equipment from './components/Equipment'
import OrderForm from './components/OrderForm'
import ServiceOrders from './components/ServiceOrders'
import { customers as seedCustomers, equipment as seedEquipment, serviceOrders as seedOrders } from './data/mock'
import { readStorage, writeStorage } from './utils/storage'
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

  function saveOrder(order: ServiceOrder) {
    if (order.id) setOrders(current => current.map(item => item.id === order.id ? order : item))
    else setOrders(current => [{ ...order, id: Math.max(...current.map(item => item.id), 1000) + 1 }, ...current])
    setOrderForm(false); setToast(order.id ? 'Ordem atualizada' : 'Ordem de serviço criada'); setView('orders')
  }
  function deleteOrder(id: number) { if (window.confirm(`Excluir a OS #${id}?`)) { setOrders(current => current.filter(item => item.id !== id)); setToast('Ordem removida') } }
  function updateStatus(id: number, status: OrderStatus) { setOrders(current => current.map(item => item.id === id ? { ...item, status, updatedAt: 'Agora' } : item)); setToast('Status atualizado') }
  function addCustomer(customer: Customer) { setCustomers(current => [customer, ...current]); setToast('Cliente cadastrado') }
  function addEquipment(item: EquipmentType) { setEquipment(current => [item, ...current]); setToast('Equipamento cadastrado') }

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
