export const ROUTES = {
  dashboard: '/dashboard',
  transacciones: '/transacciones',
  venta: '/transacciones/venta',
  ingreso: '/transacciones/ingreso',
  ajuste: '/transacciones/ajuste',
  login: '/login',
  register: '/register',
  terminos: '/terminos',
  privacidad: '/privacidad',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
