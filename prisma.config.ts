import "dotenv/config";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    // Migrations need a direct (non-pooled) connection.
    adapter: async () =>
      new PrismaPg({ connectionString: process.env.DIRECT_URL! }),
  },
});