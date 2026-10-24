FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# Better Auth validates config during static generation. This placeholder exists only in this stage.
RUN BETTER_AUTH_SECRET=build-only-placeholder-secret-00000000000000000000000000000000 \
    BETTER_AUTH_URL=http://localhost:3200 \
    MCP_RESOURCE_URL=http://localhost:3200/api/mcp \
    npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app ./
RUN npm prune --omit=dev
USER node
EXPOSE 3200
CMD ["npm", "run", "start:container"]
