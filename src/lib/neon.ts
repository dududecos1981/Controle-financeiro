import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

const databaseUrl = import.meta.env.VITE_NEON_DATABASE_URL || '';

let sqlClient: NeonQueryFunction<false, false> | null = null;

export function getDb() {
  if (!sqlClient) {
    if (!databaseUrl) {
      console.warn('VITE_NEON_DATABASE_URL não configurada no ambiente.');
    }
    sqlClient = neon(databaseUrl);
  }
  return sqlClient;
}

/**
 * Helper to set RLS context for authenticated operations
 */
export async function withUserContext(userId: string) {
  const sql = getDb();
  await sql`SELECT set_config('app.current_user_id', ${userId}, true);`;
}
