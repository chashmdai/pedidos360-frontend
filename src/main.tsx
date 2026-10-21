import React from 'react'
import { createRoot } from 'react-dom/client'
import { MsalProvider } from '@azure/msal-react'
import App from './App'
import { createAuth } from './auth'
async function bootstrap() {
  const auth = await createAuth()
  const app = <React.StrictMode><App auth={auth} /></React.StrictMode>
  createRoot(document.getElementById('root')!).render(auth.msal ? <MsalProvider instance={auth.msal}>{app}</MsalProvider> : app)
}
bootstrap().catch(() => {
  createRoot(document.getElementById('root')!).render(<p role="alert">No fue posible inicializar la identidad. Revisa la configuración.</p>)
})
