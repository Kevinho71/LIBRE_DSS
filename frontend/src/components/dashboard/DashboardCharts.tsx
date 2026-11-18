import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ValorInventarioChart, CoberturaInventarioChart } from './KpiCharts';

export interface DashboardChartsProps {
  valorInventario: number;
  ahorroEstimado: number;
  mermasValor: number;
  skusEnAlerta: number;
  productosActivos: number;
}

/**
 * Bloque de gráficos del dashboard ejecutivo (HU-26). Se exporta como default
 * para cargarse de forma diferida (recharts pesa) con un único Suspense.
 */
export default function DashboardCharts({
  valorInventario,
  ahorroEstimado,
  mermasValor,
  skusEnAlerta,
  productosActivos,
}: DashboardChartsProps) {
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Balance de inventario</CardTitle>
          <CardDescription>Valor de inventario, ahorro estimado y mermas del mes.</CardDescription>
        </CardHeader>
        <CardContent>
          <ValorInventarioChart
            valorInventario={valorInventario}
            ahorroEstimado={ahorroEstimado}
            mermasValor={mermasValor}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Cobertura del catálogo</CardTitle>
          <CardDescription>Proporción de SKUs en alerta frente al total activo.</CardDescription>
        </CardHeader>
        <CardContent>
          <CoberturaInventarioChart skusEnAlerta={skusEnAlerta} productosActivos={productosActivos} />
        </CardContent>
      </Card>
    </>
  );
}
