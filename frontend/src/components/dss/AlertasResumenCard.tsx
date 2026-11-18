import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, BellRing, CheckCircle2, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClaseAbcBadge } from '@/components/abc/ClaseAbcBadge';
import { useAlertasReabastecimiento } from '@/hooks/useAlertas';
import { ROUTES } from '@/lib/routes';
import type { CategoriaAbc } from '@libredss/shared';

const ORDEN_CLASES: CategoriaAbc[] = ['A', 'B', 'C'];

/**
 * Resumen compacto del panel de alertas de reabastecimiento para el dashboard
 * (HU-22). Enlaza al panel completo y no rompe el dashboard si la consulta falla.
 */
export const AlertasResumenCard: React.FC = () => {
  const alertasQuery = useAlertasReabastecimiento();
  const panel = alertasQuery.data;
  const porCriticidad = new Map<CategoriaAbc, number>(
    (panel?.porCriticidad ?? []).map((c) => [c.categoria, c.cantidad])
  );
  const total = panel?.totalAlertas ?? 0;

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-primary" />
            Alertas de reabastecimiento
          </CardTitle>
          <CardDescription>
            Productos bajo el punto de reorden (ROP), priorizados por criticidad ABC.
          </CardDescription>
        </div>
        <Link to={ROUTES.alertas} className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
          Ver panel
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>
      <CardContent>
        {alertasQuery.isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          </div>
        ) : alertasQuery.isError ? (
          <p className="text-sm text-muted-foreground">No se pudieron cargar las alertas de reabastecimiento.</p>
        ) : total === 0 ? (
          <p className="flex items-center gap-2 text-sm text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            Sin productos bajo el ROP. Cobertura de inventario suficiente.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              {total} producto(s) requieren reposición
            </p>
            <div className="flex flex-wrap gap-2">
              {ORDEN_CLASES.map((categoria) => (
                <span
                  key={categoria}
                  className="inline-flex items-center gap-2 rounded-lg border bg-card px-3 py-1.5 text-xs"
                >
                  <ClaseAbcBadge categoria={categoria} />
                  <span className="font-bold text-foreground">{porCriticidad.get(categoria) ?? 0}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
