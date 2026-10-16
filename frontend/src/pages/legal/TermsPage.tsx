import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const TermsPage: React.FC = () => {
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
          <ShieldCheck className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold text-foreground">Términos y Condiciones de Uso</h1>
            <p className="text-xs text-muted-foreground">
              Plataforma LIBREDSS · Marco Jurídico: Ley N° 164 y D.S. N° 1793 (Bolivia)
            </p>
          </div>
        </div>

        <div className="prose prose-slate prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Identificación y Objeto del Servicio</h2>
            <p>
              La plataforma <strong>LIBREDSS</strong> es un Sistema de Soporte a la Toma de Decisiones (DSS) para la
              gestión y control de inventarios diseñado para Micro y Pequeñas Empresas (MyPEs) comerciales en el
              Estado Plurinacional de Bolivia. El acceso y uso de los servicios provistos se rigen por los presentes
              Términos y Condiciones de conformidad con la Ley General de Telecomunicaciones, Tecnologías de Información
              y Comunicación (Ley N° 164 de 8 de agosto de 2011) y el Decreto Supremo N° 1793.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Modalidades y Límites del Servicio (Plan Freemium)</h2>
            <p>
              LIBREDSS ofrece una modalidad gratuita denominada <strong>Plan Freemium</strong> con un límite máximo
              operativo de quince (15) Códigos de Mantenimiento de Existencias (SKUs) activos de forma simultánea. Al
              alcanzar dicho tope, la plataforma requerirá la inactivación de artículos en desuso o la contratación del
              Plan Empresarial para registrar nuevos productos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Titularidad y Confidencialidad de la Información Comercial</h2>
            <p>
              La empresa usuaria conserva la exclusiva propiedad y titularidad de los datos de inventario, compras,
              proveedores y ventas registrados en el sistema. LIBREDSS garantiza el aislamiento lógico y criptográfico
              de cada suscriptor mediante políticas estrictas de seguridad por fila (Row-Level Security) en base de datos.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Alcance y Naturaleza de las Sugerencias del DSS</h2>
            <p>
              Los modelos matemáticos y algoritmos de optimización (Clasificación ABC, Cantidad Económica de Pedido EOQ,
              Punto de Reorden ROP y Sistemas de Revisión Continua/Periódica) son herramientas de apoyo y
              recomendación técnica. La decisión final de compra, negociación con proveedores y política financiera
              recae enteramente en la administración de la empresa cliente.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Ingesta Asistida por Inteligencia Artificial (Human-in-the-Loop)</h2>
            <p>
              Toda extracción de recibos o cuadernos físicos asistida por Inteligencia Artificial y coincidencia de
              trigramas opera bajo el principio de <em>Validación Humana en el Bucle (Human-in-the-Loop)</em>. Ningún
              movimiento de stock derivado de fotografía se persiste en el inventario real sin la confirmación explícita
              del operador humano.
            </p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Jurisdicción y Resolución de Controversias</h2>
            <p>
              Cualquier controversia derivada de la interpretación o ejecución de los presentes términos se resolverá
              conforme a las leyes vigentes del Estado Plurinacional de Bolivia y ante la jurisdicción ordinaria de los
              tribunales competentes de la ciudad sede.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};
