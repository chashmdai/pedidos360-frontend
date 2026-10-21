# Validación de la nueva base visual

Fecha: 2026-09-05. Nueva base aceptada: commit `a620005` (`style(frontend): visual polish without functional changes`). El diseño actual se conserva.

## Alcance de la revisión

`git status --short`, `git diff` y `git diff --cached` estaban vacíos al iniciar. El repositorio tiene un único commit inicial que ya incluye el diseño nuevo; no existe un commit FASE 1 anterior para generar un diff histórico independiente. La revisión contrastó el código actual con la implementación y el comportamiento FASE 1 documentados en esta conversación, y ejecutó build, tests y el recorrido de navegador.

No se detectó una alteración funcional accidental. Los cambios observados corresponden a composición JSX de presentación, clases CSS, tipografía, textos, elementos decorativos, espaciado, animaciones y adaptación de tamaño. Se revisaron:

- `Protected`, rutas `/`, `/catalogo`, `/pedidos`, `/nuevo` y fallback: misma protección y destinos.
- `useLoad`, estados de datos/error y limpieza de efectos: misma lógica.
- `CreateOrder`: misma selección por cantidad, validación HTML 0–1000, estados pending/error, `preventDefault`, payload con productoId/cantidad y navegación posterior a Mis pedidos.
- `App`: mismo AuthClient, login/logout, Session, memorización del cliente API y adquisición del bearer.
- `auth.ts`, `api.ts`, `main.tsx`, interfaces de datos, configuración MSAL/Vite y dependencias: comportamiento equivalente al bloque FASE 1 inspeccionado. MSAL contra Entra sigue pendiente; no se declaró probado un login real.
- Precio, stock referencial, estado registrado, detalles e importes siguen derivados de los mismos campos REST. El contenido decorativo del inicio no consulta ni certifica salud del backend.

La comprobación SHA-256 posterior confirmó que los **18 archivos versionados al inicio permanecen idénticos byte por byte**, incluyendo App.tsx, style.css, autenticación, API, configuración y package-lock.json. Se agregan únicamente esta documentación y nuevas evidencias en el frontend. [Hashes y resultado](evidence/post-visual/source-preservation.json).

## Problema de entorno corregido

El primer `npm run build` en WSL falló porque faltaba `@rolldown/binding-linux-x64-gnu`; `node_modules/@rolldown` contenía `binding-win32-x64-msvc`. Se ejecutó `npm ci` con Node/npm Linux desde el mismo lockfile, que no se modificó. No se borró ni regeneró el lockfile, ni se cambió código para compensar la instalación Windows.

```text
added 104 packages, and audited 105 packages in 54s
found 0 vulnerabilities
```

Usar npm desde WSL en este workspace compartido. Si Windows vuelve a instalar dependencias sobre la misma carpeta, reconstruir `node_modules` con `npm ci` en WSL antes de ejecutar el proyecto allí.

## Resultados reales

`npm run build`: TypeScript correcto y Vite 8.2.2 completado.

```text
189 modules transformed.
dist/index.html                   0.35 kB
dist/assets/index-BnPrCUl4.css    30.95 kB
dist/assets/index-ChkbFQNt.js    254.49 kB
built in 1.23s
```

`npm test`: Vitest 4.1.11, **3 tests aprobados**, un archivo; sin fallos. [Build](evidence/post-visual/frontend-build.txt), [tests](evidence/post-visual/frontend-tests.txt), [npm ci](evidence/post-visual/npm-ci.txt).

Recorrido real en navegador sobre `http://localhost:5173`:

| Acción | Resultado observado |
|---|---|
| Abrir Mis pedidos sin sesión | Regresa al inicio |
| Iniciar sesión local y abrir catálogo | Dos productos obtenidos del BFF |
| Formulario con cantidades cero | Registrar pedido deshabilitado |
| Seleccionar dos cafés y una taza | Total estimado $30.970 |
| Registrar solicitud | Navega a Mis pedidos y muestra el pedido `21D089B3…`, dos líneas, total $30.970 |
| Consultar pedidos | Conserva también el pedido previo `4702F199…` |
| Cerrar sesión e intentar Mis pedidos | Inicio y ruta protegida |

El flujo usa JWT local de prueba y los servicios/backend/MySQL reales de FASE 1. No se simuló una respuesta de persistencia en el navegador. Se creó una solicitud adicional de demostración; no se eliminó información existente.

Durante el reinicio se encontró un problema ajeno al diseño en `pedidos360-backend/scripts/dev-processes.py`: un fingerprint de comando capturado durante el inicio podía diferir aunque Java siguiera vivo. El launcher ahora usa el proceso hijo durante el arranque y fija su fingerprint al alcanzar health; conserva las verificaciones de identidad al detener procesos. Se probó arranque, parada y nuevo arranque únicamente de Pedidos360. No se reconstruyeron servicios Java ni se modificó su lógica de negocio.

La base visual queda validada y se usa como punto de partida de FASE 2. No se revierte, reemplaza ni simplifica el diseño.
