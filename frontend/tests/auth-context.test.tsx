import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { client } from '@/api/client';
import { AuthResponseDto } from '@libredss/shared';

const TestConsumer: React.FC = () => {
  const { usuario, empresa, token, isAuthenticated, isLoading, login, logout, register } = useAuth();
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'loading' : 'ready'}</div>
      <div data-testid="auth">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user">{usuario ? usuario.nombre : 'none'}</div>
      <div data-testid="empresa">{empresa ? empresa.nombre : 'none'}</div>
      <div data-testid="token">{token || 'none'}</div>
      <button
        onClick={() =>
          login({ email: 'test@empresa.com', password: 'password123' })
        }
      >
        LoginBtn
      </button>
      <button
        onClick={() =>
          register({
            nombreEmpresa: 'Test SRL',
            plan: 'gratuito',
            nombreUsuario: 'Juan',
            email: 'juan@test.com',
            password: 'password123',
          })
        }
      >
        RegisterBtn
      </button>
      <button onClick={logout}>LogoutBtn</button>
    </div>
  );
};

describe('AuthContext Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockAuthResponse: AuthResponseDto = {
    token: 'jwt-mock-token-abc',
    usuario: {
      id: 'usr-1',
      nombre: 'Juan Perez',
      email: 'test@empresa.com',
      rol: 'administrador',
      createdAt: '2026-01-01T00:00:00Z',
    },
    empresa: {
      id: 'emp-1',
      nombre: 'Comercializadora Test SRL',
      nit: '12345678',
      plan: 'gratuito',
      createdAt: '2026-01-01T00:00:00Z',
    },
  };

  it('debe inicializarse en estado no autenticado cuando no hay sesión en localStorage', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading').textContent).toBe('ready');
    expect(screen.getByTestId('auth').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('token').textContent).toBe('none');
  });

  it('debe autenticar al usuario y guardar en localStorage tras login exitoso', async () => {
    vi.spyOn(client, 'post').mockResolvedValue(mockAuthResponse);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('LoginBtn').click();
    });

    expect(screen.getByTestId('auth').textContent).toBe('authenticated');
    expect(screen.getByTestId('user').textContent).toBe('Juan Perez');
    expect(screen.getByTestId('empresa').textContent).toBe('Comercializadora Test SRL');
    expect(screen.getByTestId('token').textContent).toBe('jwt-mock-token-abc');

    expect(localStorage.getItem('libredss_token')).toBe('jwt-mock-token-abc');
  });

  it('debe autenticar al usuario tras registro exitoso', async () => {
    vi.spyOn(client, 'post').mockResolvedValue(mockAuthResponse);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('RegisterBtn').click();
    });

    expect(screen.getByTestId('auth').textContent).toBe('authenticated');
    expect(screen.getByTestId('user').textContent).toBe('Juan Perez');
  });

  it('debe limpiar el estado y el localStorage al llamar a logout', async () => {
    vi.spyOn(client, 'post').mockResolvedValue(mockAuthResponse);

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await act(async () => {
      screen.getByText('LoginBtn').click();
    });

    expect(screen.getByTestId('auth').textContent).toBe('authenticated');

    await act(async () => {
      screen.getByText('LogoutBtn').click();
    });

    expect(screen.getByTestId('auth').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('user').textContent).toBe('none');
    expect(screen.getByTestId('token').textContent).toBe('none');
    expect(localStorage.getItem('libredss_token')).toBeNull();
  });
});
