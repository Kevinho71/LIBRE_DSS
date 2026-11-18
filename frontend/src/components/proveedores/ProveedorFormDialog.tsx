import React, { useEffect, useState } from 'react';
import { Loader2, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCrearProveedor } from '@/hooks/useProveedores';
import { ApiError } from '@/api/client';

export interface ProveedorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Alta de proveedores de la empresa (HU-08). */
export const ProveedorFormDialog: React.FC<ProveedorFormDialogProps> = ({ open, onOpenChange }) => {
  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  const [telefono, setTelefono] = useState('');
  const [error, setError] = useState<string | null>(null);

  const crear = useCrearProveedor();

  useEffect(() => {
    if (open) {
      setNombre('');
      setContacto('');
      setTelefono('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (nombre.trim().length < 2) {
      setError('El nombre del proveedor debe tener al menos 2 caracteres.');
      return;
    }

    try {
      await crear.mutateAsync({
        nombre: nombre.trim(),
        contacto: contacto.trim() !== '' ? contacto.trim() : null,
        telefono: telefono.trim() !== '' ? telefono.trim() : null,
      });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo registrar el proveedor.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} aria-label="Formulario de proveedor">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Nuevo proveedor
          </DialogTitle>
          <DialogDescription>Registra un proveedor para asociarlo a tus productos (CB-02).</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="prov-nombre">Nombre *</Label>
            <Input id="prov-nombre" value={nombre} maxLength={255} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="prov-contacto">Contacto</Label>
              <Input id="prov-contacto" value={contacto} onChange={(e) => setContacto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prov-telefono">Teléfono</Label>
              <Input id="prov-telefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={crear.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Registrar proveedor
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
