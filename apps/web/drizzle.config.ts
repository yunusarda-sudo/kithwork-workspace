import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const config = {
  schema: "./src/db/**/*.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.MIGRATOR_DATABASE_URL ?? process.env.DATABASE_URL! },
};

export default config;
