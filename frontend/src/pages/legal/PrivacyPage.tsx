import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-card p-6 sm:p-10 rounded-xl border shadow-sm">
        <div className="mb-6">
          <Link to="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" /> Volver al Inicio
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6 pb-4 border-b">
          <Lock className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Política de Privacidad y Tratamiento de Datos</h1>
            <p className="text-xs text-muted-foreground">
              Plataforma LIBREDSS · Protección de datos comerciales de MyPEs
            </p>
          </div>
        </div>

        <div className="prose prose-slate prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Principio de Finalidad y Consentimiento</h2>
            <p>
              En estricto cumplimiento de la normativa sobre privacidad y protección de datos digitales, la información
              recolectada por LIBREDSS (nombre de empresa, NIT, correos electrónicos, catálogos, registros de transacciones
              y proveedores) tiene la única finalidad de prestar el servicio de optimización matemática de inventarios
              y soporte a la toma de decisiones comerciales.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Aislamiento Multi-Empresa Estricto</h2>
            <p>
              Cada suscriptor de LIBREDSS cuenta con un identificador de tenant único. Toda consulta en la capa de datos
              ejecuta mecanismos de seguridad a nivel de fila (Row-Level Security) de PostgreSQL, impidiendo de forma
              absoluta que cualquier usuario acceda, visualice o modifique datos de otra empresa.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Cifrado y Almacenamiento Seguro</h2>
            <p>
              Las contraseñas de acceso son almacenadas utilizando funciones de derivación de claves seguras con sal
              criptográfica (BCrypt con 10 rondas). Las sesiones activas utilizan Tokens Web JSON (JWT) firmados mediante
              algoritmo HMAC-SHA256 y son transmitidos exclusivamente sobre conexiones cifradas HTTPS/TLS.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. No Transferencia a Terceros</h2>
            <p>
              LIBREDSS no comercializa, cede, arrienda ni transfiere bajo ninguna circunstancia información comercial o
              patrones de compra/venta de sus clientes a terceras partes, competidores o centrales de riesgo comercial.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Derecho de Supresión y Rectificación</h2>
            <p>
              La empresa titular puede en cualquier momento rectificar sus datos o solicitar la baja de su cuenta
              mediante el panel de administración o comunicación directa con el equipo técnico.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
