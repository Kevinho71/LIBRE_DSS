import React, { useState } from 'react';
import { Loader2, Plus, ShieldCheck, ShieldAlert, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UsuarioFormDialog } from '@/components/usuarios/UsuarioFormDialog';
import { useActualizarRolUsuario, useEliminarUsuario, useUsuarios } from '@/hooks/useUsuarios';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/api/client';
import { formatDate } from '@/lib/format';
import type { RolUsuario, UsuarioGestionDto } from '@libredss/shared';

const ETIQUETA_ROL: Record<RolUsuario, string> = {
  administrador: 'Administrador',
  operador: 'Operador',
};

/**
 * Gestión de usuarios y roles acotados por empresa (HU-28). Solo accesible para
 * administradores (ruta protegida por AdminRoute).
 */
export const UsuariosPage: React.FC = () => {
  const { usuario: usuarioActual } = useAuth();
  const { data, isLoading, isError } = useUsuarios();
  const actualizarRol = useActualizarRolUsuario();
  const eliminar = useEliminarUsuario();

  const [formOpen, setFormOpen] = useState(false);
  const [eliminando, setEliminando] = useState<UsuarioGestionDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  const usuarios = data?.items ?? [];

  const cambiarRol = async (usuario: UsuarioGestionDto, rol: RolUsuario) => {
    setError(null);
    try {
      await actualizarRol.mutateAsync({ id: usuario.id, rol });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo actualizar el rol.');
    }
  };

  const confirmarEliminar = async () => {
    if (!eliminando) return;
    setError(null);
    try {
      await eliminar.mutateAsync(eliminando.id);
      setEliminando(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo eliminar el usuario.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-foreground">
            <Users className="h-6 w-6 text-primary" />
            Usuarios y roles
          </h1>
          <p className="text-sm text-muted-foreground">
            Administra el acceso de tu equipo con roles acotados por empresa (HU-28).
          </p>
        </div>
        <Button type="button" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Nuevo usuario
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Equipo</CardTitle>
          <CardDescription>{usuarios.length} usuario(s) en tu empresa.</CardDescription>
        </CardHeader>
        <CardContent>
          {isError ? (
            <Alert variant="destructive">
              <AlertDescription>No se pudo cargar la lista de usuarios.</AlertDescription>
            </Alert>
          ) : isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : usuarios.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No hay usuarios registrados.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Alta</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuarios.map((u) => {
                    const esUnoMismo = u.id === usuarioActual?.id;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">
                            {u.nombre}
                            {esUnoMismo && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.email}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant={u.rol === 'administrador' ? 'default' : 'secondary'} className="gap-1">
                              {u.rol === 'administrador' ? (
                                <ShieldCheck className="h-3 w-3" />
                              ) : (
                                <ShieldAlert className="h-3 w-3" />
                              )}
                              {ETIQUETA_ROL[u.rol]}
                            </Badge>
                            <Select
                              aria-label={`Cambiar rol de ${u.nombre}`}
                              value={u.rol}
                              disabled={esUnoMismo || actualizarRol.isPending}
                              onChange={(e) => void cambiarRol(u, e.target.value as RolUsuario)}
                              className="h-8 w-36 text-xs"
                            >
                              <option value="operador">Operador</option>
                              <option value="administrador">Administrador</option>
                            </Select>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs">{formatDate(u.createdAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            aria-label={`Eliminar ${u.nombre}`}
                            disabled={esUnoMismo}
                            onClick={() => setEliminando(u)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <UsuarioFormDialog open={formOpen} onOpenChange={setFormOpen} />

      <Dialog
        open={Boolean(eliminando)}
        onOpenChange={(open) => !open && setEliminando(null)}
        aria-label="Confirmar eliminación de usuario"
      >
        <DialogHeader>
          <DialogTitle>Eliminar usuario</DialogTitle>
          <DialogDescription>
            {eliminando ? `¿Eliminar a «${eliminando.nombre}»? Perderá acceso a la plataforma.` : ''}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setEliminando(null)} disabled={eliminar.isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={() => void confirmarEliminar()} disabled={eliminar.isPending}>
            {eliminar.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
};
