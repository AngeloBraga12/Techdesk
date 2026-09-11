import { useState } from 'react'
import type { Customer } from '../types'

type Props = { customers: Customer[]; onAdd: (customer: Customer) => void }
export default function Customers({ customers, onAdd }: Props) {
  const [query, setQuery] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState(''); const [phone, setPhone] = useState(''); const [email, setEmail] = useState('')
  const visible = customers.filter(c => `${c.name} ${c.phone} ${c.email ?? ''}`.toLowerCase().includes(query.toLowerCase()))
  function submit(event: React.FormEvent) { event.preventDefault(); onAdd({ id: `c-${Date.now()}`, name, phone, email, createdAt: new Date().toISOString() }); setName(''); setPhone(''); setEmail(''); setShowForm(false) }
  return <section className="panel page-panel"><div className="panel-head"><div><h2>Clientes</h2><p className="muted">Cadastre e consulte os clientes da assistência.</p></div><button className="primary" onClick={() => setShowForm(true)}>+ Novo cliente</button></div><div className="page-toolbar"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar cliente..." aria-label="Buscar cliente" /></div><div className="cards-grid">{visible.map(c => <article className="entity-card" key={c.id}><div className="avatar">{c.name.split(' ').map(p => p[0]).slice(0,2).join('')}</div><div><strong>{c.name}</strong><p>{c.phone}</p><small>{c.email || 'E-mail não informado'}</small></div></article>)}{!visible.length && <p className="empty">Nenhum cliente encontrado.</p>}</div>{showForm && <div className="overlay"><form className="modal" onSubmit={submit}><div className="modal-head"><h2>Novo cliente</h2><button type="button" className="icon" onClick={() => setShowForm(false)}>×</button></div><label>Nome<input required value={name} onChange={e => setName(e.target.value)} /></label><label>Telefone<input required value={phone} onChange={e => setPhone(e.target.value)} /></label><label>E-mail<input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label><button className="primary">Cadastrar cliente</button></form></div>}</section>
}
