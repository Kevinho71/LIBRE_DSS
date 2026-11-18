import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { UsuariosPage } from '@/pages/usuarios/UsuariosPage';

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    usuario: { id: 'u1', nombre: 'Kevin', email: 'kevin@test.com', rol: 'administrador', createdAt: '' },
    empresa: null,
    token: 'token',
    isAuthenticated: true,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/api/usuarios.api', () => ({
  usuariosApi: {
    listar: vi.fn(),
    crear: vi.fn(),
    actualizarRol: vi.fn(),
    eliminar: vi.fn(),
  },
}));

import { usuariosApi } from '@/api/usuarios.api';

const mockListar = vi.mocked(usuariosApi.listar);
const mockActualizarRol = vi.mocked(usuariosApi.actualizarRol);
const mockEliminar = vi.mocked(usuariosApi.eliminar);

function renderUsuarios() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <UsuariosPage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('UsuariosPage (HU-28)', () => {
  beforeEach(() => {
    mockListar.mockReset();
    mockActualizarRol.mockReset();
    mockEliminar.mockReset();
  });

  it('lista el equipo y permite abrir el alta de usuario', async () => {
    mockListar.mockResolvedValue({
      items: [
        { id: 'u2', nombre: 'Ana', email: 'ana@test.com', rol: 'operador', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      total: 1,
    });

    renderUsuarios();

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    expect(screen.getByText('ana@test.com')).toBeInTheDocument();

    screen.getByRole('button', { name: /nuevo usuario/i }).click();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
  });

  it('actualiza el rol de un usuario', async () => {
    mockListar.mockResolvedValue({
      items: [
        { id: 'u2', nombre: 'Ana', email: 'ana@test.com', rol: 'operador', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      total: 1,
    });
    mockActualizarRol.mockResolvedValue({
      id: 'u2',
      nombre: 'Ana',
      email: 'ana@test.com',
      rol: 'administrador',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    renderUsuarios();

    const select = await screen.findByLabelText(/cambiar rol de ana/i);
    fireEvent.change(select, { target: { value: 'administrador' } });

    await waitFor(() => expect(mockActualizarRol).toHaveBeenCalledWith('u2', 'administrador'));
  });

  it('elimina un usuario tras confirmar', async () => {
    mockListar.mockResolvedValue({
      items: [
        { id: 'u2', nombre: 'Ana', email: 'ana@test.com', rol: 'operador', createdAt: '2026-01-01T00:00:00.000Z' },
      ],
      total: 1,
    });
    mockEliminar.mockResolvedValue(undefined);

    renderUsuarios();

    await waitFor(() => expect(screen.getByText('Ana')).toBeInTheDocument());
    screen.getByRole('button', { name: /eliminar ana/i }).click();

    const botones = await screen.findAllByRole('button', { name: /^eliminar$/i });
    botones[botones.length - 1].click();

    await waitFor(() => expect(mockEliminar).toHaveBeenCalledWith('u2'));
  });
});
