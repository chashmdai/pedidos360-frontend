import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError, createApi } from './api'
afterEach(() => vi.unstubAllGlobals())
describe('central API client', () => {
  it('acquires a bearer and sends only ids/quantities with the request', async () => {
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({id:'created'})})
    vi.stubGlobal('fetch',fetcher)
    const token=vi.fn().mockResolvedValue('local-test-token')
    const api=createApi('http://localhost:8180/api/v1',token)
    await api('/pedidos',{items:[{productoId:'id',cantidad:2}]})
    expect(token).toHaveBeenCalledOnce()
    expect(fetcher.mock.calls[0][0]).toBe('http://localhost:8180/api/v1/pedidos')
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer local-test-token')
    expect(fetcher.mock.calls[0][1].redirect).toBe('error')
  })
  it.each([
    [401, 'Tu sesión no es válida. Vuelve a iniciar sesión.'],
    [403, 'Tu cuenta no tiene permiso para esta operación.'],
  ])('handles HTTP %i even when the security response has no JSON body', async (status, message) => {
    const fetcher=vi.fn().mockResolvedValue({ok:false,status,json:async()=>{throw new SyntaxError('Empty body')}})
    vi.stubGlobal('fetch',fetcher)
    await expect(createApi('http://localhost:8180',async()=> 'fixture')('/pedidos')).rejects.toMatchObject({status,message})
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('does not retry order creation after an ambiguous network failure', async () => {
    const failure=new TypeError('Failed to fetch')
    const fetcher=vi.fn().mockRejectedValue(failure)
    vi.stubGlobal('fetch',fetcher)
    const api=createApi('http://localhost:8180',async()=> 'fixture')
    await expect(api('/pedidos',{items:[{productoId:'id',cantidad:2}]})).rejects.toBe(failure)
    expect(fetcher).toHaveBeenCalledOnce()
  })
  it('rejects an external destination before requesting a token', async () => {
    const token=vi.fn()
    await expect(createApi('http://localhost:8180',token)('//other.example')).rejects.toThrow()
    expect(token).not.toHaveBeenCalled()
    expect(new ApiError(401,'session').status).toBe(401)
  })
})
