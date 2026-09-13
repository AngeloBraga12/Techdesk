import { FormEvent, useState } from 'react'
import { api, type AuthUser } from '../services/api'
import '../login.css'

type Props = { onAuthenticated: (user: AuthUser) => void }

export default function Login({ onAuthenticated }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true)
    try { const result = await api.auth.login(email, password); onAuthenticated(result.user) }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível autenticar.') }
    finally { setLoading(false) }
  }

  return <main className="login-screen">
    <section className="login-card" aria-labelledby="login-title">
      <div className="brand"><span className="brand-mark">T</span><span>tech<span>desk</span></span></div>
      <p className="eyebrow">Acesso seguro</p><h1 id="login-title">Entrar no TechDesk</h1>
      <p className="muted">Use sua conta para acessar clientes, equipamentos e ordens de serviço.</p>
      <form className="login-form" onSubmit={submit}>
        <label>E-mail<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required maxLength={254} /></label>
        <label>Senha<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required minLength={12} maxLength={128} /></label>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="primary" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </section>
  </main>
}
