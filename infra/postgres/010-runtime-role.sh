#!/bin/sh
set -eu

: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 --set app_password="$APP_DB_PASSWORD" <<'SQL'
SELECT format('CREATE ROLE agent_hub_runtime LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', :'app_password') \gexec
GRANT CONNECT ON DATABASE agent_collab_hub TO agent_hub_runtime;
GRANT USAGE ON SCHEMA public TO agent_hub_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_migrator IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_hub_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_migrator IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO agent_hub_runtime;
SQL
