import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, FileSpreadsheet, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useImportarCsv } from '@/hooks/useProductos';
import { ApiError } from '@/api/client';
import type { ImportarCsvResponse } from '@libredss/shared';

const PLANTILLA_CSV = [
  'nombre,sku,unidad_medida,unidad_compra,factor_conversion,costo_unitario,precio_venta,costo_pedido,tasa_mantenimiento_anual,stock_actual,stock_minimo_manual,stock_maximo_manual',
  'Cemento IP-30,CEM-30,bolsa,pallet,40,38.5,45,50,0.2,120,20,200',
].join('\n');

const ETIQUETA_MOTIVO: Record<string, string> = {
  SKU_DUPLICADO: 'SKU duplicado',
  LIMITE_SKUS: 'Límite freemium',
};

interface DetalleFila {
  fila: number;
  mensaje: string;
}

function extraerDetalleFilas(details: unknown): DetalleFila[] {
  if (!Array.isArray(details)) return [];
  return details
    .filter((d): d is DetalleFila => typeof d === 'object' && d !== null && 'fila' in d)
    .map((d) => ({ fila: Number((d as DetalleFila).fila), mensaje: String((d as DetalleFila).mensaje ?? '') }));
}

export interface ImportarCsvDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Importación masiva de catálogo desde CSV (HU-10). Valida fila a fila en el
 * backend y muestra el aviso de truncado cuando el plan freemium limita a 15 SKUs.
 */
export const ImportarCsvDialog: React.FC<ImportarCsvDialogProps> = ({ open, onOpenChange }) => {
  const [contenido, setContenido] = useState('');
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filasInvalidas, setFilasInvalidas] = useState<DetalleFila[]>([]);
  const [resultado, setResultado] = useState<ImportarCsvResponse | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const importar = useImportarCsv();

  useEffect(() => {
    if (open) {
      setContenido('');
      setNombreArchivo(null);
      setError(null);
      setFilasInvalidas([]);
      setResultado(null);
    }
  }, [open]);

  const leerArchivo = (event: React.ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    setNombreArchivo(archivo.name);
    const lector = new FileReader();
    lector.onload = () => setContenido(typeof lector.result === 'string' ? lector.result : '');
    lector.onerror = () => setError('No se pudo leer el archivo seleccionado.');
    lector.readAsText(archivo);
  };

  const descargarPlantilla = () => {
    const blob = new Blob([PLANTILLA_CSV], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'plantilla_catalogo_libredss.csv';
    enlace.click();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setFilasInvalidas([]);
    setResultado(null);

    if (contenido.trim() === '') {
      setError('Selecciona un archivo CSV o pega su contenido.');
      return;
    }

    try {
      const res = await importar.mutateAsync(contenido);
      setResultado(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFilasInvalidas(extraerDetalleFilas(err.details));
      } else {
        setError('No se pudo importar el archivo CSV.');
      }
    }
  };

  const huboImportacion = Boolean(resultado);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl" aria-label="Importar catálogo CSV">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importar catálogo desde CSV
          </DialogTitle>
          <DialogDescription>
            Carga masiva con validación fila a fila. En el plan gratuito se importan hasta completar los 15 SKUs.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>No se importó ningún producto</AlertTitle>
            <AlertDescription>
              <p>{error}</p>
              {filasInvalidas.length > 0 && (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  {filasInvalidas.slice(0, 10).map((f) => (
                    <li key={f.fila}>
                      Fila {f.fila}: {f.mensaje}
                    </li>
                  ))}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}

        {resultado && (
          <Alert variant="success" className="mb-4">
            <AlertTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {resultado.importados} producto(s) importado(s)
            </AlertTitle>
            <AlertDescription>
              {resultado.omitidos > 0 && <p>{resultado.omitidos} fila(s) omitida(s).</p>}
              {resultado.avisoFreemium && <p className="mt-1 font-medium">{resultado.avisoFreemium}</p>}
            </AlertDescription>
          </Alert>
        )}

        {resultado && resultado.omitidosDetalle.length > 0 && (
          <div className="mb-4 max-h-56 overflow-y-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fila</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {resultado.omitidosDetalle.map((o) => (
                  <TableRow key={`${o.fila}-${o.sku ?? ''}`}>
                    <TableCell className="text-xs">{o.fila}</TableCell>
                    <TableCell className="text-xs">{o.sku ?? '—'}</TableCell>
                    <TableCell className="text-xs">{ETIQUETA_MOTIVO[o.motivo] ?? o.motivo}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="csv-archivo">Archivo CSV</Label>
            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={inputArchivo}
                id="csv-archivo"
                type="file"
                accept=".csv,text/csv"
                onChange={leerArchivo}
                className="block w-full max-w-sm text-xs text-muted-foreground file:mr-3 file:rounded-md file:border file:bg-background file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent"
              />
              <Button type="button" variant="ghost" size="sm" onClick={descargarPlantilla}>
                Descargar plantilla
              </Button>
            </div>
            {nombreArchivo && <p className="text-xs text-muted-foreground">Archivo: {nombreArchivo}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="csv-contenido">Contenido CSV (o pégalo aquí)</Label>
            <Textarea
              id="csv-contenido"
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              rows={6}
              placeholder={PLANTILLA_CSV}
              className="font-mono text-xs"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={importar.isPending}>
            {huboImportacion ? 'Cerrar' : 'Cancelar'}
          </Button>
          <Button type="submit" disabled={importar.isPending || contenido.trim() === ''}>
            {importar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Importar
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
