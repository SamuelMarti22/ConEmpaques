import  env from "./env.js";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "../databases/prisma/schema.prisma",
  migrations: {
    path: "../databases/prisma/migrations",
  },
  datasource: {
    url: env.DATABASE_URL as string,
  },
});

