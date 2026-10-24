# Kithwork self-hosting on a Linux server

This deployment bundle is for a single Linux server running Docker Engine and the Docker Compose plugin. It keeps PostgreSQL private, serves the app only through Caddy, obtains and renews public TLS certificates automatically, and stores database and certificate state in named volumes.

The production database image is PostgreSQL 18; its persistent volume is mounted at `/var/lib/postgresql`, as required by the official image's versioned data directory layout. Keep the database major version pinned during routine app updates; a PostgreSQL major upgrade needs its own backup and upgrade procedure.

## What you need

- A Linux server with a public IP, Docker Engine, the Docker Compose plugin, and `openssl`.
- A DNS hostname whose `A` record (and `AAAA` record, if present) points to that server. Remove a stale `AAAA` record rather than leaving it pointed elsewhere.
- Inbound TCP ports 80 and 443 allowed by both the host firewall and server provider. UDP 443 is optional and enables HTTP/3.
- This repository checked out on the server.
- Enough Docker memory headroom to build the Node/Next.js image while the database and other host services are running. A minimum has not yet been measured for this project; verify the first build on the intended Linux host before pointing public DNS at it.

No cloud account or server is provisioned by this project. The server owner remains responsible for operating-system updates, firewall policy, access control, monitoring, and an offsite copy of backups.

## First deployment

From the repository root on the Linux host:

If you plan to install the systemd backup timer, place the production checkout at `/opt/agent-collab-hub` (or another root-controlled path under `/srv`) before this step and run these commands as root. Later code updates must also be performed by an administrator. For manual deployment without the timer, use an account with Docker Engine access and private ownership of `.env.production`.

```sh
sudo scripts/production-setup.sh
sudoedit .env.production
sudo scripts/deploy-production.sh
sudo docker compose --env-file .env.production -f compose.production.yaml ps
```

Setup creates `.env.production` with distinct random database passwords and an auth secret, using owner-only file permissions. Set `PUBLIC_DOMAIN` to your real DNS name. Keep this file private; do not commit or send it to other agents or users.

After DNS points to the server and ports 80/443 are reachable, start the stack:

```sh
scripts/deploy-production.sh
docker compose --env-file .env.production -f compose.production.yaml ps
```

On a systemd Linux host using the rootful Docker Engine, the optional daily local backup timer runs as root. Install the checkout under `/opt` or `/srv`; every checkout file and directory must be root-owned and not group/world-writable, and `.env.production` must have mode `0600` or stricter. This prevents a root timer from executing code writable by an unprivileged account. The installer validates rendered units with `systemd-analyze`, checks effective properties after reload, and only replaces unit files carrying its own management marker. Keep this checkout and its parent directories administrator-controlled after installation.

```sh
sudo scripts/install-backup-timer.sh
systemctl list-timers agent-collab-hub-backup.timer
```

It runs the private dump command daily around 03:00 with a randomized delay and keeps matching local dump files for 30 days. Backups from the timer are stored in `/var/lib/agent-collab-hub-backup`, outside the code checkout, with directory mode `0700`, file mode `0600`, a SHA-256 sidecar, and JSON metadata. The unit uses systemd filesystem and kernel hardening, but it needs access to the rootful Docker socket to run Compose; Docker access is a privileged host boundary and is not made safe by filesystem sandboxing. The installer requires the checkout path to contain only letters, digits, dot, underscore, slash or hyphen. To remove the timer later, stop/disable it and remove only `agent-collab-hub-backup.service` and `.timer` from `/etc/systemd/system`, then run `systemctl daemon-reload`.

Caddy requests a publicly trusted certificate and redirects HTTP to HTTPS. The first certificate request requires public DNS to resolve to this host and TCP port 80 or 443 to reach Caddy. Caddy certificate state is persisted in `caddy_data` and must be kept across restarts. PostgreSQL has no published host port; only Caddy publishes 80/443. Do not add a database port mapping to the public host.

The app's auth callback/origin and MCP protected-resource URL are derived from the same `PUBLIC_DOMAIN`. If the hostname changes, update the DNS first, change `PUBLIC_DOMAIN`, then recreate the web and Caddy services. OAuth clients must be configured for the resulting HTTPS origin.

## Routine operation

Inspect service health and logs:

```sh
docker compose --env-file .env.production -f compose.production.yaml ps
docker compose --env-file .env.production -f compose.production.yaml logs --tail=100 web caddy db
```

Compose, web servisini `/api/healthz` üzerinden PostgreSQL bağlantısıyla kontrol eder ve web sağlıklı olana kadar Caddy'yi başlatmaz. Bu endpoint uygulama veya veritabanı hazır değilken `503` döndürür; yanıt gövdesi hata ayrıntısı içermez.

For an application update, take a backup, update the checkout to the reviewed release, rebuild and migrate, then restart the app/proxy:

```sh
scripts/backup-production.sh
git checkout <reviewed-release>
docker compose --env-file .env.production -f compose.production.yaml build web
docker compose --env-file .env.production -f compose.production.yaml --profile tools run --build --rm migrate
docker compose --env-file .env.production -f compose.production.yaml up -d web caddy
```

Never edit an already applied migration. Keep the previous reviewed source revision available so the application can be rolled back if an update fails. A schema migration may not be reversible by running older code; take and verify a backup before upgrades that change schema.

## Database backup and restore

Create an owner-only custom-format dump under `backups/production/` (manual runs use this directory; the systemd timer uses `/var/lib/agent-collab-hub-backup`):

```sh
scripts/backup-production.sh
```

The script validates that PostgreSQL can read the completed custom-format archive before publishing it, then writes a SHA-256 checksum and metadata sidecar. The directory is ignored by Git. The daily timer removes only matching `agent-collab-hub-*.dump` files older than its configured retention after a successful new dump; manual runs default to 30 days and accept `BACKUP_RETENTION_DAYS` from 1 to 3650. Copy backups to a separate, access-controlled storage location for host-loss recovery; a backup stored only on the same server is not disaster recovery. Establish and test offsite retention separately.

Restore a trusted dump into a new database without replacing the active database:

```sh
scripts/restore-production.sh backups/production/<backup-file>.dump
```

The script verifies the checksum sidecar and fully reads the archive before creating a target. It then restores as one transaction into a new database in the same PostgreSQL cluster. This protects the active database from replacement, but it is not an isolated-host recovery test; validate disaster recovery separately on a disposable host or isolated PostgreSQL instance. If restore fails or is interrupted, the script removes only that generated restore database; if cleanup cannot reach PostgreSQL, it prints the target name for manual inspection. A legacy dump without a checksum sidecar requires the explicit `--allow-unverified-legacy` option and must be trusted independently. On success, the script prints a new database name. To switch the app for inspection, first record the active `APP_DB_NAME`, stop the app, set `APP_DB_NAME` to the restored database in `.env.production`, then run:

```sh
docker compose --env-file .env.production -f compose.production.yaml up -d web
```

The restored schema should use the release version that created the backup. To roll back, stop the app and restore the recorded `APP_DB_NAME`. Do not delete the original database until the restored copy has been checked and a separate backup exists.

The backup script reads `APP_DB_NAME` from `.env.production` and passes it explicitly to `pg_dump`. This keeps backups pointed at the database the app is configured to use, even if the running PostgreSQL container still has its original `POSTGRES_DB` environment value after a restore switch.

### Cluster roles and a host-loss restore

`pg_dump` contains one database only; it does not include cluster-wide roles, role memberships, or other global objects. A fresh Kithwork Compose database volume runs `infra/postgres/production-init.sh`, which creates the bootstrap, owner, migrator, and runtime roles from `.env.production`. For this project's current role set, recover those roles from that reviewed init procedure and restore the database dump into the new cluster. Keep the matching password values in the separate secure `.env.production` recovery copy; the database dump does not contain them.

If operators add cluster-wide roles or settings outside that init procedure, capture them separately with `pg_dumpall --globals-only --no-role-passwords --username=agent_hub_bootstrap` and store the output encrypted with the offsite recovery set. This command was not exercised by the current automated backup path. Review globals before replaying them into a clean cluster because the standard init script may already have created roles with the same names. `--no-role-passwords` deliberately leaves password recovery to the secret store and planned credential rotation. The project does not yet automate a globals artifact or offsite copy.

Keep each `.dump`, `.dump.sha256`, and `.dump.json` together when copying a recovery point. Verify the sidecar on the destination before treating the copy as usable, and periodically restore from that separate location on an isolated host. The timer currently provides only local daily backups; no backup freshness alert or RPO/RTO target is configured. `journalctl -u agent-collab-hub-backup.service` shows local service results, but an external monitor must alert on missed/failed runs and stale backup age before production onboarding.

## Secret and access management

- `.env.production` and backup files contain sensitive material; retain their restrictive file permissions and host access controls.
- The bootstrap database account is used only by PostgreSQL initialization and operator backup/restore commands. The app receives only its restricted runtime role; migration commands receive the separate migration role.
- Docker administrators can inspect container configuration and environment. Treat server/Docker access as privileged.
- The init script runs only when PostgreSQL initializes an empty volume. Changing a password in `.env.production` does not rotate the corresponding existing database role; rotate the role in PostgreSQL and update its matching environment value in a planned maintenance window.
- No outbound email provider, offsite backup service, monitoring stack, or high-availability database is configured here.

## Recovery boundary

`docker compose down` preserves named volumes. **Do not** use `docker compose down -v` for routine maintenance; that deletes PostgreSQL and Caddy state. If the server is lost, provision a replacement host, restore `.env.production` from a secure copy, install this repository and Docker, restore the database dump into a new database, point DNS to the replacement, then start the stack. Keep the previous host untouched until recovery is confirmed when it is still available.

This bundle has not been deployed to a public server in this task. Complete the first deployment on a disposable host and verify signup, login, MCP OAuth, invite access, backup, and restore before onboarding real users.

## Isolated backup and systemd acceptance

On 2026-10-25, the actual production backup and restore scripts were exercised in a disposable Fedora CoreOS 44 VM with systemd, an isolated Docker Engine 29.9.2, Docker Compose 5.6.0, and PostgreSQL 18.6. The 58,677,776-byte custom dump restored into a separate database; the fixture's extension, tables, row counts, constraints, indexes, sequence state, and selected payload hashes matched. One warmed restore measured 9 seconds on this 2-vCPU/2-GiB VM. That fixture timing is not a production RTO.

The same VM accepted the installed timer and service, a manually triggered backup, repeated installer runs, a rejected writable checkout path, and a reboot with Docker and the timer enabled. Failure checks covered a stopped database, unreachable Docker socket, wrong checksum, truncated archive, interrupted `pg_dump`, interrupted `pg_restore`, backup lock contention, and a constrained output-file size. Seeded valid dumps survived failed-generation tests; lock contention rejected the second run without publishing an artifact; interrupted restore removed only its generated target and left the active database intact. Successful age-based retention removed an expired fixture dump only after publishing a new verified archive. The timer's next daily wall-clock firing was not awaited, no offsite destination was configured, and these results are isolated staging evidence only. Production cutover, off-host recovery, backup freshness alerting, and a production RPO/RTO remain unverified.
