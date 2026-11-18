import { db } from '../../db/client';
import { usuarios } from '../../db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { RolUsuario } from './usuarios.types';

export interface CrearUsuarioRepoInput {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: RolUsuario;
}

export const usuariosRepository = {
  async findByEmail(email: string): Promise<typeof usuarios.$inferSelect | null> {
    const rows = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);

    return rows[0] ?? null;
  },

  async findById(empresaId: string, id: string): Promise<typeof usuarios.$inferSelect | null> {
    const rows = await db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.empresaId, empresaId), eq(usuarios.id, id)))
      .limit(1);

    return rows[0] ?? null;
  },

  async listar(empresaId: string): Promise<typeof usuarios.$inferSelect[]> {
    return db
      .select()
      .from(usuarios)
      .where(eq(usuarios.empresaId, empresaId))
      .orderBy(usuarios.createdAt);
  },

  async countAdministradores(empresaId: string): Promise<number> {
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usuarios)
      .where(and(eq(usuarios.empresaId, empresaId), eq(usuarios.rol, 'administrador')));

    return rows[0]?.count ?? 0;
  },

  async crear(empresaId: string, data: CrearUsuarioRepoInput): Promise<typeof usuarios.$inferSelect> {
    const [row] = await db
      .insert(usuarios)
      .values({
        empresaId,
        nombre: data.nombre,
        email: data.email,
        passwordHash: data.passwordHash,
        rol: data.rol,
      })
      .returning();

    return row;
  },

  async actualizarRol(empresaId: string, id: string, rol: RolUsuario): Promise<typeof usuarios.$inferSelect | null> {
    const [updated] = await db
      .update(usuarios)
      .set({ rol })
      .where(and(eq(usuarios.empresaId, empresaId), eq(usuarios.id, id)))
      .returning();

    return updated ?? null;
  },

  async eliminar(empresaId: string, id: string): Promise<boolean> {
    const result = await db
      .delete(usuarios)
      .where(and(eq(usuarios.empresaId, empresaId), eq(usuarios.id, id)))
      .returning({ id: usuarios.id });

    return result.length > 0;
  },
};
