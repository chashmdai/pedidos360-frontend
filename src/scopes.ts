export const API_SCOPE_NAMES = ['Catalog.Read', 'Orders.Read', 'Orders.Create'] as const

export function apiScopes(value: string): string[] {
  const scopes = value.trim().split(/\s+/).filter(Boolean)
  const resource = scopes[0]?.slice(0, scopes[0].lastIndexOf('/'))
  if (!resource || !/^api:\/\/[0-9a-f-]{36}$/i.test(resource)
    || scopes.length !== API_SCOPE_NAMES.length
    || API_SCOPE_NAMES.some(name => !scopes.includes(`${resource}/${name}`))) {
    throw new Error('Los scopes deben ser Catalog.Read, Orders.Read y Orders.Create de la misma API.')
  }
  return scopes
}
