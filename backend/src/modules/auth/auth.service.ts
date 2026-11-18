import { authRepository } from './auth.repository';
import { RegisterDto, LoginDto, AuthResponseDto, UserSummaryDto, EmpresaSummaryDto } from './auth.types';
import { ConflictError, UnauthorizedError, NotFoundError } from '../../shared/errors/AppError';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { signJwt } from '../../shared/utils/jwt';
import { logger } from '../../shared/utils/logger';

export const authService = {
  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingUser = await authRepository.findUserByEmail(dto.email);
    if (existingUser) {
      throw new ConflictError('EMAIL_REGISTRADO', 'El correo electrónico ya se encuentra registrado');
    }

    const passwordHash = await hashPassword(dto.password);

    const { empresa, usuario } = await authRepository.createEmpresaAndAdmin(
      {
        nombre: dto.nombreEmpresa,
        nit: dto.nit,
        plan: dto.plan,
      },
      {
        nombre: dto.nombreUsuario,
        email: dto.email,
        passwordHash,
        rol: 'administrador',
      }
    );

    const token = signJwt({
      usuarioId: usuario.id,
      empresaId: empresa.id,
      rol: usuario.rol,
      email: usuario.email,
    });

    logger.info('Empresa y usuario administrador registrados exitosamente', {
      empresaId: empresa.id,
      usuarioId: usuario.id,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
        createdAt: usuario.createdAt instanceof Date ? usuario.createdAt.toISOString() : String(usuario.createdAt),
      },
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre,
        nit: empresa.nit,
        plan: empresa.plan,
        createdAt: empresa.createdAt instanceof Date ? empresa.createdAt.toISOString() : String(empresa.createdAt),
      },
    };
  },

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await authRepository.findUserByEmail(dto.email);
    if (!user) {
      // Mensaje neutral para mitigar enumeración de usuarios
      throw new UnauthorizedError('CREDENCIALES_INVALIDAS', 'Correo electrónico o contraseña incorrectos');
    }

    const isPasswordValid = await verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('CREDENCIALES_INVALIDAS', 'Correo electrónico o contraseña incorrectos');
    }

    const empresa = await authRepository.findEmpresaById(user.empresaId);
    if (!empresa) {
      throw new UnauthorizedError('EMPRESA_NO_ENCONTRADA', 'La empresa asociada al usuario no fue encontrada');
    }

    const token = signJwt({
      usuarioId: user.id,
      empresaId: user.empresaId,
      rol: user.rol,
      email: user.email,
    });

    logger.info('Inicio de sesión exitoso', {
      usuarioId: user.id,
      empresaId: user.empresaId,
    });

    return {
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
      },
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre,
        nit: empresa.nit,
        plan: empresa.plan,
        createdAt: empresa.createdAt instanceof Date ? empresa.createdAt.toISOString() : String(empresa.createdAt),
      },
    };
  },

  async getMe(usuarioId: string): Promise<{ usuario: UserSummaryDto; empresa: EmpresaSummaryDto }> {
    const user = await authRepository.findUserById(usuarioId);
    if (!user) {
      throw new NotFoundError('USUARIO_NO_ENCONTRADO', 'El usuario solicitado no fue encontrado');
    }

    const empresa = await authRepository.findEmpresaById(user.empresaId);
    if (!empresa) {
      throw new NotFoundError('EMPRESA_NO_ENCONTRADA', 'La empresa asociada no fue encontrada');
    }

    return {
      usuario: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : String(user.createdAt),
      },
      empresa: {
        id: empresa.id,
        nombre: empresa.nombre,
        nit: empresa.nit,
        plan: empresa.plan,
        createdAt: empresa.createdAt instanceof Date ? empresa.createdAt.toISOString() : String(empresa.createdAt),
      },
    };
  },
};
