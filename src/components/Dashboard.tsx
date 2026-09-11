import type { Customer, ServiceOrder } from '../types'

const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const statuses = ['Orçamento', 'Em análise', 'Aprovado', 'Em reparo', 'Pronto'] as const

type Props = { orders: ServiceOrder[]; customers: Customer[]; onNewOrder: () => void }
export default function Dashboard({ orders, customers, onNewOrder }: Props) {
  const active = orders.filter(o => !['Entregue', 'Pronto'].includes(o.status)).length
  const repair = orders.filter(o => o.status === 'Em reparo').length
  const revenue = orders.filter(o => o.status === 'Entregue').reduce((sum, o) => sum + o.estimate, 0)
  const pending = orders.filter(o => ['Orçamento', 'Em análise'].includes(o.status)).length
  const customerName = (id: string) => customers.find(c => c.id === id)?.name ?? 'Cliente'
  return <>
    <header className="topbar"><div><p className="eyebrow">Visão geral</p><h1>Bom dia, Angelo.</h1><p className="muted">Acompanhe sua operação em um só lugar.</p></div><button className="primary" onClick={onNewOrder}>+ Nova ordem</button></header>
    <section className="metrics"><Metric label="Ordens ativas" value={active} detail="em andamento" /><Metric label="Em reparo" value={repair} detail="na bancada" /><Metric label="Receita entregue" value={money(revenue)} detail="serviços concluídos" /><Metric label="Aguardando" value={pending} detail="orçamento ou análise" /></section>
    <section className="lower"><div className="panel insight"><div className="panel-head"><div><h2>Fluxo de atendimento</h2><p className="muted">Distribuição atual das ordens.</p></div></div>{statuses.map(status => { const count = orders.filter(o => o.status === status).length; return <div className="bar-row" key={status}><span>{status}</span><div><i style={{ width: `${Math.max(count / Math.max(orders.length, 1) * 100, count ? 8 : 0)}%` }} /></div><b>{count}</b></div>})}</div><div className="panel next"><p className="eyebrow">Produto</p><h2>Da bancada para o produto.</h2><p className="muted">O TechDesk já modela clientes, equipamentos e ordens de serviço. A próxima camada natural é substituir a persistência local por API e banco de dados.</p><div className="stack"><span>{customers.length} clientes</span><span>{orders.length} OS</span><span>React + TypeScript</span><span>Local-first</span></div><h3>Atendimentos recentes</h3>{orders.slice(0,3).map(o => <div className="recent" key={o.id}><strong>#{o.id}</strong><span>{customerName(o.customerId)}</span><small>{o.status}</small></div>)}</div></section>
  </>
}
function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }
