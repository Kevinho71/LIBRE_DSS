export type RolUsuario = 'administrador' | 'operador';

export interface UsuarioDto {
  id: string;
  nombre: string;
  email: string;
  rol: RolUsuario;
  createdAt: string;
}

export interface CrearUsuarioDto {
  nombre: string;
  email: string;
  password: string;
  rol: RolUsuario;
}

export interface ActualizarRolDto {
  rol: RolUsuario;
}
