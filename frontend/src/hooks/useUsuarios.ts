import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usuariosApi } from '@/api/usuarios.api';
import type {
  CrearUsuarioDTO,
  ListadoUsuariosResponse,
  RolUsuario,
  UsuarioGestionDto,
} from '@libredss/shared';

export const USUARIOS_QUERY_KEY = ['usuarios'] as const;

/** Listado de usuarios de la empresa (HU-28). */
export function useUsuarios() {
  return useQuery<ListadoUsuariosResponse>({
    queryKey: USUARIOS_QUERY_KEY,
    queryFn: () => usuariosApi.listar(),
    staleTime: 30_000,
  });
}

function useInvalidarUsuarios() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: USUARIOS_QUERY_KEY });
  };
}

/** Alta de usuario con rol acotado por empresa (HU-28). */
export function useCrearUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation<UsuarioGestionDto, unknown, CrearUsuarioDTO>({
    mutationFn: (dto) => usuariosApi.crear(dto),
    onSuccess: invalidar,
  });
}

/** Cambio de rol de un usuario (HU-28). */
export function useActualizarRolUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation<UsuarioGestionDto, unknown, { id: string; rol: RolUsuario }>({
    mutationFn: ({ id, rol }) => usuariosApi.actualizarRol(id, rol),
    onSuccess: invalidar,
  });
}

/** Eliminación de un usuario de la empresa (HU-28). */
export function useEliminarUsuario() {
  const invalidar = useInvalidarUsuarios();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => usuariosApi.eliminar(id),
    onSuccess: invalidar,
  });
}
