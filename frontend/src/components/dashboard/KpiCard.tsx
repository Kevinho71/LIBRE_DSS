import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type KpiTono = 'primary' | 'success' | 'warning' | 'destructive' | 'neutral';

const TONO_ICONO: Record<KpiTono, string> = {
  primary: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  destructive: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export interface KpiCardProps {
  titulo: string;
  valor: string;
  icono: LucideIcon;
  descripcion?: string;
  tono?: KpiTono;
}

/**
 * Tarjeta de KPI del dashboard ejecutivo (HU-26). El valor va siempre
 * acompañado de su etiqueta textual para no depender solo del color.
 */
export const KpiCard: React.FC<KpiCardProps> = ({ titulo, valor, icono: Icon, descripcion, tono = 'primary' }) => {
  return (
    <Card>
      <CardContent className="flex items-start gap-3 pt-6">
        <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', TONO_ICONO[tono])}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{titulo}</p>
          <p className="mt-0.5 truncate text-2xl font-extrabold tracking-tight text-foreground">{valor}</p>
          {descripcion && <p className="mt-0.5 text-xs text-muted-foreground">{descripcion}</p>}
        </div>
      </CardContent>
    </Card>
  );
};
