# Kithwork

Kithwork is an independent, local-first collaboration workspace for people using their own AI tools. The server does not run agents or ingest private AI chat history. The product name is set; the public license is still undecided.

## What works in this MVP

- Local email/password accounts and database-backed sessions.
- Rooms with owner/member roles and hashed invites that can be single-use or shared with up to 100 people; all expire after seven days and owners can revoke them.
- Room-scoped task lists with optimistic version checks (`409` on stale updates).
- Append-only knowledge content versions; only a room owner can append an approval for a specific version.
- PostgreSQL row-level security in addition to application authorization.
- MCP Streamable HTTP endpoint at `/api/mcp`, using Better Auth OAuth 2.1, PKCE, CIMD, resource-bound tokens and per-tool scopes.
- Durable room activity events.

This is a local MVP, not a production-verified service. The supplied development setup binds to loopback. A separate self-host deployment bundle is documented, but it has not been exercised on a live host. There is no outbound email delivery, agent scheduling, AI approval, file storage, realtime push, or tested third-party MCP client compatibility claim yet.

## Quick start: local PostgreSQL

Requirements: Node.js 22+, npm, PostgreSQL 16+ running locally, and permission to create a local database/roles. From the project root:

```sh
./scripts/setup-local-db.sh
cd apps/web
npm ci
npm run db:migrate
npm run dev
```

Open [http://localhost:3200](http://localhost:3200). Create an account and one shared room. The owner can create one invitation token for up to 100 people, share that same token privately, and revoke it at any time; each recipient signs up on the same instance and pastes the shared token into **Join room**. The token expires after seven days and is shown only once. Each member still uses their own account and OAuth identity.

The setup script creates separate local owner, migration and runtime PostgreSQL roles and writes generated credentials to the ignored `apps/web/.env.local`. It does not print the generated credentials. Keep that file private and do not use its local credentials on a public server.

## Backup and recovery (local PostgreSQL)

From `apps/web/`, create a private custom-format dump with `npm run db:backup`. By default the dump is written under the root `backups/` directory with owner-only file permissions; that directory is ignored by Git. You can pass a different output path after `--`.

To verify or recover a trusted dump, run `npm run db:restore -- ../../backups/<dump-name>.dump`. Restore always creates a new database named `agent_collab_hub_restore_...`; it never replaces the active database. The local PostgreSQL administrator must be able to create a database owned by `agent_hub_owner`. The command prints the new database name. To inspect the restored application, update only the database name in `DATABASE_URL` in `apps/web/.env.local`, keeping the `agent_hub_runtime` credentials; keep `MIGRATOR_DATABASE_URL` pointed at the same restored database for future migrations.

These commands require local PostgreSQL client tools (`pg_dump`, `pg_restore`, `createdb`, and `psql`) and apply only to the loopback PostgreSQL setup. Store dumps as private data and restore only backups you trust. Production Compose backup/restore instructions are in the self-host guide; they have not been run against a live Compose stack.

## Docker Compose setup

Requirements: Docker Engine with Compose. Copy `.env.example` to `.env`, replace all three secret placeholders with separate random hex values, then run:

```sh
docker compose up -d db
docker compose --profile tools run --rm migrate
docker compose up -d web
```

This is the local development stack: the web app binds to `127.0.0.1:3200` and PostgreSQL to `127.0.0.1:55432`. For public self-hosting, use `compose.production.yaml` and the [self-host guide](docs/guides/SELF_HOSTING.md); do not expose this local setup directly.

## Agent MCP connection

Use a client that supports MCP 2025-11-25 over stateless HTTP and OAuth authorization code with PKCE. The official TS SDK currently pinned in this project is v2.4.0; it does not yet advertise the newer 2026-07-28 transport revision. Configure the server URL as `http://localhost:3200/api/mcp`; the browser opens a local sign-in and explicit consent flow. Available tools are `list_rooms`, `list_tasks`, `create_task`, `update_task`, `list_knowledge`, `propose_knowledge`, `approve_knowledge`, and `get_recent_activity`. The same room membership and owner policies apply to web and MCP calls. The human must be a room member; the token must also contain the needed tool scope.

For local troubleshooting, check `/api/auth/.well-known/openid-configuration`, `/api/auth/jwks`, and `/.well-known/oauth-protected-resource`. Do not share OAuth tokens, invite tokens, `.env` files, or database passwords.

For friend-facing setup steps and a copy/paste prompt that puts each friend's agent in the same shared room, see [Connect agents to one shared MCP workspace](docs/guides/CONNECT_AGENT_TO_MCP.md). The guide distinguishes local-only development from the HTTPS server required by remote clients; real Claude and ChatGPT client compatibility is not yet claimed.

## Development commands

Run from `apps/web/`:

```sh
npm run dev          # loopback only, port 3200
npm run lint
npm run typecheck
npm run build
npm run db:generate -- --name describe-change
npm run db:migrate
npm run db:backup
npm run db:restore -- /path/to/trusted-backup.dump
```

Schema changes belong in Drizzle source plus a reviewed migration. `db:migrate` uses the production Drizzle ORM migrator and does not require the Drizzle Kit CLI. Schema generation and Studio install the pinned CLI and matching ORM into a temporary directory, then remove it when the command ends; the app dependency tree stays free of the CLI. Never edit a migration after it has been applied to a shared or non-disposable database; add a new migration instead.

## Architecture and status

- [Architecture decision](docs/architecture/ADR-0001-architecture-direction.md)
- [Living roadmap and acceptance gates](docs/plans/ROADMAP.md)
- [Self-host production deployment and recovery guide](docs/guides/SELF_HOSTING.md)
- [Open-source research and isolated Muster spike](docs/research/OPEN_SOURCE_LANDSCAPE.md)

Local availability is not evidence of public security readiness. The self-host bundle still needs a clean-server acceptance run, external-client OAuth/MCP compatibility checks, and tested offsite recovery before production use.
