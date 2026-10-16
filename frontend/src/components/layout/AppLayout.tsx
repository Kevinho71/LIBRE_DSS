import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { OfflineBanner } from '@/components/offline/OfflineBanner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ROUTES } from '@/lib/routes';
import {
  LayoutDashboard,
  Package,
  Truck,
  ArrowLeftRight,
  PieChart,
  BellRing,
  LogOut,
  Building2,
  Menu,
  X,
  ShieldCheck,
  ShieldAlert,
  ClipboardList,
  ShoppingCart,
  PackagePlus,
  FileScan,
  SlidersHorizontal,
  FileBarChart,
  Users,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
  active?: boolean;
  disabled?: boolean;
}

export const AppLayout: React.FC = () => {
  const { usuario, empresa, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation: NavItem[] = [
    { name: 'Dashboard', href: ROUTES.dashboard, icon: LayoutDashboard, active: location.pathname === ROUTES.dashboard },
    {
      name: 'Kardex / Historial',
      href: ROUTES.transacciones,
      icon: ClipboardList,
      active: location.pathname === ROUTES.transacciones,
    },
    { name: 'Venta ágil', href: ROUTES.venta, icon: ShoppingCart, active: location.pathname === ROUTES.venta },
    {
      name: 'Ingreso de mercadería',
      href: ROUTES.ingreso,
      icon: PackagePlus,
      active: location.pathname === ROUTES.ingreso,
    },
    {
      name: 'Ajustes y devoluciones',
      href: ROUTES.ajuste,
      icon: ArrowLeftRight,
      active: location.pathname === ROUTES.ajuste,
    },
    {
      name: 'Ingesta IA',
      href: ROUTES.ingesta,
      icon: FileScan,
      active: location.pathname === ROUTES.ingesta,
    },
    { name: 'Catálogo', href: ROUTES.catalogo, icon: Package, active: location.pathname === ROUTES.catalogo },
    { name: 'Proveedores', href: ROUTES.proveedores, icon: Truck, active: location.pathname === ROUTES.proveedores },
    {
      name: 'Clasificación ABC',
      href: ROUTES.abc,
      icon: PieChart,
      active: location.pathname === ROUTES.abc,
    },
    {
      name: 'Alertas EOQ/ROP',
      href: ROUTES.alertas,
      icon: BellRing,
      active: location.pathname === ROUTES.alertas,
    },
    {
      name: 'Políticas P/Q',
      href: ROUTES.sistemas,
      icon: SlidersHorizontal,
      active: location.pathname === ROUTES.sistemas,
    },
    {
      name: 'Reporte de costos',
      href: ROUTES.reportesCostos,
      icon: FileBarChart,
      active: location.pathname === ROUTES.reportesCostos,
    },
    ...(usuario?.rol === 'administrador'
      ? [
          {
            name: 'Usuarios',
            href: ROUTES.usuarios,
            icon: Users,
            active: location.pathname === ROUTES.usuarios,
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="lg:hidden p-2 rounded-md hover:bg-accent text-foreground"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Alternar menú lateral"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg shadow-sm">
                DSS
              </div>
              <div className="hidden sm:block">
                <span className="font-bold text-lg tracking-tight text-foreground">LIBREDSS</span>
                <span className="ml-1 text-xs text-muted-foreground font-medium">Plataforma MyPE</span>
              </div>
            </Link>
          </div>

          {/* Info de Empresa y Usuario */}
          <div className="flex items-center gap-3">
            {empresa && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 text-xs">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="font-semibold text-slate-800 truncate max-w-[150px]">{empresa.nombre}</span>
                {empresa.plan === 'gratuito' ? (
                  <Badge variant="freemium" className="text-[10px] py-0 px-1.5 h-4">
                    Freemium · 15 SKUs
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-[10px] py-0 px-1.5 h-4">
                    Plan Pago
                  </Badge>
                )}
              </div>
            )}

            {usuario && (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-xs font-semibold text-foreground leading-tight">{usuario.nombre}</span>
                  <div className="flex items-center justify-end gap-1">
                    {usuario.rol === 'administrador' ? (
                      <span className="inline-flex items-center text-[10px] text-primary font-medium">
                        <ShieldCheck className="h-3 w-3 mr-0.5" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-[10px] text-muted-foreground font-medium">
                        <ShieldAlert className="h-3 w-3 mr-0.5" /> Operador
                      </span>
                    )}
                  </div>
                </div>

                <Button variant="ghost" size="sm" onClick={logout} className="text-muted-foreground hover:text-destructive">
                  <LogOut className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline text-xs">Salir</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <OfflineBanner />

      <div className="flex flex-1">
        {/* Sidebar escritorio */}
        <aside className="hidden lg:flex flex-col w-64 border-r bg-card p-4 space-y-6 shrink-0">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-3">
              Módulos del Sistema
            </p>
            <nav className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                if (item.disabled) {
                  return (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground/60 rounded-md cursor-not-allowed select-none"
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      item.active
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto pt-4 border-t border-slate-100 text-[11px] text-muted-foreground space-y-1 px-3">
            <p className="font-semibold text-slate-700">Normativa Boliviana</p>
            <p>Ley N° 164 & D.S. N° 1793</p>
            <div className="flex gap-2 pt-1">
              <Link to="/terminos" className="underline hover:text-primary">
                Términos
              </Link>
              <span>·</span>
              <Link to="/privacidad" className="underline hover:text-primary">
                Privacidad
              </Link>
            </div>
          </div>
        </aside>

        {/* Sidebar móvil desplegable */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
            <div className="relative flex flex-col w-64 max-w-xs bg-card p-4 shadow-xl z-50">
              <div className="flex items-center justify-between pb-4 border-b">
                <span className="font-bold text-foreground">Menú de Navegación</span>
                <button type="button" onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-md text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  if (item.disabled) {
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-muted-foreground/60 rounded-md cursor-not-allowed"
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.name}</span>
                      </div>
                    );
                  }
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg ${
                        item.active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-foreground hover:bg-accent'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Footer legal */}
      <footer className="border-t bg-card py-4 px-6 text-center text-xs text-muted-foreground">
        <p>
          &copy; {new Date().getFullYear()} LIBREDSS — Sistema de Soporte a Decisiones de Inventario para MyPEs.
          Cumplimiento Ley 164 / D.S. 1793.
        </p>
      </footer>
    </div>
  );
};
