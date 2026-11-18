import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <FileQuestion className="mx-auto h-16 w-16 text-muted-foreground/60 mb-4" />
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">404</h1>
        <h2 className="text-lg font-semibold text-foreground mt-2">Página no encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          La ruta a la que intentas acceder no existe o fue movida a otra ubicación.
        </p>
        <div className="mt-6">
          <Link to="/dashboard">
            <Button className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Volver al Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};
