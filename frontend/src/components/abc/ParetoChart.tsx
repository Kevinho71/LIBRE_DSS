import React from 'react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CategoriaAbc, FilaPareto } from '@libredss/shared';
import { formatCurrency } from '@/lib/format';

const COLOR_POR_CLASE: Record<CategoriaAbc, string> = {
  A: '#dc2626',
  B: '#d97706',
  C: '#64748b',
};

export interface ParetoChartProps {
  filas: FilaPareto[];
}

interface PuntoPareto {
  etiqueta: string;
  descripcion: string;
  valor: number;
  acumulado: number;
  categoria: CategoriaAbc;
}

function construirPuntos(filas: FilaPareto[]): PuntoPareto[] {
  return filas.map((fila, indice) => ({
    etiqueta: fila.sku ?? `#${indice + 1}`,
    descripcion: fila.nombre,
    valor: fila.valorConsumoAnual,
    acumulado: fila.porcentajeAcumulado,
    categoria: fila.categoria,
  }));
}

/**
 * Curva de Pareto del valor de consumo anual (HU-18): barras por producto y
 * línea del porcentaje acumulado (0–100%). El eje X usa el SKU o la posición.
 */
export const ParetoChart: React.FC<ParetoChartProps> = ({ filas }) => {
  const puntos = construirPuntos(filas);

  if (puntos.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No hay productos clasificados para graficar la curva de Pareto.
      </p>
    );
  }

  return (
    <div className="h-80 w-full" role="img" aria-label="Curva de Pareto del valor de consumo anual por producto">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={puntos} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} interval="preserveStartEnd" />
          <YAxis
            yAxisId="valor"
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
          />
          <YAxis
            yAxisId="acumulado"
            orientation="right"
            domain={[0, 100]}
            tick={{ fontSize: 12 }}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Tooltip
            formatter={(value, name) =>
              name === 'Valor consumo' ? formatCurrency(Number(value)) : `${Number(value).toFixed(2)}%`
            }
            labelFormatter={(label, payload) => {
              const primero = payload?.[0]?.payload as PuntoPareto | undefined;
              return primero ? `${primero.descripcion} (${label})` : String(label);
            }}
          />
          <Legend />
          <Bar yAxisId="valor" dataKey="valor" name="Valor consumo" radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {puntos.map((punto, indice) => (
              <Cell key={`${punto.etiqueta}-${indice}`} fill={COLOR_POR_CLASE[punto.categoria]} />
            ))}
          </Bar>
          <Line
            yAxisId="acumulado"
            type="monotone"
            dataKey="acumulado"
            name="% acumulado"
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={{ r: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
