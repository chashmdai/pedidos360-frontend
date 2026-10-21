import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { apiScopes } from './scopes'

const { msal, account, configuration } = vi.hoisted(() => {
  const account = { name: 'Usuario de prueba', username: 'test@example.invalid' }
  return { account, configuration: vi.fn(), msal: {
    initialize: vi.fn(), handleRedirectPromise: vi.fn(), setActiveAccount: vi.fn(),
    getAllAccounts: vi.fn(), getActiveAccount: vi.fn(), loginRedirect: vi.fn(),
    logoutRedirect: vi.fn(), acquireTokenSilent: vi.fn(), acquireTokenRedirect: vi.fn(),
  } }
})
vi.mock('@azure/msal-browser', () => ({
  PublicClientApplication: class { constructor(options: unknown) { configuration(options); return msal } },
  InteractionRequiredAuthError: class extends Error {},
}))
import { InteractionRequiredAuthError } from '@azure/msal-browser'
import { createAuth } from './auth'

const scopes = ['Catalog.Read', 'Orders.Read', 'Orders.Create'].map(name => `api://114f7b58-b207-4d46-9d6e-f491c3a0c0e0/${name}`)
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubEnv('VITE_AUTH_MODE', 'entra')
  vi.stubEnv('VITE_AZURE_CLIENT_ID', 'b4ede06a-cde3-4982-8b79-56fab7264fdd')
  vi.stubEnv('VITE_AZURE_TENANT_ID', '72fd0b5a-8a6a-4cff-89f6-bde961f7e250')
  vi.stubEnv('VITE_API_SCOPES', scopes.join(' '))
  vi.stubGlobal('window', { location: { origin: 'http://localhost:5173' } })
  msal.getAllAccounts.mockReturnValue([account])
  msal.getActiveAccount.mockReturnValue(account)
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('MSAL API access', () => {
  it('keeps cloud redirect and logout under the deployed SPA base path', async () => {
    vi.stubEnv('BASE_URL', '/app/')
    vi.stubGlobal('window', { location: { origin: 'https://7k2zyh0t0d.execute-api.us-east-1.amazonaws.com' } })
    await createAuth()
    expect(configuration).toHaveBeenCalledWith(expect.objectContaining({ auth: expect.objectContaining({
      redirectUri: 'https://7k2zyh0t0d.execute-api.us-east-1.amazonaws.com/app/',
      postLogoutRedirectUri: 'https://7k2zyh0t0d.execute-api.us-east-1.amazonaws.com/app/',
    }) }))
  })
  it('returns the access token, requests exactly the API scopes, and can force refresh', async () => {
    msal.acquireTokenSilent.mockResolvedValue({ accessToken: 'api-access', idToken: 'identity-only', fromCache: true })
    const auth = await createAuth()
    expect(await auth.token()).toBe('api-access')
    expect(msal.acquireTokenSilent).toHaveBeenLastCalledWith({ scopes, account, forceRefresh: false })
    expect(auth.lastAcquisition()).toMatchObject({ fromCache: true, requestedRefresh: false })
    await auth.token(true)
    expect(msal.acquireTokenSilent).toHaveBeenLastCalledWith({ scopes, account, forceRefresh: true })
  })
  it('uses interactive fallback only when Microsoft requires interaction', async () => {
    msal.acquireTokenSilent.mockRejectedValue(new InteractionRequiredAuthError('interaction_required', 'Interaction required'))
    const auth = await createAuth()
    await expect(auth.token()).rejects.toThrow('Continúa con Microsoft')
    expect(msal.acquireTokenRedirect).toHaveBeenCalledWith({ scopes, account })
    msal.acquireTokenSilent.mockRejectedValue(new Error('network unavailable'))
    msal.acquireTokenRedirect.mockClear()
    await expect(auth.token()).rejects.toThrow('network unavailable')
    expect(msal.acquireTokenRedirect).not.toHaveBeenCalled()
  })
  it('selects the account on login, accepts a redirect account and logs out that account', async () => {
    msal.handleRedirectPromise.mockResolvedValue({ account })
    const auth = await createAuth()
    expect(msal.setActiveAccount).toHaveBeenCalledWith(account)
    await auth.login()
    expect(msal.loginRedirect).toHaveBeenCalledWith({ scopes, prompt: 'select_account' })
    await auth.logout()
    expect(msal.logoutRedirect).toHaveBeenCalledWith({ account })
  })
  it('fails closed without configuration and does not choose between multiple cached accounts', async () => {
    vi.stubEnv('VITE_API_SCOPES', '')
    expect((await createAuth()).mode).toBe('unconfigured')
    vi.stubEnv('VITE_API_SCOPES', scopes.join(' '))
    msal.getAllAccounts.mockReturnValue([account, { ...account, name: 'Another' }])
    msal.getActiveAccount.mockReturnValue(null)
    const auth = await createAuth()
    expect(auth.user()).toBeNull()
    expect(msal.setActiveAccount).not.toHaveBeenCalled()
    await expect(auth.token()).rejects.toThrow('Selecciona una cuenta')
  })
  it('rejects an old scope name or scopes belonging to different API resources', () => {
    expect(apiScopes(scopes.join(' '))).toEqual(scopes)
    expect(() => apiScopes(scopes.join(' ').replace('Orders.Create', 'Orders.Write'))).toThrow()
    expect(() => apiScopes(`${scopes[0]} ${scopes[1]} api://00000000-0000-0000-0000-000000000000/Orders.Create`)).toThrow()
  })
})
