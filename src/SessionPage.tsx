import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Acquisition, AuthClient } from './auth'
import { ApiError, type Identity, type Order, type createApi } from './api'

export function SessionPage({ auth, api }: { auth: AuthClient; api: ReturnType<typeof createApi> }) {
  const [identity, setIdentity] = useState<Identity>()
  const [acquisition, setAcquisition] = useState<Acquisition | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    let active = true
    api<Identity>('/me').then(value => {
      if (active) { setIdentity(value); setAcquisition(auth.lastAcquisition()) }
    }).catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'No fue posible consultar la sesión.') })
    return () => { active = false }
  }, [api, auth])
  async function refresh() {
    setBusy(true); setError(''); setStatus('')
    try {
      await auth.token(true)
      const acquired = auth.lastAcquisition()
      setIdentity(await api<Identity>('/me'))
      setAcquisition(acquired)
      setStatus('Renovación solicitada a Microsoft; la API aceptó el token. No es una prueba de expiración natural.')
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'No fue posible renovar la sesión.') }
    finally { setBusy(false) }
  }
  async function checkAdmin() {
    setBusy(true); setError(''); setStatus('')
    try {
      const orders = await api<Order[]>('/admin/pedidos')
      setStatus(`Consulta Admin: HTTP 200. ${orders.length} pedidos en el tenant.`)
    } catch (reason) {
      if (reason instanceof ApiError) setStatus(`Consulta Admin: HTTP ${reason.status}. ${reason.message}`)
      else setError(reason instanceof Error ? reason.message : 'No fue posible verificar el acceso.')
    } finally { setBusy(false) }
  }
  return <section className="page page-orders">
    <div className="section-title"><div className="section-heading">
      <p className="eyebrow"><span>04</span> IDENTIDAD Y ACCESO</p>
      <h1>Mi sesión</h1><p className="section-lead">Identidad y permisos comprobados por la API.</p>
    </div></div>
    {error && <p role="alert" className="error">{error}</p>}
    {status && <p role="status" className="config-status">{status}</p>}
    {!identity && !error && <p role="status" className="loading-state">Consultando sesión…</p>}
    {identity && <article className="order">
      <div className="order-header"><div><small className="order-code">{auth.mode === 'entra' ? 'MICROSOFT ENTRA' : 'DEMOSTRACIÓN LOCAL'}</small>
        <h2>{identity.name ?? auth.user()}</h2><p>{identity.username}</p></div>
        <span className="badge badge-success">{identity.roles.join(' · ') || 'Sin rol asignado'}</span></div>
      <div className="order-body"><dl>
        <dt>Permisos de la API</dt><dd>{identity.scopes.join(' · ')}</dd>
        <dt>Tenant</dt><dd>{identity.tenantId}</dd>
        <dt>Identidad del propietario</dt><dd>{identity.subjectId}</dd>
        <dt>Subject del token</dt><dd>{identity.tokenSubject}</dd>
        <dt>API destinataria (audience)</dt><dd>{identity.audience.join(', ')}</dd>
        <dt>Cliente autorizado</dt><dd>{identity.clientId}</dd>
        <dt>Emisor</dt><dd>{identity.issuer}</dd>
        <dt>Versión de token</dt><dd>{identity.tokenVersion}</dd>
        <dt>Emitido</dt><dd>{identity.issuedAt ? new Date(identity.issuedAt).toLocaleString('es-CL') : 'No informado'}</dd>
        <dt>Válido hasta</dt><dd>{new Date(identity.expiresAt).toLocaleString('es-CL')}</dd>
        {acquisition && <><dt>Última adquisición</dt><dd>{acquisition.requestedRefresh ? 'Renovación solicitada' : 'Adquisición silenciosa'} · {acquisition.fromCache ? 'desde caché MSAL' : 'desde Microsoft'}</dd></>}
      </dl></div>
      <div className="hero-actions">
        {auth.mode === 'entra' && <button className="button button-primary" disabled={busy} onClick={refresh}>Renovar sesión</button>}
        <button className="button" disabled={busy} onClick={checkAdmin}>Comprobar acceso Admin</button>
        {identity.roles.includes('Admin') && <Link className="button" to="/administracion">Pedidos del tenant</Link>}
        {auth.mode === 'entra' && <button className="button" disabled={busy} onClick={() => { void auth.login().catch(reason => setError(reason instanceof Error ? reason.message : 'No fue posible cambiar de cuenta.')) }}>Cambiar cuenta</button>}
      </div>
    </article>}
  </section>
}
