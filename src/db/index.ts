import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.ts';
import * as dotenv from 'dotenv';

dotenv.config();

const getPoolConfig = () => {
  if (process.env.DATABASE_URL) {
    const url = process.env.DATABASE_URL;
    const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
    console.log(`🔌 DB: Using DATABASE_URL: ${maskedUrl}`);
    return {
      connectionString: url,
      connectionTimeoutMillis: 15000,
    };
  }
  console.log(`🔌 DB: Using SQL_HOST: ${process.env.SQL_HOST}, DB: ${process.env.SQL_DB_NAME}, User: ${process.env.SQL_USER}`);
  return {
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    connectionTimeoutMillis: 15000,
  };
};

export const createPool = () => {
  return new Pool(getPoolConfig());
};

const pool = createPool();

pool.on('error', (err) => {
  console.error('Unexpected error on idle SQL pool client:', err);
});

export const db = drizzle(pool, { schema });
