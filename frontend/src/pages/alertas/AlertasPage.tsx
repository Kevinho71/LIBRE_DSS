import React from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BellRing, Loader2, RefreshCw, Truck } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClaseAbcBadge } from '@/components/abc/ClaseAbcBadge';
import { ReabastecimientoBadge } from '@/components/dss/ReabastecimientoBadge';
import { useAlertasReabastecimiento, useRecalcularEoqRop } from '@/hooks/useAlertas';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { ROUTES } from '@/lib/routes';
import { cn } from '@/lib/utils';
import type { CategoriaAbc, CriticidadAlertas } from '@libredss/shared';

const ORDEN_CLASES: CategoriaAbc[] = ['A', 'B', 'C'];

const ESTILO_CLASE: Record<CategoriaAbc, string> = {
  A: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
  B: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  C: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
};

const TITULO_CLASE: Record<CategoriaAbc, string> = {
  A: 'Clase A · reponer primero',
  B: 'Clase B · criticidad media',
  C: 'Clase C · baja criticidad',
};

function formatearCantidad(valor: number): string {
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2);
}

/**
 * Panel de alertas de reabastecimiento (HU-21, HU-22). Lista los productos cuya
 * posición de inventario (stock + en tránsito) cayó bajo el punto de reorden,
 * ordenados por criticidad ABC y déficit, con la cantidad sugerida (EOQ).
 */
export const AlertasPage: React.FC = () => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const alertasQuery = useAlertasReabastecimiento();
  const recalcular = useRecalcularEoqRop();

  const panel = alertasQuery.data;
  const alertas = panel?.alertas ?? [];
  const porCriticidad = new Map<CategoriaAbc, number>(
    (panel?.porCriticidad ?? []).map((c: CriticidadAlertas) => [c.categoria, c.cantidad])
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <BellRing className="h-6 w-6 text-primary" />
            Alertas de reabastecimiento
          </h1>
          <p className="text-sm text-muted-foreground">
            Productos bajo el punto de reorden (ROP), priorizados por criticidad ABC con cantidad sugerida (EOQ).
          </p>
        </div>
        {esAdmin && (
          <Button
            type="button"
            onClick={() => recalcular.mutate()}
            disabled={recalcular.isPending}
            aria-label="Recalcular EOQ y ROP"
          >
            {recalcular.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recalcular EOQ/ROP
          </Button>
        )}
      </div>

      {recalcular.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {recalcular.error instanceof ApiError
              ? recalcular.error.message
              : 'No se pudieron recalcular los parámetros EOQ/ROP.'}
          </AlertDescription>
        </Alert>
      )}

      {alertasQuery.isError && (
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el panel de alertas de reabastecimiento.</AlertDescription>
        </Alert>
      )}

      {alertasQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : alertas.length === 0 ? (
        <Alert>
          <AlertDescription>
            No hay alertas de reabastecimiento. {esAdmin ? 'Usa "Recalcular EOQ/ROP" para actualizar los parámetros.' : 'Todos los productos tienen cobertura suficiente.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {ORDEN_CLASES.map((categoria) => (
              <Card key={categoria} className={cn('border', ESTILO_CLASE[categoria])}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">{TITULO_CLASE[categoria]}</CardTitle>
                    <ClaseAbcBadge categoria={categoria} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-2xl font-extrabold">{porCriticidad.get(categoria) ?? 0}</p>
                  <p className="text-xs">alerta(s) de reabastecimiento</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  {panel?.totalAlertas ?? alertas.length} producto(s) por reponer
                </CardTitle>
                <CardDescription>
                  Ordenados por criticidad (A → C) y mayor déficit frente al ROP. La cantidad sugerida es el EOQ.
                </CardDescription>
              </div>
              <Link to={ROUTES.abc} className="hidden text-xs font-semibold text-primary hover:underline sm:inline">
                Ver clasificación ABC
              </Link>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clase</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Posición</TableHead>
                      <TableHead className="text-right">En tránsito</TableHead>
                      <TableHead className="text-right">ROP</TableHead>
                      <TableHead className="text-right">Stock seg.</TableHead>
                      <TableHead className="text-right">Déficit</TableHead>
                      <TableHead className="text-right">Cantidad sugerida (EOQ)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.map((alerta) => (
                      <TableRow key={alerta.productoId}>
                        <TableCell>
                          <ClaseAbcBadge categoria={alerta.categoriaAbc} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{alerta.nombre}</div>
                          {alerta.sku && <div className="text-xs text-muted-foreground">SKU {alerta.sku}</div>}
                        </TableCell>
                        <TableCell>
                          <ReabastecimientoBadge
                            posicionInventario={alerta.posicionInventario}
                            ropCalculado={alerta.ropCalculado}
                          />
                        </TableCell>
                        <TableCell className="text-right text-xs">{formatearCantidad(alerta.posicionInventario)}</TableCell>
                        <TableCell className="text-right text-xs">
                          <span className="inline-flex items-center gap-1 text-muted-foreground">
                            <Truck className="h-3 w-3" />
                            {formatearCantidad(alerta.enTransito)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs">{formatearCantidad(alerta.ropCalculado)}</TableCell>
                        <TableCell className="text-right text-xs">{formatearCantidad(alerta.stockSeguridad)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-destructive">
                          {formatearCantidad(alerta.deficit)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-bold text-foreground">
                          {formatearCantidad(alerta.eoqSugerido)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
