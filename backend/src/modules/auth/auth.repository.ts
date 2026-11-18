import { db } from '../../db/client';
import { empresas, usuarios } from '../../db/schema';
import { eq } from 'drizzle-orm';

export interface CreateEmpresaRepoInput {
  nombre: string;
  nit?: string | null;
  plan: string;
}

export interface CreateUsuarioRepoInput {
  nombre: string;
  email: string;
  passwordHash: string;
  rol: string;
}

export const authRepository = {
  async findUserByEmail(email: string): Promise<typeof usuarios.$inferSelect | null> {
    const rows = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, email))
      .limit(1);

    return rows[0] ?? null;
  },

  async findUserById(id: string): Promise<typeof usuarios.$inferSelect | null> {
    const rows = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .limit(1);

    return rows[0] ?? null;
  },

  async findEmpresaById(id: string): Promise<typeof empresas.$inferSelect | null> {
    const rows = await db
      .select()
      .from(empresas)
      .where(eq(empresas.id, id))
      .limit(1);

    return rows[0] ?? null;
  },

  async createEmpresaAndAdmin(empresaData: CreateEmpresaRepoInput, userData: CreateUsuarioRepoInput) {
    return db.transaction(async (tx) => {
      const [nuevaEmpresa] = await tx
        .insert(empresas)
        .values({
          nombre: empresaData.nombre,
          nit: empresaData.nit ?? null,
          plan: empresaData.plan,
        })
        .returning();

      const [nuevoUsuario] = await tx
        .insert(usuarios)
        .values({
          empresaId: nuevaEmpresa.id,
          nombre: userData.nombre,
          email: userData.email,
          passwordHash: userData.passwordHash,
          rol: userData.rol,
        })
        .returning();

      return {
        empresa: nuevaEmpresa,
        usuario: nuevoUsuario,
      };
    });
  },
};
