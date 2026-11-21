import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Client } from 'pg';

// Ejecutor de migraciones SQL.
// Aplica backend/db/migrations/*.sql en orden alfabético, cada una en su propia
// transacción, y registra nombre + checksum en schema_migrations.
// Es idempotente: las ya aplicadas se omiten, y si una ya aplicada fue
// modificada se aborta (las migraciones aplicadas no se editan).

const MIGRATIONS_DIR = process.env.MIGRATIONS_DIR
  ? resolve(process.env.MIGRATIONS_DIR)
  : resolve(__dirname, '../../db/migrations');

// Clave fija para que dos instancias no migren a la vez.
const ADVISORY_LOCK_KEY = 727001;

const sha256 = (texto: string) => createHash('sha256').update(texto).digest('hex');

export async function migrate(databaseUrl: string): Promise<string[]> {
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  const aplicadasAhora: string[] = [];

  try {
    await client.query('SELECT pg_advisory_lock($1)', [ADVISORY_LOCK_KEY]);

    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        nombre      text        PRIMARY KEY,
        checksum    text        NOT NULL,
        aplicada_en timestamptz NOT NULL DEFAULT now()
      )
    `);

    const { rows } = await client.query<{ nombre: string; checksum: string }>(
      'SELECT nombre, checksum FROM schema_migrations',
    );
    const yaAplicadas = new Map(rows.map((r) => [r.nombre, r.checksum]));

    const archivos = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const archivo of archivos) {
      const sql = await readFile(join(MIGRATIONS_DIR, archivo), 'utf8');
      const checksum = sha256(sql);
      const previo = yaAplicadas.get(archivo);

      if (previo !== undefined) {
        if (previo !== checksum) {
          throw new Error(
            `La migración ${archivo} ya fue aplicada y su contenido cambió. Crea una migración nueva en lugar de editarla.`,
          );
        }
        continue;
      }

      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (nombre, checksum) VALUES ($1, $2)',
          [archivo, checksum],
        );
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(`Falló la migración ${archivo}: ${(error as Error).message}`);
      }
      aplicadasAhora.push(archivo);
      console.log(`[migrate] aplicada ${archivo}`);
    }

    if (aplicadasAhora.length === 0) {
      console.log('[migrate] base de datos al día');
    }
    return aplicadasAhora;
  } finally {
    await client.query('SELECT pg_advisory_unlock($1)', [ADVISORY_LOCK_KEY]).catch(() => undefined);
    await client.end();
  }
}

if (require.main === module) {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('[migrate] falta la variable DATABASE_URL');
    process.exit(1);
  }
  migrate(url).catch((error) => {
    console.error(`[migrate] ${(error as Error).message}`);
    process.exit(1);
  });
}
