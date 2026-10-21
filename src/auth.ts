import { InteractionRequiredAuthError, PublicClientApplication } from '@azure/msal-browser'
import { apiScopes } from './scopes'

export interface Acquisition { requestedRefresh: boolean; fromCache: boolean; at: string }

export interface AuthClient {
  mode: 'local' | 'entra' | 'unconfigured'
  msal?: PublicClientApplication
  user(): string | null
  login(): Promise<void>
  logout(): Promise<void>
  token(forceRefresh?: boolean): Promise<string>
  lastAcquisition(): Acquisition | null
}

export async function createAuth(): Promise<AuthClient> {
  if (import.meta.env.DEV && import.meta.env.VITE_AUTH_MODE === 'local') {
    let active = false
    return {
      mode: 'local',
      lastAcquisition: () => null,
      user: () => active ? 'Usuario de demostración' : null,
      async login() { active = true },
      async logout() { active = false },
      async token() {
        if (!active) throw new Error('Inicia la sesión local para continuar.')
        const response = await fetch('http://127.0.0.1:8190/token', { method: 'POST', redirect: 'error' })
        if (!response.ok) throw new Error('El emisor local de pruebas no está disponible.')
        return (await response.json()).accessToken as string
      },
    }
  }
  const clientId = import.meta.env.VITE_AZURE_CLIENT_ID
  const tenantId = import.meta.env.VITE_AZURE_TENANT_ID
  const configuredScopes = import.meta.env.VITE_API_SCOPES ?? ''
  if (import.meta.env.VITE_AUTH_MODE !== 'entra' || !clientId || !tenantId || !configuredScopes.trim()) {
    return {
      mode: 'unconfigured', user: () => null,
      lastAcquisition: () => null,
      async login() { throw new Error('Configura Microsoft Entra para habilitar el inicio de sesión.') },
      async logout() {},
      async token() { throw new Error('La autenticación no está configurada.') },
    }
  }
  const scopes = apiScopes(configuredScopes)
  const msal = new PublicClientApplication({
    auth: { clientId, authority: 'https://login.microsoftonline.com/' + tenantId, redirectUri: window.location.origin + '/', postLogoutRedirectUri: window.location.origin + '/' },
    cache: { cacheLocation: 'sessionStorage' },
  })
  await msal.initialize()
  const redirect = await msal.handleRedirectPromise()
  if (redirect?.account) msal.setActiveAccount(redirect.account)
  const accounts = msal.getAllAccounts()
  if (!msal.getActiveAccount() && accounts.length === 1) msal.setActiveAccount(accounts[0])
  let last: Acquisition | null = null
  return {
    mode: 'entra', msal,
    lastAcquisition: () => last,
    user: () => msal.getActiveAccount()?.name ?? msal.getActiveAccount()?.username ?? null,
    async login() { await msal.loginRedirect({ scopes, prompt: 'select_account' }) },
    async logout() { await msal.logoutRedirect({ account: msal.getActiveAccount() }) },
    async token(forceRefresh = false) {
      const account = msal.getActiveAccount()
      if (!account) throw new Error('Selecciona una cuenta para continuar.')
      try {
        const result = await msal.acquireTokenSilent({ scopes, account, forceRefresh })
        last = { requestedRefresh: forceRefresh, fromCache: result.fromCache, at: new Date().toISOString() }
        return result.accessToken
      }
      catch (error) {
        if (error instanceof InteractionRequiredAuthError) {
          await msal.acquireTokenRedirect({ scopes, account })
          throw new Error('Continúa con Microsoft para autorizar el acceso.')
        }
        throw error
      }
    },
  }
}
