import React from 'react';
import { CloudOff, Loader2, RefreshCw, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSalesSync } from '@/offline/useSalesSync';

/** Indicador de estado de red + cola de ventas offline (HU-44). */
export const OfflineBanner: React.FC = () => {
  const { online, pendientes, sincronizando, sincronizarAhora } = useSalesSync();

  if (online && pendientes === 0) return null;

  const offline = !online;

  return (
    <div
      className={`flex flex-col gap-2 border-b px-4 py-2 text-xs sm:flex-row sm:items-center sm:justify-between ${
        offline
          ? 'border-amber-300 bg-amber-50 text-amber-800'
          : 'border-blue-200 bg-blue-50 text-blue-800'
      }`}
      role="status"
    >
      <div className="flex items-center gap-2">
        {offline ? <CloudOff className="h-4 w-4" /> : <Wifi className="h-4 w-4" />}
        <span>
          {offline
            ? 'Sin conexión. Las ventas se guardan en el dispositivo y se sincronizan al recuperar la red.'
            : `${pendientes} venta(s) pendiente(s) de sincronizar.`}
        </span>
      </div>

      {pendientes > 0 && (
        <Button
          type="button"
          size="sm"
          variant={offline ? 'outline' : 'default'}
          disabled={sincronizando || offline}
          onClick={() => void sincronizarAhora()}
        >
          {sincronizando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Sincronizar ahora
        </Button>
      )}
    </div>
  );
};
