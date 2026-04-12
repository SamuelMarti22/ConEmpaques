import { defineConfig } from "prisma/config";
import env from "./src/config/env.js";

export default defineConfig({
	schema: "./src/databases/prisma/schema.prisma",
	migrations: {
		path: "./src/databases/prisma/migrations",
	},
	datasource: {
		url: env.DATABASE_URL as string,
	},
});
