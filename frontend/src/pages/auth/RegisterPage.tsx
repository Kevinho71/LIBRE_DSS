import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ApiError } from '@/api/client';
import { ArrowRight, Eye, EyeOff } from 'lucide-react';
import { z } from 'zod';

/**
 * Registro mínimo: empresa + administrador en un solo paso y sesión iniciada al terminar.
 * El plan gratuito se asigna por defecto; el NIT y el cambio de plan se editan después.
 */
const RegisterValidationSchema = z.object({
  nombreEmpresa: z.string().min(2, 'El nombre de la empresa debe tener al menos 2 caracteres'),
  nombreUsuario: z.string().min(2, 'El nombre del administrador debe tener al menos 2 caracteres'),
  email: z.string().email('Por favor ingresa un correo electrónico válido'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  aceptaTerminos: z.boolean().refine((val) => val === true, {
    message: 'Debes aceptar los Términos y la Política de Privacidad para continuar',
  }),
});

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombreEmpresa: '',
    nombreUsuario: '',
    email: '',
    password: '',
    aceptaTerminos: false,
  });
  const [verPassword, setVerPassword] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string | boolean) => {
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
        nit: null,
        plan: 'gratuito',
        nombreUsuario: formData.nombreUsuario.trim(),
        email: formData.email.trim(),
        password: formData.password,
        aceptaTerminos: formData.aceptaTerminos,
      });

      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setErrorMessage('El correo electrónico ya se encuentra registrado por otra empresa o usuario.');
        } else if (err.details && typeof err.details === 'object') {
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
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-black text-xl shadow-md">
              DSS
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Crea tu cuenta</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan gratuito · Hasta 15 SKUs activos. Sin tarjeta.
          </p>
        </div>

        <Card className="shadow-lg border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Tu negocio y tu usuario</CardTitle>
            <CardDescription>Cuatro datos y entras directo a la aplicación.</CardDescription>
          </CardHeader>

          <CardContent>
            {errorMessage && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="nombreEmpresa">
                  Nombre comercial de la empresa <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombreEmpresa"
                  placeholder="Ej. Ferretería San José"
                  autoComplete="organization"
                  value={formData.nombreEmpresa}
                  onChange={(e) => handleChange('nombreEmpresa', e.target.value)}
                  error={errors.nombreEmpresa}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="nombreUsuario">
                  Nombre completo <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nombreUsuario"
                  placeholder="Ej. Juan Pérez"
                  autoComplete="name"
                  value={formData.nombreUsuario}
                  onChange={(e) => handleChange('nombreUsuario', e.target.value)}
                  error={errors.nombreUsuario}
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">
                  Correo electrónico <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  placeholder="juan@negocio.com"
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
                <div className="relative">
                  <Input
                    id="password"
                    type={verPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    className="pr-12"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    error={errors.password}
                    disabled={isSubmitting}
                  />
                  <button
                    type="button"
                    onClick={() => setVerPassword((v) => !v)}
                    aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground sm:h-9 sm:w-9"
                  >
                    {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

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
                    (Ley N° 164 y D.S. N° 1793).
                  </label>
                  {errors.aceptaTerminos && (
                    <p className="text-xs text-destructive font-medium">{errors.aceptaTerminos}</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full text-base" size="lg" isLoading={isSubmitting}>
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
