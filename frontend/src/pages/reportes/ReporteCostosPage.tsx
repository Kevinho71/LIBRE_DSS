import React, { Suspense, useState } from 'react';
import { FileBarChart, Filter, Loader2, Printer, RotateCcw, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProductAutocomplete } from '@/components/transacciones/ProductAutocomplete';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { useReporteCostos } from '@/hooks/useDashboard';
import { ApiError } from '@/api/client';
import { formatCurrency } from '@/lib/format';
import type { ProductoBusqueda } from '@/api/productos.api';
import type { ResumenSkuReporteCostosDTO } from '@libredss/shared';

const ComparativoCostosChart = React.lazy(() =>
  import('@/components/reportes/ComparativoCostosChart').then((modulo) => ({ default: modulo.ComparativoCostosChart }))
);

const OPCIONES_DIAS = [7, 30, 60, 90, 365];

/**
 * Reporte comparativo de costos (HU-27): política empírica vs motor DSS, con
 * gráfico agrupado, KPIs de ahorro y detalle por SKU. Exportable a PDF vía impresión.
 */
export const ReporteCostosPage: React.FC = () => {
  const [dias, setDias] = useState(30);
  const [producto, setProducto] = useState<ProductoBusqueda | null>(null);

  const { data, isLoading, isError, error } = useReporteCostos({
    dias,
    ...(producto ? { productoId: producto.id } : {}),
  });

  const sinDatos = data != null && data.totalProductos === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <FileBarChart className="h-6 w-6 text-primary" />
            Reporte comparativo de costos
          </h1>
          <p className="text-sm text-muted-foreground">
            Política empírica vs. política DSS sobre el historial de demanda (HU-27).
          </p>
        </div>
        <Button type="button" variant="outline" onClick={() => window.print()} disabled={!data || sinDatos}>
          <Printer className="h-4 w-4" />
          Imprimir / PDF
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5 lg:col-span-2">
            <Label htmlFor="reporte-producto">Producto (opcional)</Label>
            <ProductAutocomplete id="reporte-producto" value={producto} onChange={setProducto} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="reporte-dias">Ventana de análisis</Label>
            <Select id="reporte-dias" value={String(dias)} onChange={(e) => setDias(Number(e.target.value))}>
              {OPCIONES_DIAS.map((d) => (
                <option key={d} value={d}>
                  {d === 365 ? '365 días (1 año)' : `${d} días`}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex items-end">
            <Button type="button" variant="ghost" onClick={() => setProducto(null)}>
              <RotateCcw className="h-4 w-4" />
              Limpiar producto
            </Button>
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof ApiError
              ? error.message
              : 'No se pudo generar el reporte comparativo de costos.'}
          </AlertDescription>
        </Alert>
      ) : isLoading || !data ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sinDatos ? (
        <Alert>
          <AlertDescription>
            No hay productos con parámetros de inventario vigentes para analizar. Clasifica el catálogo (ABC) y recalcula
            EOQ/ROP para habilitar el comparativo.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <KpiCard titulo="Costo empírico" valor={formatCurrency(data.politicaEmpirica.costoTotal)} icono={FileBarChart} tono="warning" />
            <KpiCard titulo="Costo DSS" valor={formatCurrency(data.politicaDss.costoTotal)} icono={FileBarChart} tono="primary" />
            <KpiCard
              titulo="Ahorro total"
              valor={formatCurrency(data.ahorroTotal)}
              icono={TrendingUp}
              tono={data.ahorroTotal >= 0 ? 'success' : 'destructive'}
            />
            <KpiCard titulo="Ahorro %" valor={`${data.ahorroPorcentual.toFixed(2)}%`} icono={TrendingUp} tono="success" />
            <KpiCard
              titulo="Nivel de servicio DSS"
              valor={`${data.politicaDss.nivelServicio.toFixed(1)}%`}
              icono={TrendingUp}
              tono="neutral"
              descripcion={`${data.totalProductos} producto(s) · ${data.diasAnalizados} días`}
            />
          </div>

          <Alert variant={data.ahorroTotal >= 0 ? 'success' : 'default'}>
            <AlertTitle>Conclusión</AlertTitle>
            <AlertDescription>{data.conclusion}</AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Comparación por componente de costo</CardTitle>
              <CardDescription>Empírica (naranja) frente a DSS (azul) para la ventana seleccionada.</CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense
                fallback={
                  <div className="flex h-72 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                }
              >
                <ComparativoCostosChart politicaEmpirica={data.politicaEmpirica} politicaDss={data.politicaDss} />
              </Suspense>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalle por producto</CardTitle>
              <CardDescription>{data.totalProductos} producto(s) analizado(s).</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead className="text-right">Demanda</TableHead>
                      <TableHead className="text-right">Costo empírico</TableHead>
                      <TableHead className="text-right">Costo DSS</TableHead>
                      <TableHead className="text-right">Ahorro</TableHead>
                      <TableHead className="text-right">Ahorro %</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.productos.map((p: ResumenSkuReporteCostosDTO) => (
                      <TableRow key={p.productoId}>
                        <TableCell>
                          <div className="font-medium text-foreground">{p.nombre}</div>
                          {p.sku && <div className="text-xs text-muted-foreground">SKU {p.sku}</div>}
                        </TableCell>
                        <TableCell className="text-right text-xs">{p.demandaTotal}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(p.politicaEmpirica.costoTotal)}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(p.politicaDss.costoTotal)}</TableCell>
                        <TableCell className="text-right text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(p.ahorro)}
                        </TableCell>
                        <TableCell className="text-right text-xs">{p.ahorroPorcentual.toFixed(2)}%</TableCell>
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
