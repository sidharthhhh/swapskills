import mysql2, { Pool, PoolOptions, RowDataPacket, ResultSetHeader, OkPacket } from 'mysql2/promise';

type QueryParam = string | number | boolean | null | Buffer | Date;

const poolOptions: PoolOptions = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'swapskills',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

const pool: Pool = mysql2.createPool(poolOptions);

/**
 * Execute a parameterized SQL query against the connection pool.
 * Always use parameterized queries to prevent SQL injection.
 *
 * @param sql - The SQL query string with ? placeholders
 * @param params - Array of parameter values to bind
 * @returns The query result rows and fields
 */
async function query<T extends RowDataPacket[] | ResultSetHeader | OkPacket>(
  sql: string,
  params: QueryParam[] = []
): Promise<T> {
  const [results] = await pool.execute<T>(sql, params);
  return results;
}

export { pool, query };
export type { QueryParam };
