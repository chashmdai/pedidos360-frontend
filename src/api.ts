export interface Product { id: string; nombre: string; descripcion: string; precio: number; moneda: string; stock: number; disponible: boolean }
export interface OrderItem { productoId: string; nombre: string; precioUnitario: number; cantidad: number; subtotal: number }
export interface Order { id: string; estado: string; fechaCreacion: string; items: OrderItem[]; total: number; moneda: string }
export interface Identity {
  name: string | null; username: string | null; tenantId: string; subjectId: string; tokenSubject: string | null
  issuer: string; audience: string[]; clientId: string; tokenVersion: string
  roles: string[]; scopes: string[]; issuedAt: string | null; expiresAt: string
}
export class ApiError extends Error { constructor(public status: number, message: string) { super(message) } }
export function createApi(baseUrl: string, token: () => Promise<string>) {
  return async function request<T>(path: string, body?: unknown): Promise<T> {
    if (!path.startsWith('/') || path.includes('..') || path.includes('//') || path.includes('://')) throw new Error('Ruta API inválida.')
    const bearer = await token()
    const response = await fetch(baseUrl.replace(/\/$/, '') + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: 'Bearer ' + bearer, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15000), redirect: 'error',
    })
    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message = response.status === 401 ? 'Tu sesión no es válida. Vuelve a iniciar sesión.'
        : response.status === 403 ? 'Tu cuenta no tiene permiso para esta operación.'
        : payload?.detail ?? 'No fue posible completar la operación.'
      throw new ApiError(response.status, message)
    }
    return payload as T
  }
}
