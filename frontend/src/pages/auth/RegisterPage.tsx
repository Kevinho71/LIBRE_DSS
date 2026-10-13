import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiError } from '@/api/client';
import { Building2, User, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
import { z } from 'zod';

const RegisterValidationSchema = z
  .object({
    nombreEmpresa: z.string().min(2, 'El nombre de la empresa debe tener al menos 2 caracteres'),
    nit: z.string().max(50, 'NIT no puede exceder 50 caracteres').optional(),
    plan: z.enum(['gratuito', 'pago']),
    nombreUsuario: z.string().min(2, 'El nombre del administrador debe tener al menos 2 caracteres'),
    email: z.string().email('Por favor ingresa un correo electrónico válido'),
    password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
    confirmPassword: z.string().min(1, 'Por favor confirma la contraseña'),
    aceptaTerminos: z.boolean().refine((val) => val === true, {
      message: 'Debes aceptar los Términos y la Política de Privacidad para continuar',
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    nit: '',
    plan: 'gratuito' as 'gratuito' | 'pago',
    nombreUsuario: '',
    email: '',
    password: '',
    confirmPassword: '',
    aceptaTerminos: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrors({});

    const result = RegisterValidationSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const fieldName = issue.path[0] as string;
        if (!fieldErrors[fieldName]) {
          fieldErrors[fieldName] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await register({
        nombreEmpresa: formData.nombreEmpresa.trim(),
        nit: formData.nit.trim() ? formData.nit.trim() : null,
        plan: formData.plan,
        nombreUsuario: formData.nombreUsuario.trim(),
        email: formData.email.trim(),
        password: formData.password,
        aceptaTerminos: formData.aceptaTerminos,
      });

      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setErrorMessage('El correo electrónico ya se encuentra registrado por otra empresa o usuario.');
        } else if (err.details && typeof err.details === 'object') {
          // Extraer mensaje legible de validación
          const detailsList = Object.entries(err.details)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
            .join(' | ');
          setErrorMessage(`${err.message} (${detailsList})`);
        } else {
          setErrorMessage(err.message || 'Error al completar el registro.');
        }
      } else {
        setErrorMessage('No se pudo establecer conexión con el servidor.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xl shadow-md">
              DSS
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Crea tu cuenta en LIBREDSS
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Comienza a optimizar los inventarios de tu MyPE con decisiones basadas en datos
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl">Onboarding de Empresa</CardTitle>
            <CardDescription>
              Configura los datos iniciales de tu negocio y el usuario administrador principal
            </CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Sección 1: Datos de la Empresa */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-slate-800">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>1. Información del Negocio</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="nombreEmpresa">
                      Nombre Comercial de la Empresa <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nombreEmpresa"
                      placeholder="Ej. Comercializadora San José SRL"
                      value={formData.nombreEmpresa}
                      onChange={(e) => handleChange('nombreEmpresa', e.target.value)}
                      error={errors.nombreEmpresa}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="nit">NIT / Matrícula de Comercio (Opcional)</Label>
                    <Input
                      id="nit"
                      placeholder="Ej. 1028475023"
                      value={formData.nit}
                      onChange={(e) => handleChange('nit', e.target.value)}
                      error={errors.nit}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Selección de Plan Freemium */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-slate-800">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>2. Selección de Plan</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tarjeta Plan Gratuito */}
                  <div
                    onClick={() => handleChange('plan', 'gratuito')}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative ${
                      formData.plan === 'gratuito'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-base text-foreground">Plan Gratuito</span>
                      <Badge variant="freemium">Recomendado</Badge>
                    </div>
                    <div className="text-2xl font-black text-primary mb-2">
                      0 Bs <span className="text-xs font-normal text-muted-foreground">/ siempre</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li className="flex items-center gap-1.5 text-foreground font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Hasta 15 SKUs activos</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Clasificación ABC y Semáforo</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Cálculo EOQ & ROP</span>
                      </li>
                    </ul>
                  </div>

                  {/* Tarjeta Plan Pago */}
                  <div
                    onClick={() => handleChange('plan', 'pago')}
                    className={`cursor-pointer rounded-xl border-2 p-4 transition-all relative ${
                      formData.plan === 'pago'
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-base text-foreground">Plan Empresarial</span>
                      <Badge variant="outline">Ilimitado</Badge>
                    </div>
                    <div className="text-2xl font-black text-slate-800 mb-2">
                      150 Bs <span className="text-xs font-normal text-muted-foreground">/ mes</span>
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1.5">
                      <li className="flex items-center gap-1.5 text-foreground font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Catálogo de SKUs ilimitado</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Múltiples sucursales</span>
                      </li>
                      <li className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                        <span>Ingesta OCR con IA ilimitada</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Sección 3: Administrador Principal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2 text-sm font-semibold text-slate-800">
                  <User className="h-4 w-4 text-primary" />
                  <span>3. Usuario Administrador</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="nombreUsuario">
                      Nombre Completo <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="nombreUsuario"
                      placeholder="Ej. Juan Pérez"
                      value={formData.nombreUsuario}
                      onChange={(e) => handleChange('nombreUsuario', e.target.value)}
                      error={errors.nombreUsuario}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="email">
                      Correo Electrónico <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="juan@empresa.com"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      error={errors.email}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="password">
                      Contraseña <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Mínimo 8 caracteres"
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      error={errors.password}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">
                      Confirmar Contraseña <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Repite la contraseña"
                      value={formData.confirmPassword}
                      onChange={(e) => handleChange('confirmPassword', e.target.value)}
                      error={errors.confirmPassword}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Sección 4: Cumplimiento Legal Boliviano (Ley 164 / DS 1793) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start space-x-3 p-3 bg-slate-50 border rounded-lg">
                  <Checkbox
                    id="aceptaTerminos"
                    checked={formData.aceptaTerminos}
                    onCheckedChange={(checked) => handleChange('aceptaTerminos', Boolean(checked))}
                    disabled={isSubmitting}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="aceptaTerminos"
                      className="text-xs font-medium text-foreground leading-snug cursor-pointer select-none"
                    >
                      Acepto los{' '}
                      <Link to="/terminos" target="_blank" className="text-primary underline font-semibold">
                        Términos y Condiciones
                      </Link>{' '}
                      y la{' '}
                      <Link to="/privacidad" target="_blank" className="text-primary underline font-semibold">
                        Política de Privacidad
                      </Link>{' '}
                      de LIBREDSS en estricto cumplimiento de la Ley N° 164 y D.S. N° 1793 del Estado Plurinacional de Bolivia.
                    </label>
                    {errors.aceptaTerminos && (
                      <p className="text-xs text-destructive font-medium">{errors.aceptaTerminos}</p>
                    )}
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full h-11 text-base mt-4" isLoading={isSubmitting}>
                Crear Cuenta y Comenzar
                {!isSubmitting && <ArrowRight className="h-4 w-4 ml-1.5" />}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t bg-slate-50/50 py-4 rounded-b-xl">
            <p className="text-xs text-muted-foreground">
              ¿Tu empresa ya está registrada?{' '}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Inicia sesión aquí
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};
