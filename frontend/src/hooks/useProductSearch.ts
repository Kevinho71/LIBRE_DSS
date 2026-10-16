import { useQuery } from '@tanstack/react-query';
import { productosApi, type ProductoBusqueda } from '@/api/productos.api';
import { useDebounce } from './useDebounce';

const MIN_CARACTERES = 2;

export interface UseProductSearch {
  items: ProductoBusqueda[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
}

/** Autocompletado de productos contra `/productos/buscar` (HU-15). */
export function useProductSearch(termino: string): UseProductSearch {
  const debounced = useDebounce(termino, 300);
  const habilitado = debounced.trim().length >= MIN_CARACTERES;

  const query = useQuery({
    queryKey: ['productos', 'buscar', debounced.trim()],
    queryFn: ({ signal }) => productosApi.buscar(debounced.trim(), 10, signal),
    enabled: habilitado,
    staleTime: 60_000,
    retry: 1,
  });

  return {
    items: habilitado ? query.data?.items ?? [] : [],
    isLoading: habilitado && query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
  };
}
