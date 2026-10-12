import React from 'react';

export function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <header>
        <h1>LIBREDSS - Plataforma DSS</h1>
        <p>Sistema de Soporte a Decisiones de Inventario para Mypes</p>
      </header>
      <main style={{ marginTop: '2rem' }}>
        <section style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.5rem', maxWidth: '600px' }}>
          <h2>Plantilla Frontend Inicial</h2>
          <p>Estructura modular lista para Sprints: Vistas, Componentes, IndexedDB offline y conexión con Backend API.</p>
          <div style={{ display: 'inline-block', padding: '0.25rem 0.75rem', background: '#e0f2fe', color: '#0369a1', borderRadius: '9999px', fontSize: '0.875rem' }}>
            Estado: Configuración Inicial Lista
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
