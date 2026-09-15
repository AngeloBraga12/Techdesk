import { useEffect, useState } from 'react'
import { api, type AdminUser } from '../services/api'

type Props = { currentUserId: string; onToast: (message: string) => void }

export default function AdminPanel({ currentUserId, onToast }: Props) {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '' })

  async function loadUsers() {
    setLoading(true)
    try { setUsers(await api.admin.users()) }
    catch { onToast('Não foi possível carregar os usuários.') }
    finally { setLoading(false) }
  }

  useEffect(() => { void loadUsers() }, [])

  async function createUser(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    try {
      const created = await api.admin.createUser(form.name, form.email, form.password)
      setUsers(current => [...current, created])
      setForm({ name: '', email: '', password: '' })
      onToast('Técnico criado com sucesso.')
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Não foi possível criar o usuário.')
    } finally { setSaving(false) }
  }

  async function toggleUser(user: AdminUser) {
    try {
      const updated = await api.admin.setUserActive(user.id, !user.active)
      setUsers(current => current.map(item => item.id === updated.id ? updated : item))
      onToast(updated.active ? 'Usuário ativado.' : 'Usuário desativado.')
    } catch (error) {
      onToast(error instanceof Error ? error.message : 'Não foi possível alterar o usuário.')
    }
  }

  return <>
    <header className="topbar compact"><div><p className="eyebrow">Administração</p><h1>Controle de acesso</h1><p className="muted">Gerencie técnicos e mantenha o acesso operacional sob controle.</p></div></header>
    <section className="admin-grid">
      <form className="panel admin-form" onSubmit={createUser}>
        <div className="panel-head"><div><h2>Novo técnico</h2><p className="muted">Contas criadas aqui entram como Técnico.</p></div></div>
        <div className="admin-form-body">
          <label>Nome<input required minLength={2} maxLength={120} value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
          <label>E-mail<input required type="email" maxLength={254} value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
          <label>Senha<input required minLength={12} maxLength={128} type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /><small>Use pelo menos 12 caracteres.</small></label>
          <button className="primary" disabled={saving}>{saving ? 'Criando…' : 'Criar técnico'}</button>
        </div>
      </form>

      <section className="panel page-panel">
        <div className="panel-head"><div><h2>Usuários</h2><p className="muted">Administradores não podem ser desativados por esta tela.</p></div><button className="secondary" onClick={() => void loadUsers()}>Atualizar</button></div>
        {loading ? <p className="empty">Carregando usuários…</p> : <div className="table-wrap"><table><thead><tr><th>Usuário</th><th>Perfil</th><th>Status</th><th>Ação</th></tr></thead><tbody>{users.map(user => <tr key={user.id}><td><strong>{user.name}</strong><br /><span className="muted">{user.email}</span></td><td>{user.role === 'ADMIN' ? 'Administrador' : 'Técnico'}</td><td><span className={`admin-status ${user.active ? 'active' : 'inactive'}`}>{user.active ? 'Ativo' : 'Inativo'}</span></td><td>{user.role === 'TECHNICIAN' && user.id !== currentUserId ? <button className="text-button" onClick={() => void toggleUser(user)}>{user.active ? 'Desativar' : 'Ativar'}</button> : <span className="muted">Protegido</span>}</td></tr>)}</tbody></table></div>}
      </section>
    </section>
  </>
}
