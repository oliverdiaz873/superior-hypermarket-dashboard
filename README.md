# superior-hypermarket-dashboard

Dashboard administrativo del ecommerce **Hipermercado Superior**. Exclusivo para
administradores, construido sobre la API REST del backend
(`superior-hypermarket-api`).

> **Project Status**
>
> - **Current Phase:** `Phase 11.2 — Release Candidate Audit` ✅ (preparando el proyecto para mostrarlo profesionalmente)
> - **Completed:** Fases `0 — Init` · `1 — Core` · `2 — Admin Layout` · `3 — Authentication & RBAC` · `4+ — Productos, Órdenes, Estadísticas, Inventario, Auditoría, Carrito y Direcciones`
> - **Auditorías:** `Fase 11.1 — Production Readiness` (seguridad, operaciones, offline, UX de errores) · `Fase 11.2 — Release Candidate`
>
> El dashboard implementa hoy: shell responsivo con dark theme, autenticación
> JWT + RBAC, CRUDs de producto/inventario, pedidos, estadísticas, auditoría,
> buzón de contacto, manejo de sesión expirada, estado offline con reintento de
> GETs y notificaciones globales (snackbar). **303 tests, lint y build de
> producción en verde.**
>
> **Phase 3 — Authentication & Authorization** — login real contra el backend,
> persistencia del JWT, guards de ruta, RBAC por roles y cerrado de sesión.
>
> **Phase 2 — Admin Layout & Application Shell** — responsive shell, dark theme
> runtime, sidebar navigation, accesibilidad, loading indicator e integración de
> Signals.

---

## System Architecture

Este repositorio es el **Admin Application (panel administrativo)** del ecosistema
**Hipermercado Superior**. Es el cliente de administración del sistema y consume la
misma API REST central del backend que los storefronts públicos de clientes.

```
                    Hipermercado Superior Ecosystem

        superior-hypermarket-api
                         Express REST API
                                  |
        -----------------------------------------------------------------
        |                           |                            |
        |                           |                            |
superior-hypermarket-    superior-hypermarket-      superior-hypermarket-
storefront-next          storefront-angular         dashboard

   Next.js Storefront         Angular Storefront      Angular Admin Dashboard
      (Customer App)            (Customer App)              (Admin App)
                                  |
                                  ▼
                             MongoDB

                  superior-hypermarket-e2e (Playwright)
                  E2E central que valida el ecosistema completo
```

| Repository                              | Type              | Technology                        | Purpose                     |
| --------------------------------------- | ----------------- | --------------------------------- | --------------------------- |
| superior-hypermarket-api                | Backend API       | Express + MongoDB + JWT           | API central del sistema     |
| superior-hypermarket-storefront-next    | Customer Frontend | Next.js + React                   | Tienda pública              |
| superior-hypermarket-storefront-angular | Customer Frontend | Angular                           | Tienda pública alternativa  |
| superior-hypermarket-dashboard          | Admin Frontend    | Angular + Material + NgRx Signals | Panel administrativo        |
| superior-hypermarket-e2e                | E2E Harness       | Playwright                        | Infraestructura E2E central |

### Local development and developer tooling

The Superior Hypermarket ecosystem is composed of independent repositories. Each application keeps its own codebase, local configuration, and runtime lifecycle. To simplify local startup and validation, the project also includes a separate developer tool repository: `superior-hypermarket-dev-tools`.

```text
Superior Hypermarket
├── superior-hypermarket-api
├── superior-hypermarket-storefront-angular
├── superior-hypermarket-storefront-next
├── superior-hypermarket-dashboard
├── superior-hypermarket-e2e
└── superior-hypermarket-dev-tools
```

This tooling is intentionally lightweight and does not replace the application repositories or production infrastructure. It exists only to accelerate local setup and status checks for the full stack.

```text
Application repositories
├── API
├── Angular Storefront
├── Next.js Storefront
└── Dashboard

Testing
└── E2E

Developer tooling
└── dev-tools
```

`superior-hypermarket-dev-tools` is a local helper for developer workflow convenience. It validates the workspace, checks MongoDB and expected ports, and starts the required services for local development without turning the ecosystem into a monorepo or runtime application.

### Centralized E2E Harness

`superior-hypermarket-e2e` es el repositorio independiente de pruebas
**End-to-End (Playwright)** del ecosistema. No contiene lógica de negocio: es
infraestructura de validación que orquesta y valida varios repositorios a la
vez, probando flujos completos (frontend → backend → persistencia → dashboard)
y centralizando fixtures, helpers, configuración y specs E2E.

[Centralized E2E Harness - superior-hypermarket-e2e](https://github.com/oliverdiaz873/superior-hypermarket-e2e)

**Admin Application** — Este repositorio es el cliente administrativo del sistema:
ofrece la gestión interna (productos, inventario, pedidos, clientes, estadísticas y
usuarios/roles) a través de la API REST central.

### Flujo de comunicación

```
Storefronts (Next · Angular) · Admin Dashboard (este repo)
        │
        ▼
superior-hypermarket-api (Express REST API)
        │
        ▼
MongoDB
```

---

## Arquitectura

Arquitectura **Feature-Based** preparada para crecer durante años. Cada dominio
de negocio vive en `features/` con sus componentes, y el código transversal se
reparte entre `core/` (singletons) y `shared/` (reutilizable).

```
src/
├─ app/                  # Shell de la aplicación (AppComponent, config, rutas)
├─ core/                 # Singletons de ámbito app-wide
│   ├─ config/           # Configuración de la app (AppConfig + APP_CONFIG)
│   ├─ guards/           # Route guards (auth, role)
│   ├─ interceptors/     # HTTP interceptors (JWT, loading, error)
│   ├─ services/         # Servicios singleton
│   ├─ state/            # Gestión de estado con Signals (@ngrx/signals)
│   ├─ http/             # Capa HTTP (config, endpoints, BaseApiService)
│   ├─ tokens/           # Injection tokens de la app (AUTH_TOKEN, …)
│   ├─ models/           # Modelos de dominio
│   ├─ constants/        # Constantes globales (storage keys, …)
│   ├─ enums/            # Enumeraciones de dominio
│   └─ utils/            # Utilidades puras
├─ shared/               # Componentes/directivas/pipes reutilizables
│   ├─ components/
│   ├─ directives/
│   ├─ pipes/
│   ├─ models/
│   ├─ constants/
│   └─ utils/
├─ features/             # Módulos de negocio (auth, products, orders, stats…)
├─ layouts/              # Layouts de la aplicación (admin-layout)
├─ assets/               # fonts/, images/, icons/
├─ environments/         # environment.ts + environment.development.ts + environment.production.ts
└─ styles/               # Design system SCSS (tokens, mixins, resets, …)
```

### Convenciones clave

- **Standalone Components** (sin NgModules salvo lo imprescindible).
- **Zoneless** (sin Zone.js) + **Angular Signals** para el estado.
- **Barrels (`index.ts`)**: se crean solo cuando una carpeta tiene elementos
  reales que exportar.
- Cada carpeta vacía de la estructura está marcada con `.gitkeep`.

---

## Tecnologías

| Tecnología            | Uso                                        |
| --------------------- | ------------------------------------------ |
| Angular **22**        | Framework (Standalone, Signals, Zoneless)  |
| TypeScript **strict** | Tipado estricto + `strictTemplates`        |
| Angular Material (M3) | Componentes de UI complejos                |
| Tailwind CSS **v4**   | Layout y utilidades (utility-first)        |
| SCSS                  | Tokens, mixins, resets y reglas globales   |
| RxJS                  | Programación reactiva (HTTP, streams)      |
| @ngrx/signals         | Estado global (stores de `core/state`)     |
| Jest 30               | Tests unitarios (`@angular-builders/jest`) |
| ESLint + Prettier     | Lint y formato                             |
| Husky + lint-staged   | Git hooks de calidad                       |

### Diseño del sistema de estilos

- **Tailwind** = layout, spacing, grid y composición visual.
- **Angular Material** = componentes complejos (dialogs, forms, overlays…).
- **SCSS parciales** (`src/styles/`) = tokens, resets, tipografía, animaciones.
  | Archivo            | Responsabilidad                                                |
  | ------------------ | -------------------------------------------------------------- |
  | `_variables.scss`  | Tokens: colores, tipografía, spacing, radios, sombras, z       |
  | `_mixins.scss`     | Mixins reutilizables (container, media, focus, card…)          |
  | `_functions.scss`  | Funciones puras (rem, fluid, tint/shade, contrast)             |
  | `_reset.scss`      | Reset CSS moderno                                              |
  | `_typography.scss` | Jerarquía tipográfica base                                     |
  | `_animations.scss` | Keyframes y clases de animación                                |
  | `_utilities.scss`  | Utilidades propias que complementan a Tailwind                 |
  | `styles.scss`      | Entry: parciales + tokens CSS (`--hs-*`) + tema M3 de Material |

Los tokens de `_variables.scss` se exponen a Tailwind v4 mediante el bloque
`@theme` de `src/tailwind.css`, de modo que utilidades como `bg-brand-600` o
`text-muted` nacen de la **misma fuente de verdad**. Tailwind se importa como
entry aparte (`src/tailwind.css`) porque el compilador Sass no resuelve
`@use 'tailwindcss'`.

### Phase 2 — Admin Layout & Application Shell

El shell del dashboard vive en `layouts/admin-layout` y compone el `Sidebar`,
`Topbar`, `Breadcrumb` y el `RouterOutlet`. Se definió con un `SidebarStore`
(@ngrx/signals) que gestiona colapso, drawer móvil y viewport
(`mobile`/`tablet`/`desktop`):

- **Desktop (≥1200px):** sidebar fijo, colapsable a 72px (preferencia persistida
  en `localStorage`).
- **Tablet (768–1199px):** sidebar siempre colapsado.
- **Mobile (<768px):** sidebar como drawer overlay con backdrop, cerrado con
  `Escape` y con `FocusTrap` del CDK.

La detección de viewport usa `BreakpointObserver` del CDK (solo comportamiento),
mientras que el CSS aplica la variante Tailwind `desktop:` sobre el breakpoint
personalizado `--breakpoint-desktop: 75rem` (1200px).

- **Navegación** (`core/constants/navigation.ts`): `NAVIGATION_ITEMS` con rutas
  UI desacopladas de los endpoints HTTP (`core/http/endpoints.ts`), permitiendo
  rutas de UI como `/contacts` frente a una API `/contact`.
- **Tema** (`core/services/theme-manager.service.ts`): resuelve
  `light`/`dark`/`system` a un único valor aplicado como `data-theme` en
  `<html>`, con una sola suscripción a `matchMedia`. El modo **dark es completo**:
  paleta oscura en `_variables.scss`, override de variables CSS `--hs-*` en
  `[data-theme='dark']` y tema M3 oscuro vía `mat.theme(theme-type: dark)`.
- **Componentes shared** (`shared/components/`): `sidebar`, `topbar`,
  `breadcrumb`, `page-header`, `loading-overlay` y `empty-state`, todos
  standalone con `OnPush`.
- **Rutas:** `app.routes.ts` monta `AdminLayoutComponent` como shell con
  `dashboard` lazy y un **404 real** lazy (`not-found`) en `**`.
- **Carga:** `LoadingStore` global no bloqueante mostrado como barra superior
  fija (`pointer-events-none`).

### Phase 3 — Authentication & Authorization

Flujo de autenticación completo contra el backend
(`/api/auth/login`, `/api/auth/register`, `/api/auth/me`):

- **`AuthStore`** (`core/state/auth/auth.store.ts`, @ngrx/signals) gestiona el
  estado de sesión (`user`, `token`, `isLoading`, `initialized`) con los métodos
  `login`, `logout`, `setAuthenticated`, `initializeSession` y `hasRole` (RBAC).
- **`AuthTokenService`** (`core/services/auth-token.service.ts`) es la **única
  puerta** al token en `localStorage` (`hs.auth-token`). El resto de la app nunca
  toca `localStorage` directamente, lo que permite migrar a HttpOnly cookie sin
  tocar el estado.
- **`AuthService`** extiende `BaseApiService`: `login`/`register` usan
  `skipAuth`; `getProfile()` va autenticado. El **`AuthInterceptor`** (via
  `AUTH_TOKEN`) adjunta `Authorization: Bearer <token>` automáticamente.
- **Guards** (`core/guards/`): `authGuard` restaura la sesión (si hay token) y
  redirige a `/login?returnUrl=…`; `roleGuard` restringe por `data.roles`.
- **RBAC:** `NAVIGATION_ITEMS` admite `roles?: UserRole[]`; el `Sidebar` filtra
  los items por `AuthStore.hasRole`. La ruta `/stats` es solo `admin`.
- **`errorInterceptor`**: un `401` fuera de `/auth/login` cierra la sesión
  (limpia estado y token) sin navegar; la navegación la decide el guard.
- **`features/auth`**: página/componente de login (standalone + `OnPush`) con
  formulario Material, validación y aviso de error, y rutas lazy en `auth.routes.ts`.

`UserRole` vive en `core/models/user-role.ts` (`'admin' | 'customer'`) y `User`
(identidad compartida) en `core/models/user.model.ts`.

### Backend

- API base en desarrollo: `http://localhost:3000/api` (Express + MongoDB).
- El CORS del backend ya permite `http://localhost:4200`.
- Configurable desde `src/environments/` (`apiBaseUrl`).

> **Nota sobre producción:** el build `--configuration production` usa
> `src/environments/environment.production.ts` (vía `fileReplacements` en
> `angular.json`). La app Angular **no lee variables de entorno en tiempo de
> build**: el valor de `apiBaseUrl` debe configurarse en ese archivo **antes del
> build de producción** (o inyectarse por el CI/CD del hosting). La variable
> documentada es `DASHBOARD_API_BASE_URL` (ver `.env.example`); el valor por
> defecto `''` es solo fallback/local y **no** es una URL de producción válida.

---

## Decisiones de arquitectura

Resumen de las decisiones registradas durante la auditoría de producción
(detalle en el repo del backend):

| Decisión                                                                                                                                                                                                                          | Estado   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| **Límites de módulos**: cada feature es autocontenida; `stats` es transversal y de **solo lectura** (agrega modelos de otros módulos sin escribirlos ni reutilizar su lógica). Ver `docs/ADR-011-module-boundaries.md` (backend). | Aceptada |
| **Envelope de errores**: `{ success, message, statusCode, code, requestId }` en toda la API; `requestId` para correlacionar con logs.                                                                                             | Aceptada |
| **Offline + reintentos**: reintento de peticiones **solo GET** y únicamente ante fallos transitorios (status 0 / timeout); las mutaciones nunca se reintentan.                                                                    | Aceptada |
| **Sesión expirada**: 401 fuera del login cierra sesión y redirige a `/login?returnUrl=` con aviso al usuario.                                                                                                                     | Aceptada |
| **Retry opt-in**: el reintento es por petición (`retryAttempts`), no global, para no alterar el contrato de errores.                                                                                                              | Aceptada |

---

## Instalación limpia

Requisitos: **Node.js ≥ 22** (pínchalo con `.nvmrc`) y el backend Express
(`superior-hypermarket-api`) corriendo en
`http://localhost:3000`.

```bash
# 1. Instalar dependencias (bloquea versiones desde package-lock.json)
npm ci

# 2. Servidor de desarrollo
npm start
```

Para producción:

```bash
# Antes de desplegar: configurar apiBaseUrl en src/environments/environment.production.ts
# (variable documentada: DASHBOARD_API_BASE_URL, ver .env.example)
npm run build              # ng build (configuración production)
npm test                   # 303 tests
npm run lint               # ESLint
```

## Requisitos

- **Node.js ≥ 22.22** (se recomienda la LTS 24.x) · npm 10+
- Angular CLI 22 (incluido como dependencia del proyecto)

## Scripts

| Comando                 | Descripción                           |
| ----------------------- | ------------------------------------- |
| `npm start`             | Servidor de desarrollo (`ng serve`)   |
| `npm run build`         | Build de producción (`ng build`)      |
| `npm run watch`         | Build en watch (development)          |
| `npm test`              | Tests unitarios en un solo run (Jest) |
| `npm run test:watch`    | Tests en modo watch                   |
| `npm run test:coverage` | Tests con reporte de cobertura        |
| `npm run lint`          | ESLint (Angular)                      |
| `npm run lint:fix`      | ESLint con autofix                    |
| `npm run format`        | Prettier (escribe)                    |
| `npm run format:check`  | Prettier (solo comprueba)             |

## Calidad en Git

El hook `pre-commit` de Husky ejecuta `lint-staged`, que aplica **Prettier** y
**ESLint (--fix)** sobre los archivos staged. Los **tests se ejecutan en
CI / Pull Requests / merge / release**, no en cada commit, para que los commits
sean rápidos.

## Alias de imports

| Alias         | Ruta                 |
| ------------- | -------------------- |
| `@core/*`     | `src/core/*`         |
| `@shared/*`   | `src/shared/*`       |
| `@features/*` | `src/features/*`     |
| `@layouts/*`  | `src/layouts/*`      |
| `@styles/*`   | `src/styles/*`       |
| `@env/*`      | `src/environments/*` |

Los mismos alias están espejados en `jest.config.js` (`moduleNameMapper`) y en
los `includePaths` de SCSS.

---

## Screenshots

Capturas del panel para el portfolio en [`docs/screenshots/`](docs/screenshots/README.md)
(vistas de dashboard, productos, auditoría, pedidos, estadísticas y login).
