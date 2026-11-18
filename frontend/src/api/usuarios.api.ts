import { client } from './client';
import type {
  ActualizarRolDTO,
  CrearUsuarioDTO,
  ListadoUsuariosResponse,
  RolUsuario,
  UsuarioGestionDto,
} from '@libredss/shared';

/** Endpoints de gestión de usuarios y roles por empresa (HU-28). */
export const usuariosApi = {
  listar: () => client.get<ListadoUsuariosResponse>('/usuarios'),

  crear: (dto: CrearUsuarioDTO) => client.post<UsuarioGestionDto>('/usuarios', dto),

  actualizarRol: (id: string, rol: RolUsuario) =>
    client.put<UsuarioGestionDto>(`/usuarios/${id}/rol`, { rol } satisfies ActualizarRolDTO),

  eliminar: (id: string) => client.delete<void>(`/usuarios/${id}`),
};
