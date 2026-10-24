import { cimd } from "@better-auth/cimd";
import { fetchClientMetadataResource } from "@better-auth/cimd/node";
import { mcp } from "@better-auth/mcp";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { nextCookies } from "better-auth/next-js";
import { jwt } from "better-auth/plugins";

import { db } from "@/db/client";
import * as authSchema from "@/db/auth-schema";

const baseURL = process.env.BETTER_AUTH_URL ?? "http://localhost:3200";
const mcpResource = process.env.MCP_RESOURCE_URL ?? `${baseURL}/api/mcp`;
const localDevelopment = process.env.NODE_ENV !== "production" && new URL(baseURL).hostname === "localhost";

export const auth = betterAuth({
  appName: "Kithwork",
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg", schema: authSchema }),
  emailAndPassword: { enabled: true },
  trustedOrigins: [baseURL],
  plugins: [
    jwt(),
    mcp({
      loginPage: "/sign-in",
      consentPage: "/consent",
      resource: mcpResource,
      scopes: ["mcp:read", "mcp:write", "knowledge:approve"],
      allowDynamicClientRegistration: localDevelopment,
      allowUnauthenticatedClientRegistration: localDevelopment,
      clientRegistrationDefaultApplicationType: "infer",
    }),
    cimd({ fetchClientMetadataResource, metadataProfile: "mcp-2026-07-28" }),
    nextCookies(),
  ],
});
