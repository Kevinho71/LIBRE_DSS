import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { productosApi, type ProductoBusqueda } from '@/api/productos.api';
import { useDebounce } from './useDebounce';

const MAX_TOKENS = 3;
const MAX_SUGERENCIAS = 3;
const STOPWORDS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'con', 'sin', 'para', 'por', 'una', 'uno', 'un', 'y']);

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/** Raíz corta de una palabra para tolerar plurales y variantes ("hilos" ≈ "hilo"). */
function raiz(token: string): string {
  return token.length > 4 ? token.slice(0, 4) : token;
}

/** Palabras con significado de una descripción leída por la IA, de mayor a menor longitud. */
export function tokensDeBusqueda(descripcion: string): string[] {
  const tokens = normalizar(descripcion)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  return [...new Set(tokens)].sort((a, b) => b.length - a.length).slice(0, MAX_TOKENS);
}

/**
 * Sugerencias aproximadas para un ítem sin coincidencia: busca por la raíz de cada palabra de la
 * descripción y ordena por cuántas palabras comparte cada producto del catálogo.
 */
export function useSugerenciasProducto(descripcion: string, habilitado: boolean): ProductoBusqueda[] {
  const debounced = useDebounce(descripcion, 300);
  const raices = useMemo(() => tokensDeBusqueda(debounced).map(raiz), [debounced]);

  const consultas = useQueries({
    queries: raices.map((r) => ({
      queryKey: ['productos', 'buscar', r],
      queryFn: ({ signal }: { signal?: AbortSignal }) => productosApi.buscar(r, 10, signal),
      enabled: habilitado,
      staleTime: 60_000,
      retry: 1,
    })),
  });

  const candidatos = consultas.flatMap((c) => c.data?.items ?? []);

  return useMemo(() => {
    if (!habilitado || raices.length === 0) return [];
    const unicos = new Map<string, ProductoBusqueda>();
    candidatos.forEach((p) => unicos.set(p.id, p));
    return [...unicos.values()]
      .map((p) => {
        const nombre = normalizar(p.nombre);
        return { p, puntaje: raices.filter((r) => nombre.includes(r)).length };
      })
      .sort((a, b) => b.puntaje - a.puntaje || a.p.nombre.localeCompare(b.p.nombre))
      .slice(0, MAX_SUGERENCIAS)
      .map((x) => x.p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, raices, consultas.map((c) => c.dataUpdatedAt).join(',')]);
}
