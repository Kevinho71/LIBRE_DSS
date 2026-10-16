import { useCallback, useEffect, useRef, useState } from 'react';
import { contarVentasPendientes } from './salesQueue';
import { sincronizarVentasPendientes, type ResultadoSync } from './sync';
import { useOnlineStatus } from './useOnlineStatus';

const INTERVALO_SYNC_MS = 60_000;

export interface UseSalesSync {
  online: boolean;
  pendientes: number;
  sincronizando: boolean;
  ultimaSincronizacion: string | null;
  ultimoResultado: ResultadoSync | null;
  sincronizarAhora: () => Promise<void>;
  refrescarPendientes: () => Promise<void>;
}

/**
 * Orquesta la sincronización de la cola offline: al recuperar conexión, al
 * montar y cada 60 s. La venta encolada conserva su llave de idempotencia, por
 * lo que reintentar es seguro.
 */
export function useSalesSync(): UseSalesSync {
  const online = useOnlineStatus();
  const [pendientes, setPendientes] = useState(0);
  const [sincronizando, setSincronizando] = useState(false);
  const [ultimaSincronizacion, setUltimaSincronizacion] = useState<string | null>(null);
  const [ultimoResultado, setUltimoResultado] = useState<ResultadoSync | null>(null);
  const enCurso = useRef(false);

  const refrescarPendientes = useCallback(async () => {
    setPendientes(await contarVentasPendientes());
  }, []);

  const sincronizarAhora = useCallback(async () => {
    if (enCurso.current) return;
    enCurso.current = true;
    setSincronizando(true);
    try {
      const resultado = await sincronizarVentasPendientes();
      setUltimoResultado(resultado);
      setPendientes(resultado.pendientes);
      setUltimaSincronizacion(new Date().toISOString());
    } finally {
      enCurso.current = false;
      setSincronizando(false);
    }
  }, []);

  useEffect(() => {
    void refrescarPendientes();
  }, [refrescarPendientes]);

  useEffect(() => {
    if (!online) return;
    void sincronizarAhora();
  }, [online, sincronizarAhora]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void sincronizarAhora();
    }, INTERVALO_SYNC_MS);
    return () => window.clearInterval(id);
  }, [sincronizarAhora]);

  return {
    online,
    pendientes,
    sincronizando,
    ultimaSincronizacion,
    ultimoResultado,
    sincronizarAhora,
    refrescarPendientes,
  };
}
