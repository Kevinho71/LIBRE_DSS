import React from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AdminRoute: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const { usuario, isLoading } = useAuth();

  if (isLoading) return null;

  if (usuario?.rol !== 'administrador') {
    return (
      <div className="flex h-screen w-screen items-center justify-center p-4">
        <div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-3" />
          <h2 className="text-lg font-semibold text-foreground">Acceso Restringido</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Esta sección requiere privilegios de Administrador. Tu rol actual es:{' '}
            <span className="font-semibold text-foreground capitalize">{usuario?.rol || 'operador'}</span>.
          </p>
          <div className="mt-6">
            <Button onClick={() => window.history.back()} variant="outline">
              Regresar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};
