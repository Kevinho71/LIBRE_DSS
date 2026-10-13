import { usuariosRepository } from './usuarios.repository';
import { hashPassword } from '../../shared/utils/password';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError';
import { logger } from '../../shared/utils/logger';
import { CrearUsuarioDto, ActualizarRolDto, UsuarioDto, RolUsuario } from './usuarios.types';

function toDto(u: { id: string; nombre: string; email: string; rol: string; createdAt: Date }): UsuarioDto {
  return {
    id: u.id,
    nombre: u.nombre,
    email: u.email,
    rol: u.rol as RolUsuario,
    createdAt: u.createdAt instanceof Date ? u.createdAt.toISOString() : String(u.createdAt),
  };
}

export const usuariosService = {
  async listar(empresaId: string): Promise<UsuarioDto[]> {
    const rows = await usuariosRepository.listar(empresaId);
    return rows.map(toDto);
  },

  async crear(empresaId: string, dto: CrearUsuarioDto): Promise<UsuarioDto> {
    const existente = await usuariosRepository.findByEmail(dto.email);
    if (existente) {
      throw new ConflictError('EMAIL_REGISTRADO', 'El correo electrónico ya se encuentra registrado');
    }

    const passwordHash = await hashPassword(dto.password);
    const creado = await usuariosRepository.crear(empresaId, {
      nombre: dto.nombre,
      email: dto.email,
      passwordHash,
      rol: dto.rol,
    });

    logger.info('Usuario creado por administrador', {
      empresaId,
      usuarioId: creado.id,
      rol: creado.rol,
    });

    return toDto(creado);
  },

  async actualizarRol(empresaId: string, solicitanteId: string, usuarioId: string, dto: ActualizarRolDto): Promise<UsuarioDto> {
    const objetivo = await usuariosRepository.findById(empresaId, usuarioId);
    if (!objetivo) {
      throw new NotFoundError('USUARIO_NO_ENCONTRADO', 'El usuario solicitado no fue encontrado');
    }

    // No se puede degradar al último administrador de la empresa.
    if (objetivo.rol === 'administrador' && dto.rol === 'operador') {
      const administradores = await usuariosRepository.countAdministradores(empresaId);
      if (administradores <= 1) {
        throw new ConflictError(
          'ULTIMO_ADMINISTRADOR',
          'No se puede degradar al único administrador de la empresa'
        );
      }
    }

    const actualizado = await usuariosRepository.actualizarRol(empresaId, usuarioId, dto.rol);
    if (!actualizado) {
      throw new NotFoundError('USUARIO_NO_ENCONTRADO', 'El usuario solicitado no fue encontrado');
    }

    logger.info('Rol de usuario actualizado', {
      empresaId,
      solicitanteId,
      usuarioId,
      rol: actualizado.rol,
    });

    return toDto(actualizado);
  },

  async eliminar(empresaId: string, solicitanteId: string, usuarioId: string): Promise<void> {
    if (solicitanteId === usuarioId) {
      throw new ConflictError('AUTO_ELIMINACION', 'No puedes eliminar tu propia cuenta');
    }

    const objetivo = await usuariosRepository.findById(empresaId, usuarioId);
    if (!objetivo) {
      throw new NotFoundError('USUARIO_NO_ENCONTRADO', 'El usuario solicitado no fue encontrado');
    }

    if (objetivo.rol === 'administrador') {
      const administradores = await usuariosRepository.countAdministradores(empresaId);
      if (administradores <= 1) {
        throw new ConflictError(
          'ULTIMO_ADMINISTRADOR',
          'No se puede eliminar al único administrador de la empresa'
        );
      }
    }

    await usuariosRepository.eliminar(empresaId, usuarioId);
    logger.info('Usuario eliminado', { empresaId, solicitanteId, usuarioId });
  },
};
