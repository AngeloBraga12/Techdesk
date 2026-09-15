import { useState, type FormEvent } from 'react'
import { api } from '../services/api'

type Props = { onComplete: () => void }

export default function SetupAdmin({ onComplete }: Props) {
  const [form, setForm] = useState({ setupKey: '', name: '', email: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) { setError('As senhas não coincidem.'); return }
    setSaving(true)
    try {
      await api.auth.bootstrap(form.setupKey.trim(), form.name, form.email, form.password)
      onComplete()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar o administrador.')
    } finally { setSaving(false) }
  }

  return <main className="login-screen"><form className="login-card setup-card" onSubmit={submit}>
    <div className="brand"><span className="brand-mark">T</span><span>tech<span>desk</span></span></div>
    <div><p className="eyebrow">Primeira configuração</p><h1>Criar administrador</h1><p className="muted">Use esta tela apenas na primeira configuração. Depois que a primeira conta existir, esta etapa é encerrada.</p></div>
    <label>Chave de configuração<input required type="password" autoComplete="off" value={form.setupKey} onChange={event => setForm({ ...form, setupKey: event.target.value })} /></label>
    <label>Nome<input required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></label>
    <label>E-mail<input required type="email" maxLength={254} autoComplete="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} /></label>
    <label>Senha<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} /></label>
    <label>Confirmar senha<input required minLength={8} maxLength={128} type="password" autoComplete="new-password" value={form.confirmPassword} onChange={event => setForm({ ...form, confirmPassword: event.target.value })} /></label>
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className="primary" disabled={saving}>{saving ? 'Criando…' : 'Criar administrador'}</button>
    <button className="secondary" type="button" onClick={onComplete}>Voltar para login</button>
  </form></main>
}
