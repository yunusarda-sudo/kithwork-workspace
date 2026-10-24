#!/bin/sh
set -eu

cd "$(dirname "$0")/.."
WEB_ENV="apps/web/.env.local"
if [ -e "$WEB_ENV" ]; then
  printf '%s\n' "$WEB_ENV already exists; keep it and skip local database provisioning."
  exit 1
fi

command -v psql >/dev/null || { echo "Install PostgreSQL client tools first." >&2; exit 1; }
runtime_pw=$(openssl rand -hex 24)
migrator_pw=$(openssl rand -hex 24)
auth_secret=$(openssl rand -hex 32)

psql postgres --set ON_ERROR_STOP=1 --set runtime_pw="$runtime_pw" --set migrator_pw="$migrator_pw" <<'SQL'
CREATE ROLE agent_hub_owner NOLOGIN;
SELECT format('CREATE ROLE agent_hub_migrator LOGIN PASSWORD %L', :'migrator_pw') \gexec
GRANT agent_hub_owner TO agent_hub_migrator;
SELECT format('CREATE ROLE agent_hub_runtime LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', :'runtime_pw') \gexec
SQL

createdb --owner=agent_hub_owner agent_collab_hub
psql --dbname=agent_collab_hub --set ON_ERROR_STOP=1 <<'SQL'
ALTER ROLE agent_hub_migrator IN DATABASE agent_collab_hub SET role TO agent_hub_owner;
GRANT CONNECT ON DATABASE agent_collab_hub TO agent_hub_runtime;
GRANT USAGE ON SCHEMA public TO agent_hub_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_hub_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO agent_hub_runtime;
SQL

mkdir -p "$(dirname "$WEB_ENV")"
cat > "$WEB_ENV" <<EOF
DATABASE_URL=postgresql://agent_hub_runtime:${runtime_pw}@127.0.0.1:5432/agent_collab_hub
MIGRATOR_DATABASE_URL=postgresql://agent_hub_migrator:${migrator_pw}@127.0.0.1:5432/agent_collab_hub
BETTER_AUTH_URL=http://localhost:3200
BETTER_AUTH_SECRET=${auth_secret}
MCP_RESOURCE_URL=http://localhost:3200/api/mcp
EOF
chmod 600 "$WEB_ENV"
echo "Local database and ignored app environment created. Next: cd apps/web && npm run db:migrate && npm run dev"
