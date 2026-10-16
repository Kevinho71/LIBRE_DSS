import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, BellRing, Loader2, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ClaseAbcBadge } from '@/components/abc/ClaseAbcBadge';
import { PoliticaBadge } from '@/components/dss/PoliticaBadge';
import { FaseArranqueBadge } from '@/components/dss/FaseArranqueBadge';
import { ParametrosMinMaxDialog } from '@/components/dss/ParametrosMinMaxDialog';
import { useAlertasMinMax, useRecalcularSistemas, useSistemas } from '@/hooks/useSistemas';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { ROUTES } from '@/lib/routes';
import type { AlertaMinMax, ItemSistema } from '@libredss/shared';

function fmt(valor: number | null | undefined): string {
  if (valor == null) return '—';
  return Number.isInteger(valor) ? String(valor) : valor.toFixed(2);
}

function ParametrosCelda({ item }: { item: ItemSistema }) {
  if (item.politica === 'P') {
    return (
      <div className="text-xs text-muted-foreground">
        <div>
          R: <span className="font-medium text-foreground">{fmt(item.intervaloRevisionDias)} d</span>
        </div>
        <div>
          T: <span className="font-medium text-foreground">{fmt(item.nivelObjetivoT)}</span> · SS:{' '}
          {fmt(item.stockSeguridadCalculado)}
        </div>
      </div>
    );
  }
  return (
    <div className="text-xs text-muted-foreground">
      <div>
        EOQ: <span className="font-medium text-foreground">{fmt(item.eoqCalculado)}</span>
      </div>
      <div>
        ROP: <span className="font-medium text-foreground">{fmt(item.ropCalculado)}</span> · SS:{' '}
        {fmt(item.stockSeguridadCalculado)}
      </div>
    </div>
  );
}

const ETIQUETA_TIPO_ALERTA: Record<AlertaMinMax['tipo'], string> = {
  bajo_minimo: 'Bajo mínimo',
  sobre_maximo: 'Sobre máximo',
};

/**
 * Panel de sistemas P/Q y arranque en frío (HU-23, HU-38, HU-39): política
 * asignada por clase ABC, fase del ciclo de vida del SKU, parámetros
 * cuantitativos y umbrales Min/Max manuales para productos en maduración.
 */
export const SistemasPage: React.FC = () => {
  const { usuario } = useAuth();
  const esAdmin = usuario?.rol === 'administrador';

  const sistemasQuery = useSistemas();
  const alertasQuery = useAlertasMinMax();
  const recalcular = useRecalcularSistemas();

  const [editando, setEditando] = useState<ItemSistema | null>(null);

  const items = sistemasQuery.data?.items ?? [];
  const conteo = {
    q: items.filter((i) => i.politica === 'Q').length,
    p: items.filter((i) => i.politica === 'P').length,
    fase3: items.filter((i) => i.faseArranque === 3).length,
  };
  const alertas = alertasQuery.data?.alertas ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <SlidersHorizontal className="h-6 w-6 text-primary" />
            Políticas P/Q y arranque en frío
          </h1>
          <p className="text-sm text-muted-foreground">
            Sistema de revisión asignado por clase ABC y fase del ciclo de vida del SKU (HU-23, HU-38, HU-39).
          </p>
        </div>
        {esAdmin && (
          <Button
            type="button"
            onClick={() => recalcular.mutate()}
            disabled={recalcular.isPending}
            aria-label="Recalcular sistemas P/Q"
          >
            {recalcular.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Recalcular sistemas
          </Button>
        )}
      </div>

      {recalcular.isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {recalcular.error instanceof ApiError
              ? recalcular.error.message
              : 'No se pudieron recalcular los sistemas P/Q.'}
          </AlertDescription>
        </Alert>
      )}

      {sistemasQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>No se pudo cargar el listado de políticas de inventario.</AlertDescription>
        </Alert>
      ) : sistemasQuery.isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <Alert>
          <AlertDescription>
            Aún no hay productos clasificados. {esAdmin ? 'Ejecuta la clasificación ABC y recalcula los sistemas.' : 'Un administrador debe ejecutar la clasificación.'}
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Productos con política</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold">{items.length}</p>
              </CardContent>
            </Card>
            <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Sistema Q · continua</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold">{conteo.q}</p>
                <p className="text-xs text-muted-foreground">Clases A y B</p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Sistema P · periódica</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold">{conteo.p}</p>
                <p className="text-xs text-muted-foreground">Clase C</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-1.5 text-sm font-semibold">
                  <Activity className="h-3.5 w-3.5" />
                  En Fase 3
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-extrabold">{conteo.fase3}</p>
                <p className="text-xs text-muted-foreground">Motor cuantitativo activo</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Política y fase por producto</CardTitle>
              <CardDescription>
                El sistema Q usa EOQ/ROP; el sistema P usa intervalo de revisión R y nivel objetivo T.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Clase</TableHead>
                      <TableHead>Política</TableHead>
                      <TableHead>Fase</TableHead>
                      <TableHead>Historial</TableHead>
                      <TableHead>Parámetros</TableHead>
                      <TableHead className="text-right">Min / Máx</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.productoId}>
                        <TableCell>
                          <div className="font-medium text-foreground">{item.nombre}</div>
                          {item.sku && <div className="text-xs text-muted-foreground">SKU {item.sku}</div>}
                        </TableCell>
                        <TableCell>
                          <ClaseAbcBadge categoria={item.categoriaAbc} />
                        </TableCell>
                        <TableCell>
                          <PoliticaBadge politica={item.politica} />
                        </TableCell>
                        <TableCell>
                          <FaseArranqueBadge fase={item.faseArranque} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {item.diasHistorial} d · {item.diasConVenta} con venta
                        </TableCell>
                        <TableCell>
                          {item.cuantitativoHabilitado ? (
                            <ParametrosCelda item={item} />
                          ) : (
                            <span className="text-xs text-muted-foreground">Heurístico (Min/Max manual)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          {fmt(item.stockMinimoManual)} / {fmt(item.stockMaximoManual)}
                        </TableCell>
                        <TableCell className="text-right">
                          {!item.cuantitativoHabilitado && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label={`Editar umbrales Min/Max de ${item.nombre}`}
                              onClick={() => setEditando(item)}
                            >
                              <SlidersHorizontal className="h-3.5 w-3.5" />
                              Min/Max
                            </Button>
                          )}
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

      <Card>
        <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="h-4 w-4 text-primary" />
              Alertas Min/Max (arranque en frío)
            </CardTitle>
            <CardDescription>
              Productos cuyo stock cayó al mínimo o superó el máximo mientras el motor cuantitativo no está activo (HU-38).
            </CardDescription>
          </div>
          <Link to={ROUTES.alertas} className="text-xs font-semibold text-primary hover:underline">
            Ver alertas EOQ/ROP
          </Link>
        </CardHeader>
        <CardContent>
          {alertasQuery.isError ? (
            <Alert variant="destructive">
              <AlertDescription>No se pudieron cargar las alertas Min/Max.</AlertDescription>
            </Alert>
          ) : alertas.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">
              Sin alertas por umbral. Configura Min/Max en los productos en arranque en frío para activar esta política.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead>Fase</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Mín</TableHead>
                    <TableHead className="text-right">Máx</TableHead>
                    <TableHead className="text-right">Cantidad sugerida</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertas.map((a) => (
                    <TableRow key={a.productoId}>
                      <TableCell>
                        <div className="font-medium text-foreground">{a.nombre}</div>
                        {a.sku && <div className="text-xs text-muted-foreground">SKU {a.sku}</div>}
                      </TableCell>
                      <TableCell>
                        <FaseArranqueBadge fase={a.faseArranque} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={a.tipo === 'bajo_minimo' ? 'destructive' : 'claseB'}>
                          {ETIQUETA_TIPO_ALERTA[a.tipo]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{fmt(a.stockActual)}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(a.stockMinimoManual)}</TableCell>
                      <TableCell className="text-right text-xs">{fmt(a.stockMaximoManual)}</TableCell>
                      <TableCell className="text-right text-sm font-bold text-foreground">
                        {fmt(a.cantidadSugerida)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ParametrosMinMaxDialog
        open={Boolean(editando)}
        onOpenChange={(open) => !open && setEditando(null)}
        item={editando}
      />
    </div>
  );
};
