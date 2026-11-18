import { createContext, useContext, useEffect } from 'react';

interface LayoutChromeValue {
  setNavInferiorOculta: (oculta: boolean) => void;
}

/** Permite a una pantalla de flujo enfocado ocultar la navegación inferior del layout. */
export const LayoutChromeContext = createContext<LayoutChromeValue>({ setNavInferiorOculta: () => undefined });

/** Oculta la navegación inferior mientras `oculta` sea verdadero y la restaura al salir. */
export function useOcultarNavInferior(oculta: boolean): void {
  const { setNavInferiorOculta } = useContext(LayoutChromeContext);
  useEffect(() => {
    setNavInferiorOculta(oculta);
    return () => setNavInferiorOculta(false);
  }, [oculta, setNavInferiorOculta]);
}
