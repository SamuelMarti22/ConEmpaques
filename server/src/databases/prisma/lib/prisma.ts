import env from '../../../config/env.js';
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaMariaDb({
  host: env.DATABASE_HOST as string,
  port: Number(env.DATABASE_PORT),
  user: env.DATABASE_USER as string,
  password: env.DATABASE_PASSWORD as string,
  database: env.DATABASE_NAME as string,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

export { prisma };