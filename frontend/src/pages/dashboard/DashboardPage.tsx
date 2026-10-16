import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertasResumenCard } from '@/components/dss/AlertasResumenCard';
import { ROUTES } from '@/lib/routes';
import { Building2, Package, Sparkles, TrendingUp, ShieldCheck, ArrowUpRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { usuario, empresa } = useAuth();

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Plataforma DSS Activa</span>
            <Badge variant={empresa?.plan === 'gratuito' ? 'freemium' : 'default'}>
              {empresa?.plan === 'gratuito' ? 'Plan Freemium (15 SKUs)' : 'Plan Empresarial'}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Bienvenido, {usuario?.nombre}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>{empresa?.nombre}</span>
            {empresa?.nit && <span className="text-xs">· NIT: {empresa.nit}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card p-3 rounded-xl border shadow-sm">
          <ShieldCheck className="h-5 w-5 text-emerald-600" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">Sesión Verificada</p>
            <p className="text-muted-foreground capitalize">Rol: {usuario?.rol || 'operador'}</p>
          </div>
        </div>
      </div>

      {/* Tarjetas de Módulos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta Catálogo */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                <Package className="h-5 w-5" />
              </div>
              <Badge variant="outline">Fase 2</Badge>
            </div>
            <CardTitle className="text-lg mt-3">Catálogo y Proveedores</CardTitle>
            <CardDescription>
              Gestión de artículos, parámetros logísticos ($S, i$), proveedores N:M e importación masiva CSV.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            <div className="p-2.5 rounded-lg bg-slate-50 border flex justify-between items-center">
              <span>Cupo Freemium:</span>
              <span className="font-semibold text-foreground">0 de 15 SKUs</span>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Transaccional */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                <TrendingUp className="h-5 w-5" />
              </div>
              <Badge variant="outline">Fase 3</Badge>
            </div>
            <CardTitle className="text-lg mt-3">Módulo Transaccional</CardTitle>
            <CardDescription>
              Ventas ágiles, actualización atómica de stock, notas batch y sincronización offline en IndexedDB.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            <div className="p-2.5 rounded-lg bg-slate-50 border flex justify-between items-center">
              <span>Modo PWA Offline:</span>
              <span className="font-semibold text-emerald-600">Listo para enlazar</span>
            </div>
          </CardContent>
        </Card>

        {/* Tarjeta Motor DSS */}
        <Card className="hover:border-primary/50 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <Badge variant="outline">Fases 4 - 6</Badge>
            </div>
            <CardTitle className="text-lg mt-3">Motor Algorítmico DSS</CardTitle>
            <CardDescription>
              Clasificación ABC, cálculo de lote económico (EOQ), punto de reorden (ROP) y alertas proactivas.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            <div className="p-2.5 rounded-lg bg-slate-50 border flex justify-between items-center">
              <span>Modelos Cuantitativos:</span>
              <span className="font-semibold text-purple-700">Backend 100% Validado</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de reabastecimiento (HU-22) */}
      <AlertasResumenCard />

      {/* Guía Rápida para el Usuario */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Estado del Sistema · Sprint 1 Frontend</CardTitle>
          <CardDescription>
            La Fase 0 (Setup del Stack) y Fase 1 (Autenticación y Onboarding de Empresa) han sido configuradas
            exitosamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Tu empresa se encuentra aislada de manera segura mediante <strong>Row-Level Security (RLS)</strong> en la base
            de datos PostgreSQL. Todos los tokens y sesiones son validados criptográficamente en cada interacción con la API.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to={ROUTES.catalogo}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
            >
              <span>Gestionar catálogo de productos</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
