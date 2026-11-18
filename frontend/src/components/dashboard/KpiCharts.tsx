import React from 'react';
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatCurrency } from '@/lib/format';

const COLOR_EMERALD = '#059669';
const COLOR_AMBER = '#d97706';
const COLOR_BLUE = '#2563eb';
const COLOR_RED = '#dc2626';

/** Etiqueta corta del eje X para una fecha YYYY-MM-DD: día de la semana y número (p. ej. "mié 18"). */
function etiquetaDia(fecha: string): string {
  const d = new Date(`${fecha}T12:00:00`);
  const dia = d.toLocaleDateString('es-BO', { weekday: 'short' }).replace('.', '');
  return `${dia} ${d.getDate()}`;
}

export interface VentasSemanaChartProps {
  datos: Array<{ fecha: string; monto: number }>;
}

/** Ventas por día de la última semana (barras verticales con tooltip en Bs). */
export const VentasSemanaChart: React.FC<VentasSemanaChartProps> = ({ datos }) => {
  const serie = datos.map((d) => ({ dia: etiquetaDia(d.fecha), monto: d.monto }));
  const total = datos.reduce((acc, d) => acc + d.monto, 0);

  return (
    <figure className="w-full">
      <div className="h-56 w-full" role="img" aria-label="Ventas por día de los últimos 7 días">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={serie} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} width={44} tickFormatter={(v: number) => `${Math.round(v)}`} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar dataKey="monto" name="Ventas" fill={COLOR_EMERALD} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">Total de la semana: {formatCurrency(total)}.</figcaption>
    </figure>
  );
};

/**
 * Comparación de magnitudes del inventario (HU-26): valor de inventario, ahorro
 * estimado proyectado y mermas del mes. Barras horizontales con etiquetas
 * directas para que la comparación no dependa del color.
 */
export interface ValorInventarioChartProps {
  valorInventario: number;
  ahorroEstimado: number;
  mermasValor: number;
}

export const ValorInventarioChart: React.FC<ValorInventarioChartProps> = ({
  valorInventario,
  ahorroEstimado,
  mermasValor,
}) => {
  const datos = [
    { nombre: 'Valor de inventario', valor: valorInventario, color: COLOR_BLUE },
    { nombre: 'Ahorro estimado', valor: ahorroEstimado, color: COLOR_EMERALD },
    { nombre: 'Mermas del mes', valor: mermasValor, color: COLOR_AMBER },
  ];

  return (
    <figure className="w-full">
      <div className="h-56 w-full" role="img" aria-label="Comparación de valor de inventario, ahorro estimado y mermas del mes">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={datos} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
            <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${Math.round(v)}`} />
            <YAxis type="category" dataKey="nombre" width={120} tick={{ fontSize: 12 }} />
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Bar dataKey="valor" name="Monto" radius={[0, 4, 4, 0]} isAnimationActive={false}>
              {datos.map((d) => (
                <Cell key={d.nombre} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        Valor de inventario {formatCurrency(valorInventario)}; ahorro estimado {formatCurrency(ahorroEstimado)}; mermas del
        mes {formatCurrency(mermasValor)}.
      </figcaption>
    </figure>
  );
};

/**
 * Proporción de SKUs en alerta frente al resto del catálogo (HU-26). Dona con
 * leyenda y resumen textual accesible.
 */
export interface CoberturaInventarioChartProps {
  skusEnAlerta: number;
  productosActivos: number;
}

export const CoberturaInventarioChart: React.FC<CoberturaInventarioChartProps> = ({ skusEnAlerta, productosActivos }) => {
  const alerta = Math.max(0, skusEnAlerta);
  const ok = Math.max(0, productosActivos - alerta);
  const datos = [
    { nombre: 'En alerta', valor: alerta, color: COLOR_RED },
    { nombre: 'Cobertura OK', valor: ok, color: COLOR_EMERALD },
  ];
  const total = alerta + ok;

  if (total === 0) {
    return (
      <p className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Sin productos activos para evaluar cobertura.
      </p>
    );
  }

  return (
    <figure className="w-full">
      <div className="h-56 w-full" role="img" aria-label="Proporción de SKUs en alerta frente al total de productos activos">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={datos} dataKey="valor" nameKey="nombre" innerRadius={55} outerRadius={85} paddingAngle={2} isAnimationActive={false}>
              {datos.map((d) => (
                <Cell key={d.nombre} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number, name: string) => [`${value} SKU(s)`, name]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <figcaption className="sr-only">
        {alerta} de {total} producto(s) activos están en alerta de reposición; {ok} con cobertura suficiente.
      </figcaption>
    </figure>
  );
};
