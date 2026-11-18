import React from 'react';
import { Link } from 'react-router-dom';
import { Boxes, ChevronRight, FileScan, Sparkles } from 'lucide-react';
import { ROUTES } from '@/lib/routes';

const OPCIONES = [
  {
    href: ROUTES.ingestaVenta,
    icono: FileScan,
    titulo: 'Vender con IA',
    detalle: 'Fotografía tu cuaderno de ventas: revisa los ítems y registra las ventas.',
  },
  {
    href: ROUTES.ingestaInventario,
    icono: Boxes,
    titulo: 'Escanear inventario',
    detalle: 'Fotografía una lista o estante y registra los productos con su stock, sin ninguna venta.',
  },
] as const;

/** Punto de entrada de la IA: dos operaciones independientes, cada una con su propia pantalla. */
export const IaPage: React.FC = () => (
  <div className="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
        <Sparkles className="h-6 w-6 text-primary" />
        IA
      </h1>
      <p className="text-sm text-muted-foreground">¿Qué quieres hacer con una foto?</p>
    </div>

    <ul className="space-y-3">
      {OPCIONES.map(({ href, icono: Icono, titulo, detalle }) => (
        <li key={href}>
          <Link
            to={href}
            className="flex min-h-20 items-center gap-4 rounded-xl border bg-card p-4 transition-colors hover:bg-accent"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icono className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold text-foreground">{titulo}</span>
              <span className="block text-sm text-muted-foreground">{detalle}</span>
            </span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  </div>
);
