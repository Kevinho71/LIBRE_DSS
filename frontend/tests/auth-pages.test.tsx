import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

describe('Auth Pages & Route Guards Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('LoginPage', () => {
    it('debe renderizar el formulario con campos de email y contraseña', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^contraseña/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /ingresar a la plataforma/i })).toBeInTheDocument();
    });

    it('debe mostrar errores de validación si los campos requeridos están vacíos', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.click(screen.getByRole('button', { name: /ingresar a la plataforma/i }));

      await waitFor(() => {
        expect(screen.getByText(/por favor ingresa un correo electrónico válido/i)).toBeInTheDocument();
        expect(screen.getByText(/la contraseña es requerida/i)).toBeInTheDocument();
      });
    });

    it('debe alternar la visibilidad de la contraseña al pulsar el botón de ojo', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <LoginPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const passwordInput = screen.getByLabelText(/^contraseña/i) as HTMLInputElement;
      expect(passwordInput.type).toBe('password');

      const toggleButton = screen.getByRole('button', { name: /ver contraseña/i });
      fireEvent.click(toggleButton);

      expect(passwordInput.type).toBe('text');
    });
  });

  describe('RegisterPage', () => {
    it('debe renderizar el formulario de onboarding con datos de empresa, plan y admin', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByLabelText(/nombre comercial de la empresa/i)).toBeInTheDocument();
      expect(screen.getByText(/plan gratuito/i)).toBeInTheDocument();
      expect(screen.getByText(/hasta 15 skus activos/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/nombre completo/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /crear cuenta y comenzar/i })).toBeInTheDocument();
    });

    it('debe exigir la aceptación de términos y privacidad bajo Ley 164', async () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <RegisterPage />
          </AuthProvider>
        </MemoryRouter>
      );

      fireEvent.change(screen.getByLabelText(/nombre comercial de la empresa/i), {
        target: { value: 'Comercial Bolivia SRL' },
      });
      fireEvent.change(screen.getByLabelText(/nombre completo/i), {
        target: { value: 'Carlos Gomez' },
      });
      fireEvent.change(screen.getByLabelText(/correo electrónico/i), {
        target: { value: 'carlos@bolivia.com' },
      });
      fireEvent.change(screen.getByLabelText(/^contraseña/i), {
        target: { value: 'Password123!' },
      });
      fireEvent.change(screen.getByLabelText(/confirmar contraseña/i), {
        target: { value: 'Password123!' },
      });

      // No aceptamos términos y enviamos
      fireEvent.click(screen.getByRole('button', { name: /crear cuenta y comenzar/i }));

      await waitFor(() => {
        expect(
          screen.getByText(/debes aceptar los términos y la política de privacidad para continuar/i)
        ).toBeInTheDocument();
      });
    });
  });

  describe('ProtectedRoute Guard', () => {
    it('debe redirigir al login si el usuario no está autenticado', () => {
      render(
        <MemoryRouter initialEntries={['/privado']}>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<div>Pantalla Login</div>} />
              <Route
                path="/privado"
                element={
                  <ProtectedRoute>
                    <div>Contenido Privado</div>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText('Pantalla Login')).toBeInTheDocument();
      expect(screen.queryByText('Contenido Privado')).not.toBeInTheDocument();
    });
  });
});
