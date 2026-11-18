import React, { Suspense } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BarChart3, Loader2, PieChart, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClaseAbcBadge } from '@/components/abc/ClaseAbcBadge';
import { useAbcPareto, useAbcResumen } from '@/hooks/useAbc';
import { dssApi } from '@/api/dss.api';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { CategoriaAbc, ResumenClaseAbc } from '@libredss/shared';

// recharts es pesado: se carga en un chunk aparte solo al abrir el reporte ABC.
const ParetoChart = React.lazy(() =>
  import('@/components/abc/ParetoChart').then((modulo) => ({ default: modulo.ParetoChart }))
);

const ORDEN_CLASES: CategoriaAbc[] = ['A', 'B', 'C'];

const ESTILO_CLASE: Record<CategoriaAbc, string> = {
  A: 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200',
  B: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
  C: 'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
};

const TITULO_CLASE: Record<CategoriaAbc, string> = {
  A: 'Clase A · alta criticidad',
  B: 'Clase B · criticidad media',
  C: 'Clase C · baja criticidad',
};

function formatearPct(valor: number): string {
  return `${valor.toFixed(2)}%`;
}

/**
 * Reporte de clasificación ABC (HU-18) con la distribución de valor acumulado
 * por clase y la curva de Pareto. El badge de color (HU-17) identifica la
 * criticidad de cada producto del catálogo.
 */
export const AbcPage: React.FC = () => {
  const { usuario } = useAuth();
  const queryClient = useQueryClient();
  const esAdmin = usuario?.rol === 'administrador';

  const resumenQuery = useAbcResumen();
  const paretoQuery = useAbcPareto();

  const recalcular = useMutation({
    mutationFn: () => dssApi.recalcularAbc(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['dss', 'abc'] });
    },
  });

  const resumen = resumenQuery.data;
  const filas = paretoQuery.data?.filas ?? [];
  const porClase = new Map<CategoriaAbc, ResumenClaseAbc>((resumen?.clases ?? []).map((c) => [c.categoria, c]));
  const sinDatos = (resumen?.totalProductos ?? 0) === 0 && filas.length === 0;
  const isLoading = resumenQuery.isLoading || paretoQuery.isLoading;
  const isError = resumenQuery.isError || paretoQuery.isError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <PieChart className="h-6 w-6 text-primary" />
            Clasificación ABC
          </h1>
          <p className="text-sm text-muted-foreground">
            Distribución por valor de consumo (regla 80/15/5) y curva de Pareto (HU-17, HU-18).
          </p>
        </div>
        {esAdmin && (
          <Button
            type="button"
            onClick={() => recalcular.mutate()}
            disabled={recalcular.isPending}
            aria-label="Recalcular clasificación ABC"
          >
            {recalcular.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recalcular clasificación
          </Button>
        )}
      </div>

      {resumen?.fechaCalculo && (
        <p className="text-xs text-muted-foreground">
          Última clasificación: {formatDateTime(resumen.fechaCalculo)} · {resumen.totalProductos} producto(s)
        </p>
      )}

      {recalcular.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {recalcular.error instanceof ApiError ? recalcular.error.message : 'No se pudo recalcular la clasificación.'}
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el reporte de clasificación ABC.</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sinDatos ? (
        <Alert>
          <AlertDescription>
            Aún no hay productos clasificados. {esAdmin ? 'Usa "Recalcular clasificación" para generar el reporte.' : 'Un administrador debe ejecutar la clasificación.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            {ORDEN_CLASES.map((categoria) => {
              const clase = porClase.get(categoria);
              return (
                <Card key={categoria} className={cn('border', ESTILO_CLASE[categoria])}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold">{TITULO_CLASE[categoria]}</CardTitle>
                      <ClaseAbcBadge categoria={categoria} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <p className="text-2xl font-extrabold">{clase ? clase.cantidadProductos : 0}</p>
                    <p className="text-xs">producto(s) · {clase ? formatearPct(clase.porcentajeValor) : '0.00%'} del valor</p>
                    <p className="text-xs font-medium">{formatCurrency(clase?.valorConsumo ?? 0)} de consumo anual</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Curva de Pareto
              </CardTitle>
              <CardDescription>
                Valor de consumo anual por producto (barras por clase) y porcentaje acumulado (línea).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex h-80 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <ParetoChart filas={filas} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle className="text-base">Catálogo clasificado</CardTitle>
                <CardDescription>{filas.length} producto(s) ordenado(s) por valor de consumo.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {filas.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No hay productos clasificados para mostrar.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Clase</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Valor consumo anual</TableHead>
                      <TableHead className="text-right">% del valor</TableHead>
                      <TableHead className="text-right">% acumulado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filas.map((fila) => (
                      <TableRow key={fila.productoId}>
                        <TableCell>
                          <ClaseAbcBadge categoria={fila.categoria} />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{fila.nombre}</div>
                          {fila.sku && <div className="text-xs text-muted-foreground">SKU {fila.sku}</div>}
                        </TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(fila.valorConsumoAnual)}</TableCell>
                        <TableCell className="text-right text-xs">{formatearPct(fila.porcentajeValor)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold">{formatearPct(fila.porcentajeAcumulado)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
