export type ModoIngesta = 'venta' | 'inventario';

export interface ItemExtraidoCrudo {
  descripcion: string;
  cantidad: number;
  precioUnitario?: number | null;
  costoUnitario?: number | null;
}

export interface ExtraccionRecibo {
  fecha?: string | null;
  items: ItemExtraidoCrudo[];
}

export interface ItemMatcheado {
  descripcion: string;
  cantidad: number;
  precioUnitario: number | null;
  costoUnitario?: number | null;
  productoId: string | null;
  nombreProducto: string | null;
  sku: string | null;
  similitud: number | null;
}

export interface ExtraerIngestaDto {
  s3Key: string;
  modo?: ModoIngesta;
}

export interface ConfirmarIngestaItemDto {
  productoId: string;
  cantidad: number;
  precioVenta?: number;
}

export interface ConfirmarIngestaDto {
  fechaEvento: string;
  items: ConfirmarIngestaItemDto[];
}

export interface ResultadoExtraccion {
  ingestaId: string;
  estado: 'pendiente';
  fechaSugerida: string | null;
  items: ItemMatcheado[];
}

export interface ResultadoConfirmacion {
  ingestaId: string;
  estado: 'confirmada';
  transaccionesCreadas: number;
  yaConfirmada: boolean;
}
