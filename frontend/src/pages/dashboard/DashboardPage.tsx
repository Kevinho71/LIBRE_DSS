import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  Building2,
  Loader2,
  Package,
  PiggyBank,
  ShieldCheck,
  TrendingDown,
  Wallet,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { AlertasResumenCard } from '@/components/dss/AlertasResumenCard';
import { useDashboardKpis } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/format';
import { ROUTES } from '@/lib/routes';

// recharts es pesado: los gráficos se cargan en un chunk aparte solo al abrir el dashboard.
const DashboardCharts = React.lazy(() => import('@/components/dashboard/DashboardCharts'));

export const DashboardPage: React.FC = () => {
  const { usuario, empresa } = useAuth();
  const { data: kpis, isLoading, isError } = useDashboardKpis();

  const esFreemium = (kpis?.plan ?? empresa?.plan) === 'gratuito';
  const limite = kpis?.limiteSku ?? (esFreemium ? 15 : null);

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida */}
      <div className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-primary">Plataforma DSS Activa</span>
            <Badge variant={esFreemium ? 'freemium' : 'default'}>
              {esFreemium ? 'Plan Freemium' : 'Plan Empresarial'}
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

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>No se pudieron cargar los indicadores del dashboard.</AlertDescription>
        </Alert>
      )}

      {isLoading || !kpis ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* KPIs ejecutivos (HU-26) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard
              titulo="Productos activos"
              valor={String(kpis.productosActivos)}
              icono={Package}
              tono="primary"
              descripcion={limite != null ? `de ${limite} SKUs del plan gratuito` : 'Sin límite de SKUs'}
            />
            <KpiCard
              titulo="Valor de inventario"
              valor={formatCurrency(kpis.valorInventario)}
              icono={Wallet}
              tono="neutral"
              descripcion="Costo × stock actual"
            />
            <KpiCard
              titulo="SKUs en alerta"
              valor={String(kpis.skusEnAlerta)}
              icono={BellRing}
              tono={kpis.skusEnAlerta > 0 ? 'destructive' : 'success'}
              descripcion="Bajo el punto de reorden"
            />
            <KpiCard
              titulo="Ahorro estimado"
              valor={formatCurrency(kpis.ahorroEstimadoProyectado)}
              icono={PiggyBank}
              tono="success"
              descripcion="Proyectado por stock de seguridad"
            />
            <KpiCard
              titulo="Mermas del mes"
              valor={formatCurrency(kpis.mermasMes.valorEstimado)}
              icono={TrendingDown}
              tono="warning"
              descripcion={`${kpis.mermasMes.cantidad} unidad(es)`}
            />
          </div>

          {/* Gráficos (HU-26) */}
          <Suspense
            fallback={
              <div className="flex h-56 items-center justify-center rounded-xl border">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            }
          >
            <div className="grid gap-6 lg:grid-cols-2">
              <DashboardCharts
                valorInventario={kpis.valorInventario}
                ahorroEstimado={kpis.ahorroEstimadoProyectado}
                mermasValor={kpis.mermasMes.valorEstimado}
                skusEnAlerta={kpis.skusEnAlerta}
                productosActivos={kpis.productosActivos}
              />
            </div>
          </Suspense>
        </>
      )}

      {/* Alertas de reabastecimiento (HU-22) */}
      <AlertasResumenCard />

      {/* Accesos rápidos */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Accesos rápidos</CardTitle>
          <CardDescription>Continúa con las tareas habituales de reposición y análisis.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 text-xs font-semibold text-primary">
          <Link to={ROUTES.catalogo} className="inline-flex items-center gap-1.5 hover:underline">
            Gestionar catálogo <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link to={ROUTES.alertas} className="inline-flex items-center gap-1.5 hover:underline">
            Alertas EOQ/ROP <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link to={ROUTES.abc} className="inline-flex items-center gap-1.5 hover:underline">
            Clasificación ABC <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <Link to={ROUTES.reportesCostos} className="inline-flex items-center gap-1.5 hover:underline">
            Reporte de costos <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </CardContent>
      </Card>

      {esFreemium && limite != null && kpis && kpis.productosActivos >= limite && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Alcanzaste el límite de {limite} SKUs del plan gratuito. Actualiza tu plan para registrar más productos.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};
