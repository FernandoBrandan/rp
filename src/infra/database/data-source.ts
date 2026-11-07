import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

const env = process.env.NODE_ENV || 'dev';
const envFile = env === 'dev' ? '.env.dev' : '.env.docker';
dotenv.config({ path: envFile });

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,

  entities: ['src/**/*.orm-entity.ts'],
  migrations: ['src/infra/database/migrations/*.ts'],

  synchronize: false,
  logging: process.env.DB_LOGGING === 'true',
});
