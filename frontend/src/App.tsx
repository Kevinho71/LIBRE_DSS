import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { PublicRoute } from '@/components/auth/PublicRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { TermsPage } from '@/pages/legal/TermsPage';
import { PrivacyPage } from '@/pages/legal/PrivacyPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { KardexPage } from '@/pages/transacciones/KardexPage';
import { VentaPage } from '@/pages/transacciones/VentaPage';
import { IngresoPage } from '@/pages/transacciones/IngresoPage';
import { AjustePage } from '@/pages/transacciones/AjustePage';
import { AbcPage } from '@/pages/abc/AbcPage';
import { AlertasPage } from '@/pages/alertas/AlertasPage';
import { ReceiptReviewPage } from '@/pages/ingesta/ReceiptReviewPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutos
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rutas Públicas de Autenticación */}
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <LoginPage />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <RegisterPage />
                </PublicRoute>
              }
            />

            {/* Rutas Legales (Acceso Público) */}
            <Route path="/terminos" element={<TermsPage />} />
            <Route path="/privacidad" element={<PrivacyPage />} />

            {/* Rutas Protegidas bajo AppLayout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="transacciones" element={<KardexPage />} />
              <Route path="transacciones/venta" element={<VentaPage />} />
              <Route path="transacciones/ingreso" element={<IngresoPage />} />
              <Route path="transacciones/ajuste" element={<AjustePage />} />
              <Route path="abc" element={<AbcPage />} />
              <Route path="alertas" element={<AlertasPage />} />
              <Route path="ingesta" element={<ReceiptReviewPage />} />
            </Route>

            {/* 404 No Encontrado */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
