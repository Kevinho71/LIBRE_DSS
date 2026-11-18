import React from 'react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/format';
import type { ResumenSkuReporteCostosDTO } from '@libredss/shared';

const MAX_PUNTOS = 12;

export interface TendenciaCostosChartProps {
  productos: ResumenSkuReporteCostosDTO[];
}

/**
 * Línea de tendencia del costo por producto (política empírica vs DSS) para la
 * ventana analizada. Ordena por ahorro descendente para hacer visible la brecha
 * entre ambas políticas a lo largo del catálogo (HU-27).
 */
export const TendenciaCostosChart: React.FC<TendenciaCostosChartProps> = ({ productos }) => {
  const datos = [...productos]
    .sort((a, b) => b.ahorro - a.ahorro)
    .slice(0, MAX_PUNTOS)
    .map((p) => ({
      producto: p.nombre.length > 16 ? `${p.nombre.slice(0, 15)}…` : p.nombre,
      Empirica: p.politicaEmpirica.costoTotal,
      DSS: p.politicaDss.costoTotal,
    }));

  return (
    <figure className="w-full">
      <div
        className="h-72 w-full"
        role="img"
        aria-label="Tendencia del costo por producto: política empírica frente a la política DSS"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={datos} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="producto" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={64} interval={0} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v)}`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Line
              type="monotone"
              dataKey="Empirica"
              name="Política empírica"
              stroke="#d97706"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="DSS"
              name="Política DSS"
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Costo total por producto ordenado por ahorro descendente; se muestran hasta {MAX_PUNTOS} productos.
      </figcaption>
    </figure>
  );
};
