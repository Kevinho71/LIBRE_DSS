export const ROUTES = {
  dashboard: '/dashboard',
  catalogo: '/catalogo',
  proveedores: '/proveedores',
  transacciones: '/transacciones',
  venta: '/transacciones/venta',
  ingreso: '/transacciones/ingreso',
  ajuste: '/transacciones/ajuste',
  abc: '/abc',
  alertas: '/alertas',
  sistemas: '/sistemas',
  reportesCostos: '/reportes/costos',
  usuarios: '/usuarios',
  ingesta: '/ingesta',
  login: '/login',
  register: '/register',
  terminos: '/terminos',
  privacidad: '/privacidad',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
