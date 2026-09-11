import { FormEvent, useEffect, useMemo, useState } from 'react'

type Status = 'Orçamento' | 'Em análise' | 'Aprovado' | 'Em reparo' | 'Pronto' | 'Entregue'
type Ticket = { id: number; customer: string; device: string; issue: string; value: number; status: Status; updatedAt: string }

const seed: Ticket[] = [
  { id: 1042, customer: 'Mariana Costa', device: 'Dell Inspiron 15', issue: 'Notebook não inicia', value: 380, status: 'Em reparo', updatedAt: 'Hoje, 14:32' },
  { id: 1041, customer: 'Rafael Souza', device: 'iPhone 13', issue: 'Troca de bateria', value: 290, status: 'Aprovado', updatedAt: 'Hoje, 11:08' },
  { id: 1040, customer: 'Camila Mendes', device: 'PS5', issue: 'Limpeza e manutenção', value: 180, status: 'Pronto', updatedAt: 'Ontem, 16:45' },
  { id: 1039, customer: 'Lucas Ferreira', device: 'PC Gamer', issue: 'Diagnóstico de superaquecimento', value: 120, status: 'Em análise', updatedAt: 'Ontem, 10:21' },
  { id: 1038, customer: 'Beatriz Lima', device: 'MacBook Air M1', issue: 'Problema no carregamento', value: 450, status: 'Entregue', updatedAt: '12/09, 15:10' },
]

const statuses: Status[] = ['Orçamento', 'Em análise', 'Aprovado', 'Em reparo', 'Pronto', 'Entregue']
const nextStatus = (status: Status) => statuses[(statuses.indexOf(status) + 1) % statuses.length]
const money = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try { return JSON.parse(localStorage.getItem('techdesk:tickets') || 'null') || seed } catch { return seed }
  })
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<'Todos' | Status>('Todos')
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast] = useState('')
  const [form, setForm] = useState({ customer: '', device: '', issue: '', value: '' })

  useEffect(() => localStorage.setItem('techdesk:tickets', JSON.stringify(tickets)), [tickets])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(''), 2500); return () => clearTimeout(t) } }, [toast])

  const visible = useMemo(() => tickets.filter(t => {
    const matchesFilter = filter === 'Todos' || t.status === filter
    const text = `${t.customer} ${t.device} ${t.issue} #${t.id}`.toLowerCase()
    return matchesFilter && text.includes(query.toLowerCase())
  }), [tickets, query, filter])

  const metrics = useMemo(() => ({
    active: tickets.filter(t => !['Entregue', 'Pronto'].includes(t.status)).length,
    repair: tickets.filter(t => t.status === 'Em reparo').length,
    revenue: tickets.filter(t => t.status === 'Entregue').reduce((sum, t) => sum + t.value, 0),
    pending: tickets.filter(t => ['Orçamento', 'Em análise'].includes(t.status)).length,
  }), [tickets])

  function addTicket(e: FormEvent) {
    e.preventDefault()
    const ticket: Ticket = { id: Math.max(...tickets.map(t => t.id), 1000) + 1, customer: form.customer, device: form.device, issue: form.issue, value: Number(form.value) || 0, status: 'Orçamento', updatedAt: 'Agora' }
    setTickets(prev => [ticket, ...prev]); setForm({ customer: '', device: '', issue: '', value: '' }); setShowModal(false); setToast(`OS #${ticket.id} criada com sucesso`)
  }

  function advance(id: number) { setTickets(prev => prev.map(t => t.id === id ? { ...t, status: nextStatus(t.status), updatedAt: 'Agora' } : t)); setToast('Status atualizado') }
  function remove(id: number) { setTickets(prev => prev.filter(t => t.id !== id)); setToast('Ordem de serviço removida') }

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><span className="brand-mark">T</span><span>tech<span>desk</span></span></div>
      <nav>
        <a className="active" href="#dashboard">Visão geral</a><a href="#ordens">Ordens de serviço</a><a href="#clientes">Clientes</a><a href="#equipamentos">Equipamentos</a>
      </nav>
      <div className="sidebar-bottom"><div className="mini-user"><span>AB</span><div><strong>Angelo Braga</strong><small>Administrador</small></div></div></div>
    </aside>

    <main className="main" id="dashboard">
      <header className="topbar"><div><p className="eyebrow">Visão geral</p><h1>Bom dia, Angelo.</h1><p className="muted">Acompanhe sua operação em um só lugar.</p></div><button className="primary" onClick={() => setShowModal(true)}>+ Nova ordem</button></header>

      <section className="metrics" aria-label="Indicadores">
        <Metric label="Ordens ativas" value={metrics.active} detail="em andamento" /><Metric label="Em reparo" value={metrics.repair} detail="na bancada" /><Metric label="Receita entregue" value={money(metrics.revenue)} detail="serviços concluídos" /><Metric label="Aguardando" value={metrics.pending} detail="orçamento ou análise" />
      </section>

      <section className="panel" id="ordens">
        <div className="panel-head"><div><h2>Ordens de serviço</h2><p className="muted">Controle seus atendimentos e acompanhe cada etapa.</p></div><div className="head-actions"><div className="search"><span>⌕</span><input aria-label="Buscar ordens" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente, aparelho..." /></div><select aria-label="Filtrar por status" value={filter} onChange={e => setFilter(e.target.value as 'Todos' | Status)}><option>Todos</option>{statuses.map(s => <option key={s}>{s}</option>)}</select></div></div>
        <div className="table-wrap"><table><thead><tr><th>OS</th><th>Cliente</th><th>Equipamento</th><th>Problema</th><th>Valor</th><th>Status</th><th>Atualizado</th><th></th></tr></thead><tbody>
          {visible.map(t => <tr key={t.id}><td className="id">#{t.id}</td><td><strong>{t.customer}</strong></td><td>{t.device}</td><td>{t.issue}</td><td>{money(t.value)}</td><td><button className={`status status-${t.status.toLowerCase().replaceAll(' ', '-')}`} onClick={() => advance(t.id)} title="Clique para avançar o status">{t.status}</button></td><td className="muted">{t.updatedAt}</td><td><button className="icon" onClick={() => remove(t.id)} aria-label={`Excluir OS ${t.id}`}>×</button></td></tr>)}
          {visible.length === 0 && <tr><td colSpan={8} className="empty">Nenhuma ordem encontrada com esses filtros.</td></tr>}
        </tbody></table></div>
      </section>

      <section className="lower" id="clientes"><div className="panel insight"><div className="panel-head"><div><h2>Fluxo de atendimento</h2><p className="muted">Distribuição atual das ordens.</p></div></div>{statuses.slice(0,5).map(s => { const count = tickets.filter(t => t.status === s).length; return <div className="bar-row" key={s}><span>{s}</span><div><i style={{ width: `${Math.max(count / Math.max(tickets.length,1) * 100, count ? 8 : 0)}%` }} /></div><b>{count}</b></div>})}</div><div className="panel next"><p className="eyebrow">Próximo passo</p><h2>Da bancada para o produto.</h2><p className="muted">Esta versão usa localStorage. A próxima evolução pode adicionar API, PostgreSQL, autenticação e múltiplos usuários.</p><div className="stack"><span>React</span><span>TypeScript</span><span>REST API</span><span>PostgreSQL</span></div></div></section>
    </main>

    {showModal && <div className="overlay" onMouseDown={e => e.currentTarget === e.target && setShowModal(false)}><form className="modal" onSubmit={addTicket}><div className="modal-head"><div><p className="eyebrow">Nova ordem</p><h2>Criar atendimento</h2></div><button type="button" className="icon" onClick={() => setShowModal(false)}>×</button></div><label>Cliente<input required value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="Nome do cliente" /></label><label>Equipamento<input required value={form.device} onChange={e => setForm({ ...form, device: e.target.value })} placeholder="Ex.: Notebook Dell" /></label><label>Problema relatado<input required value={form.issue} onChange={e => setForm({ ...form, issue: e.target.value })} placeholder="Descreva o problema" /></label><label>Valor estimado<input required min="0" type="number" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="0,00" /></label><button className="primary" type="submit">Criar ordem de serviço</button></form></div>}
    {toast && <div className="toast" role="status">{toast}</div>}
  </div>
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail: string }) { return <article className="metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article> }
