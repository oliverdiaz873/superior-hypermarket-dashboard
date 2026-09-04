import type { NavigationItem } from '../models/navigation-item';

/**
 * Navegación principal del dashboard. Las rutas son de FRONTEND (UI) y no deben
 * depender de `API_ENDPOINTS` (contrato del backend): son responsabilidades
 * distintas y pueden divergir sin acoplarse.
 *
 * `roles` restringe el item a ciertos roles (RBAC). Solo lo relacionado con
 * autorización puede aparecer aquí; el resto de la navegación es pública para
 * cualquier usuario autenticado.
 *
 * `enabled` controla si el item se renderiza en el menú. Los módulos aún no
 * implementados se mantienen en la estructura con `enabled: false` para
 * conservar el roadmap del dashboard: reactivarlos es cambiar el booleano.
 */
export const NAVIGATION_ITEMS: readonly NavigationItem[] = [
  { label: 'Dashboard', icon: 'dashboard', route: '/dashboard', enabled: true },
  { label: 'Productos', icon: 'inventory_2', route: '/products', enabled: true },
  { label: 'Categorías', icon: 'category', route: '/categories', enabled: true },
  { label: 'Marcas', icon: 'local_offer', route: '/brands', enabled: true, roles: ['admin'] },
  { label: 'Ofertas', icon: 'discount', route: '/offers', enabled: true, roles: ['admin'] },
  { label: 'Inventario', icon: 'warehouse', route: '/inventory', enabled: true },
  { label: 'Pedidos', icon: 'receipt_long', route: '/orders', enabled: true },
  { label: 'Clientes', icon: 'group', route: '/customers', enabled: true, roles: ['admin'] },
  { label: 'Contactos', icon: 'mail', route: '/contacts', enabled: true, roles: ['admin'] },
  { label: 'Estadísticas', icon: 'bar_chart', route: '/stats', enabled: true, roles: ['admin'] },
  { label: 'Auditoría', icon: 'history', route: '/audit-logs', enabled: true, roles: ['admin'] },
  { label: 'Configuración', icon: 'settings', route: '/settings', enabled: false },
];
