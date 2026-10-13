export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginatedMeta {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface PaginatedResult<T> {
  data: T[];
  paginacion: PaginatedMeta;
}

export function extractPagination(queryParams?: Record<string, string | undefined>): PaginationParams {
  const rawPage = Number(queryParams?.page ?? queryParams?.pagina ?? 1);
  const rawLimit = Number(queryParams?.limit ?? queryParams?.limite ?? 10);

  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 10;
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams
): PaginatedResult<T> {
  const totalPaginas = Math.ceil(total / params.limit) || 1;
  return {
    data,
    paginacion: {
      total,
      pagina: params.page,
      limite: params.limit,
      totalPaginas,
    },
  };
}
