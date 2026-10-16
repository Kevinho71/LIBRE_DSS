import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useProductSearch } from '@/hooks/useProductSearch';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ProductoBusqueda } from '@/api/productos.api';

export interface ProductAutocompleteProps {
  value: ProductoBusqueda | null;
  onChange: (producto: ProductoBusqueda | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
  id?: string;
  error?: string;
  disabled?: boolean;
}

export const ProductAutocomplete: React.FC<ProductAutocompleteProps> = ({
  value,
  onChange,
  placeholder = 'Buscar producto por nombre o SKU…',
  autoFocus,
  id,
  error,
  disabled,
}) => {
  const [termino, setTermino] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { items, isLoading } = useProductSearch(termino);
  const listId = useMemo(() => `${id ?? 'producto'}-lista`, [id]);

  useEffect(() => {
    const onClickFuera = (event: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(event.target as Node)) {
        setAbierto(false);
      }
    };
    document.addEventListener('mousedown', onClickFuera);
    return () => document.removeEventListener('mousedown', onClickFuera);
  }, []);

  useEffect(() => {
    setActivo(0);
  }, [items]);

  const seleccionar = (producto: ProductoBusqueda) => {
    onChange(producto);
    setTermino('');
    setAbierto(false);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!abierto || items.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActivo((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActivo((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const elegido = items[activo];
      if (elegido) seleccionar(elegido);
    } else if (event.key === 'Escape') {
      setAbierto(false);
    }
  };

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/40 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{value.nombre}</p>
          <p className="text-xs text-muted-foreground">
            {value.sku ? `SKU ${value.sku} · ` : ''}
            Stock {value.stockActual} {value.unidadMedida} · {formatCurrency(value.precioVenta)}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => {
            onChange(null);
            setTermino('');
            window.setTimeout(() => inputRef.current?.focus(), 0);
          }}
          aria-label="Cambiar producto"
        >
          <X className="h-4 w-4" />
          Cambiar
        </Button>
      </div>
    );
  }

  const mostrarLista = abierto && termino.trim().length >= 2;

  return (
    <div ref={contenedorRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          id={id}
          role="combobox"
          aria-expanded={mostrarLista}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          disabled={disabled}
          value={termino}
          placeholder={placeholder}
          error={error}
          className="pl-9"
          onChange={(e) => {
            setTermino(e.target.value);
            setAbierto(true);
          }}
          onFocus={() => setAbierto(true)}
          onKeyDown={handleKeyDown}
        />
        {isLoading && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {mostrarLista && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg"
        >
          {items.length === 0 && !isLoading ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">Sin coincidencias</li>
          ) : (
            items.map((producto, index) => (
              <li
                key={producto.id}
                role="option"
                aria-selected={index === activo}
                onMouseEnter={() => setActivo(index)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => seleccionar(producto)}
                className={cn(
                  'cursor-pointer rounded-sm px-3 py-2 text-sm',
                  index === activo ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/60'
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">{producto.nombre}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatCurrency(producto.precioVenta)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {producto.sku ? `SKU ${producto.sku} · ` : ''}Stock {producto.stockActual} {producto.unidadMedida}
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
