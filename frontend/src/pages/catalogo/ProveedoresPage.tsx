import React, { useState } from 'react';
import { Loader2, Plus, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ProveedorFormDialog } from '@/components/proveedores/ProveedorFormDialog';
import { useProveedores } from '@/hooks/useProveedores';
import { formatDate } from '@/lib/format';

export const ProveedoresPage: React.FC = () => {
  const [formOpen, setFormOpen] = useState(false);
  const { data, isLoading, isError } = useProveedores();

  const proveedores = data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <Truck className="h-6 w-6 text-primary" />
            Proveedores
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro de proveedores para vincularlos a los productos del catálogo (HU-08, CB-02).
          </p>
        </div>
        <Button type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo proveedor
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Proveedores registrados</CardTitle>
          <CardDescription>{proveedores.length} proveedor(es)</CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription>No se pudo cargar la lista de proveedores.</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : proveedores.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Aún no hay proveedores. Registra el primero para asociarlo a tus productos.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead>Alta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-foreground">{p.nombre}</TableCell>
                    <TableCell className="text-xs">{p.contacto ?? '—'}</TableCell>
                    <TableCell className="text-xs">{p.telefono ?? '—'}</TableCell>
                    <TableCell className="text-xs">{formatDate(p.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ProveedorFormDialog open={formOpen} onOpenChange={setFormOpen} />
    </div>
  );
};
