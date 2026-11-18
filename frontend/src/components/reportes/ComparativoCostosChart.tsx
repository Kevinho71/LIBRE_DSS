import React from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/format';
import type { ComparativoPoliticaDTO } from '@libredss/shared';

const ETIQUETAS = [
  { key: 'costoOrdenar', label: 'Ordenar' },
  { key: 'costoMantener', label: 'Mantener' },
  { key: 'costoVentaPerdida', label: 'Venta perdida' },
  { key: 'costoTotal', label: 'Costo total' },
] as const;

export interface ComparativoCostosChartProps {
  politicaEmpirica: ComparativoPoliticaDTO;
  politicaDss: ComparativoPoliticaDTO;
}

/**
 * Comparación agrupada de costos por componente entre la política empírica y la
 * política DSS (HU-27). Colores distinguibles + leyenda + resumen accesible.
 */
export const ComparativoCostosChart: React.FC<ComparativoCostosChartProps> = ({ politicaEmpirica, politicaDss }) => {
  const datos = ETIQUETAS.map((e) => ({
    componente: e.label,
    Empirica: politicaEmpirica[e.key],
    DSS: politicaDss[e.key],
  }));

  return (
    <figure className="w-full">
      <div className="h-72 w-full" role="img" aria-label="Comparación de costos por componente entre la política empírica y la política DSS">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="componente" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v)}`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="Empirica" name="Política empírica" fill="#d97706" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="DSS" name="Política DSS" fill="#2563eb" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Costo total empírico {formatCurrency(politicaEmpirica.costoTotal)} frente a {formatCurrency(politicaDss.costoTotal)} con la
        política DSS.
      </figcaption>
    </figure>
  );
};
