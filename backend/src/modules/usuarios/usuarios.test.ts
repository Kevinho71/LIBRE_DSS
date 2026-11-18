import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { usuarios } from '../../db/schema';
import { crearUsuarioSchema } from './usuarios.schema';
import { usuariosService } from './usuarios.service';
import { usuariosRepository } from './usuarios.repository';

type UsuarioRow = typeof usuarios.$inferSelect;

describe('Usuarios Service — Roles y permisos (Sprint 6 / LIB-7 / HU-28)', () => {
  const empresaId = crypto.randomUUID();
  const adminId = crypto.randomUUID();

  const usuarioRow = (over: Partial<UsuarioRow> = {}): UsuarioRow => ({
    id: 'u1',
    empresaId,
    nombre: 'Operador',
    email: 'operador@x.com',
    passwordHash: 'hash',
    rol: 'operador',
    createdAt: new Date(),
    ...over,
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('crea un usuario hasheando la contraseña y devuelve el DTO', async () => {
    vi.spyOn(usuariosRepository, 'findByEmail').mockResolvedValue(null);
    const crearSpy = vi
      .spyOn(usuariosRepository, 'crear')
      .mockResolvedValue(usuarioRow({ id: 'nuevo', rol: 'operador' }));

    const creado = await usuariosService.crear(empresaId, {
      nombre: 'Operador',
      email: 'operador@x.com',
      password: 'clave1234',
      rol: 'operador',
    });

    expect(creado.id).toBe('nuevo');
    const repoInput = crearSpy.mock.calls[0][1];
    expect(repoInput.email).toBe('operador@x.com');
    expect(repoInput.passwordHash).not.toBe('clave1234');
  });

  it('normaliza el correo a minúsculas en el borde Zod', () => {
    const parsed = crearUsuarioSchema.parse({
      nombre: 'Operador',
      email: 'OPERADOR@X.com',
      password: 'clave1234',
      rol: 'operador',
    });
    expect(parsed.email).toBe('operador@x.com');
  });

  it('rechaza un correo ya registrado', async () => {
    vi.spyOn(usuariosRepository, 'findByEmail').mockResolvedValue(usuarioRow());

    await expect(
      usuariosService.crear(empresaId, {
        nombre: 'Otro',
        email: 'operador@x.com',
        password: 'clave1234',
        rol: 'operador',
      })
    ).rejects.toMatchObject({ code: 'EMAIL_REGISTRADO' });
  });

  it('impide degradar al último administrador de la empresa', async () => {
    vi.spyOn(usuariosRepository, 'findById').mockResolvedValue(usuarioRow({ rol: 'administrador' }));
    vi.spyOn(usuariosRepository, 'countAdministradores').mockResolvedValue(1);

    await expect(
      usuariosService.actualizarRol(empresaId, adminId, 'u1', { rol: 'operador' })
    ).rejects.toMatchObject({ code: 'ULTIMO_ADMINISTRADOR' });
  });

  it('permite actualizar el rol cuando hay más de un administrador', async () => {
    vi.spyOn(usuariosRepository, 'findById').mockResolvedValue(usuarioRow({ rol: 'administrador' }));
    vi.spyOn(usuariosRepository, 'countAdministradores').mockResolvedValue(2);
    vi.spyOn(usuariosRepository, 'actualizarRol').mockResolvedValue(
      usuarioRow({ rol: 'operador' })
    );

    const res = await usuariosService.actualizarRol(empresaId, adminId, 'u1', { rol: 'operador' });
    expect(res.rol).toBe('operador');
  });

  it('impide eliminar la propia cuenta', async () => {
    await expect(usuariosService.eliminar(empresaId, 'u1', 'u1')).rejects.toMatchObject({
      code: 'AUTO_ELIMINACION',
    });
  });
});
