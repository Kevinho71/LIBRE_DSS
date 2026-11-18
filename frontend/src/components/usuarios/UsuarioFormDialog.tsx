import React, { useEffect, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCrearUsuario } from '@/hooks/useUsuarios';
import { ApiError } from '@/api/client';
import type { RolUsuario } from '@libredss/shared';

export interface UsuarioFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Alta de usuario con rol acotado por empresa (HU-28). */
export const UsuarioFormDialog: React.FC<UsuarioFormDialogProps> = ({ open, onOpenChange }) => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<RolUsuario>('operador');
  const [error, setError] = useState<string | null>(null);

  const crear = useCrearUsuario();

  useEffect(() => {
    if (open) {
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('operador');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (nombre.trim().length < 2) {
      setError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Ingresa un correo electrónico válido.');
      return;
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    try {
      await crear.mutateAsync({ nombre: nombre.trim(), email: email.trim(), password, rol });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo crear el usuario.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} aria-label="Formulario de usuario">
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Nuevo usuario
          </DialogTitle>
          <DialogDescription>El usuario queda acotado a tu empresa con el rol seleccionado.</DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usuario-nombre">Nombre *</Label>
            <Input id="usuario-nombre" value={nombre} maxLength={150} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="usuario-email">Correo electrónico *</Label>
            <Input
              id="usuario-email"
              type="email"
              value={email}
              maxLength={255}
              autoComplete="off"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usuario-password">Contraseña * (mín. 8)</Label>
            <Input
              id="usuario-password"
              type="password"
              value={password}
              autoComplete="new-password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="usuario-rol">Rol</Label>
            <Select id="usuario-rol" value={rol} onChange={(e) => setRol(e.target.value as RolUsuario)}>
              <option value="operador">Operador</option>
              <option value="administrador">Administrador</option>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={crear.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={crear.isPending}>
            {crear.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Crear usuario
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
};
