#!/bin/sh
set -eu

: "${MIGRATOR_DB_PASSWORD:?MIGRATOR_DB_PASSWORD is required}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set ON_ERROR_STOP=1 \
  --set db_name="$POSTGRES_DB" \
  --set migrator_password="$MIGRATOR_DB_PASSWORD" \
  --set app_password="$APP_DB_PASSWORD" <<'SQL'
CREATE ROLE agent_hub_owner NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
SELECT format('CREATE ROLE agent_hub_migrator LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', :'migrator_password') \gexec
SELECT format('CREATE ROLE agent_hub_runtime LOGIN PASSWORD %L NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT', :'app_password') \gexec
GRANT agent_hub_owner TO agent_hub_migrator;
SELECT format('ALTER DATABASE %I OWNER TO agent_hub_owner', :'db_name') \gexec
SELECT format('GRANT CONNECT ON DATABASE %I TO agent_hub_migrator, agent_hub_runtime', :'db_name') \gexec
SELECT format('ALTER ROLE agent_hub_migrator IN DATABASE %I SET role TO agent_hub_owner', :'db_name') \gexec
GRANT USAGE, CREATE ON SCHEMA public TO agent_hub_owner;
GRANT USAGE ON SCHEMA public TO agent_hub_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO agent_hub_runtime;
ALTER DEFAULT PRIVILEGES FOR ROLE agent_hub_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO agent_hub_runtime;
SQL
