# Pedidos360 frontend

## Entrega EP3

React está autorizado por el docente. Conservé el diseño, código funcional y MSAL existentes; la integración RabbitMQ reside en el [backend hermano](https://github.com/chashmdai/pedidos360-backend). El [PDF de evidencias](https://github.com/chashmdai/pedidos360-backend/blob/main/docs/EP3_RABBITMQ_EVIDENCIAS.pdf) incluye pruebas locales e institucionales: catálogo 200, pedido multítem 201, consulta 200, rol User rechazado con 403, renovación, logout y protección de rutas. La ejecución final aprobó 10 tests y build TypeScript/Vite en WSL `codex`.

Para esta etapa usar `bash scripts/ep3.sh start entra` desde `pedidos360-backend`, después de preparar broker/build según su README. La SPA permanece en `http://localhost:5173`; el BFF EP3 usa 19180. Para los fallos controlados, arrancar el modo `local` y ejecutar la aceptación del backend. No hace falta AWS ni modificar Entra. Las instrucciones cloud siguientes son históricas y no acreditan disponibilidad actual.

Código y diseño visual final conservados; [backend, despliegue y evidencia de entrega](https://github.com/chashmdai/pedidos360-backend). AWS está apagado al cierre informado por el usuario; la evidencia cloud documenta pruebas anteriores y no acredita disponibilidad actual.

React 19 + TypeScript + Vite, con React Router y MSAL React. WSL2 es el entorno de desarrollo y compilación. Esta entrega permite consultar Catalog, crear solicitudes multítem y listar pedidos propios a través del BFF.

```bash
npm ci
npm run build
npm test
```

Para la demostración completa, usar `bash scripts/dev.sh start` desde el repositorio hermano `pedidos360-backend`. El launcher configura Microsoft Entra desde `pedidos360-backend/config/entra-public.json` y sirve la aplicación en `http://localhost:5173`. Para una demostración con fixtures, iniciar primero el backend con `bash scripts/dev.sh start local`. Solo en ese modo:

```bash
VITE_AUTH_MODE=local npm run dev
```

El modo local requiere una acción de inicio de sesión de demostración, utiliza un JWT de prueba firmado y se identifica mediante una banda visible. La sesión se mantiene en memoria y se pierde al recargar. Los tokens no se imprimen ni se guardan manualmente en localStorage. El fixture está habilitado únicamente bajo `import.meta.env.DEV`: un build de producción sin configuración Entra queda cerrado y muestra configuración pendiente.

## Microsoft Entra

`.env.example` contiene exclusivamente los identificadores públicos de los nuevos registros aprobados y los tres scopes de la API. Puedes copiarlo a `.env.local` para Vite; no contiene client secret. Para compilar con la misma configuración canónica que usa el launcher:

```bash
cd ../pedidos360-backend
python3 scripts/entra_config.py frontend npm run build
```

Nunca poner client secrets en Vite: estas variables son públicas en el bundle. Se rechaza una lista de scopes incoherente, recursos mezclados o el nombre anterior Orders.Write.

`auth.ts` contiene inicialización de MSAL, redirect login/logout, selección de cuenta activa y `acquireTokenSilent` con fallback interactivo. `main.tsx` integra MsalProvider. `api.ts` obtiene el access token antes de cada petición al BFF; no usa ID tokens y no reintenta automáticamente un POST. Las rutas de catálogo y pedidos requieren sesión.

Los registros, scopes, preautorización y asignaciones User/Admin existentes se verificaron en Microsoft Graph. `Mi sesión` consulta `/me`, muestra los permisos del access token validado y permite comprobar la ruta administrativa. Renovar sesión utiliza `acquireTokenSilent({forceRefresh:true})`; no equivale a esperar la expiración natural. FASE 2 acreditó User real y Admin mediante una asignación temporal autorizada y retirada; no se declara login real de la segunda cuenta Admin. EP3 volvió a acreditar User 403 sin elevar privilegios. Los registros ajenos del tenant permanecen excluidos.

## Alcance funcional

Registrar un pedido fija nombre/precio/moneda en Orders. El navegador envía solo UUID y cantidad; propietario y precio no son autoridad del frontend. El stock es referencial. No se implementan pago, reserva, mantenimiento administrativo ni funciones accesorias.

`package-lock.json` fija dependencias, y `.nvmrc` señala Node 24.20.0. El backend documenta arquitectura, contrato OpenAPI y pasos de ejecución.

## Usar el backend desplegado en AWS

Desde el backend hermano, `bash scripts/dev.sh start cloud` inicia únicamente esta SPA en localhost:5173 con los registros Entra existentes y el HTTP API real de `config/aws-public.json`. Detener primero procesos locales Pedidos360 con `dev.sh stop` si están registrados. Compilar con `python3 scripts/entra_config.py frontend-cloud npm run build`. No requiere MySQL ni Java local en ejecución; RDS y los tres servicios están en AWS. El diseño visual aprobado permanece intacto.
