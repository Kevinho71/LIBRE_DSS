import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Loader2 } from 'lucide-react';
import { productosApi, type ProductoBusqueda } from '@/api/productos.api';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

const LIMITE_LISTA = 100;

export interface ProductoDesplegableProps {
  /** Cantidad ya agregada a la nota por producto (para mostrar la insignia ×n). */
  cantidades: Record<string, number>;
  onElegir: (producto: ProductoBusqueda) => void;
}

/**
 * Lista desplegable compacta del catálogo: una fila por producto (nombre, precio y stock) para
 * vender sin escribir. Un toque agrega 1 unidad y la lista queda abierta para seguir agregando.
 */
export const ProductoDesplegable: React.FC<ProductoDesplegableProps> = ({ cantidades, onElegir }) => {
  const [abierto, setAbierto] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['productos', 'lista-venta'],
    queryFn: ({ signal }) => productosApi.buscar('', LIMITE_LISTA, signal),
    enabled: abierto,
    staleTime: 30_000,
  });
  const items = data?.items ?? [];

  return (
    <div className="rounded-lg border bg-card">
      <button
        type="button"
        aria-expanded={abierto}
        aria-controls="lista-productos-venta"
        onClick={() => setAbierto((v) => !v)}
        className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-sm font-medium text-foreground"
      >
        <span>Elegir de la lista de productos</span>
        <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', abierto && 'rotate-180')} />
      </button>

      {abierto && (
        <ul
          id="lista-productos-venta"
          className="max-h-64 divide-y overflow-y-auto border-t"
          aria-label="Productos del catálogo"
        >
          {isLoading && (
            <li className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando productos…
            </li>
          )}
          {isError && <li className="px-3 py-3 text-sm text-destructive">No se pudo cargar la lista.</li>}
          {!isLoading && !isError && items.length === 0 && (
            <li className="px-3 py-3 text-sm text-muted-foreground">Aún no hay productos en el catálogo.</li>
          )}
          {items.map((producto) => {
            const enNota = cantidades[producto.id] ?? 0;
            const agotado = producto.stockActual <= 0;
            return (
              <li key={producto.id}>
                <button
                  type="button"
                  disabled={agotado}
                  onClick={() => onElegir(producto)}
                  className="flex min-h-11 w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">{producto.nombre}</span>
                    <span className="block text-xs text-muted-foreground">
                      {agotado ? 'Sin stock' : `Stock ${producto.stockActual}`}
                    </span>
                  </span>
                  {enNota > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                      ×{enNota}
                    </span>
                  )}
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {formatCurrency(producto.precioVenta)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
