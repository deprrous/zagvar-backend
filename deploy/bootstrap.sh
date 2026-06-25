#!/usr/bin/env bash
#
# One-time, idempotent provisioning for the Zagvar production droplet
# (fresh Ubuntu 24.04). Safe to re-run. Run as root:
#
#   bash bootstrap.sh
#
# It installs Docker, native PostgreSQL 16, nginx, certbot and ufw; creates the
# zagvar database/role; wires Postgres to accept connections from the docker
# bridge only; creates a `deploy` user + app dir; and opens the firewall.
#
# It does NOT write the app .env (secrets) or issue TLS certs — those are
# separate, deliberate steps documented at the end of the run.

set -euo pipefail

APP_USER="${APP_USER:-deploy}"
APP_DIR="${APP_DIR:-/opt/zagvar/app}"
DB_NAME="${DB_NAME:-zagvar}"
DB_USER="${DB_USER:-zagvar}"
DOCKER_BRIDGE_CIDR="172.16.0.0/12"

log() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root." >&2
  exit 1
fi

# ---------------------------------------------------------------------------
log "Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y ca-certificates curl gnupg lsb-release ufw nginx \
  postgresql-16 postgresql-client-16 certbot python3-certbot-nginx openssl

# ---------------------------------------------------------------------------
log "Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi
systemctl enable --now docker

# ---------------------------------------------------------------------------
log "Deploy user: ${APP_USER}"
if ! id "${APP_USER}" >/dev/null 2>&1; then
  useradd --create-home --shell /bin/bash "${APP_USER}"
fi
usermod -aG docker "${APP_USER}"
install -d -o "${APP_USER}" -g "${APP_USER}" "${APP_DIR}"
install -d -o "${APP_USER}" -g "${APP_USER}" "/home/${APP_USER}/.ssh"
chmod 700 "/home/${APP_USER}/.ssh"
touch "/home/${APP_USER}/.ssh/authorized_keys"
chmod 600 "/home/${APP_USER}/.ssh/authorized_keys"
chown "${APP_USER}:${APP_USER}" "/home/${APP_USER}/.ssh/authorized_keys"

# ---------------------------------------------------------------------------
log "PostgreSQL: listen on localhost + docker bridge"
PG_CONF="$(sudo -u postgres psql -tAc 'SHOW config_file;')"
PG_HBA="$(sudo -u postgres psql -tAc 'SHOW hba_file;')"
PG_DIR="$(dirname "${PG_CONF}")"
DROPIN="${PG_DIR}/conf.d/zagvar.conf"
mkdir -p "${PG_DIR}/conf.d"
grep -q "include_dir = 'conf.d'" "${PG_CONF}" || echo "include_dir = 'conf.d'" >> "${PG_CONF}"
# 172.17.0.1 is the default docker0 gateway the api container talks to.
cat > "${DROPIN}" <<'EOF'
listen_addresses = 'localhost,172.17.0.1'
password_encryption = scram-sha-256
EOF
# Allow scram auth from the docker bridge only.
HBA_LINE="host    ${DB_NAME}    ${DB_USER}    ${DOCKER_BRIDGE_CIDR}    scram-sha-256"
grep -qF "${HBA_LINE}" "${PG_HBA}" || echo "${HBA_LINE}" >> "${PG_HBA}"
systemctl enable postgresql
systemctl restart postgresql

# ---------------------------------------------------------------------------
log "PostgreSQL: database + role"
# Password is generated if the role does not exist yet; printed once below.
DB_PASSWORD=""
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}';" | grep -q 1; then
  DB_PASSWORD="$(openssl rand -base64 24 | tr -d '/+=')"
  sudo -u postgres psql -c "CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASSWORD}';"
fi
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}';" | grep -q 1; then
  sudo -u postgres createdb -O "${DB_USER}" "${DB_NAME}"
fi
# gen_random_uuid() lives in pgcrypto (used by the Prisma schema defaults).
sudo -u postgres psql -d "${DB_NAME}" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# ---------------------------------------------------------------------------
log "nginx vhosts (HTTP first; certbot adds TLS later)"
NGINX_SRC="$(cd "$(dirname "$0")" && pwd)/nginx"
if [[ -d "${NGINX_SRC}" ]]; then
  # The Cloudflare real-IP file is a reusable snippet, not a vhost.
  mkdir -p /etc/nginx/snippets
  cp "${NGINX_SRC}/cloudflare-realip.conf" /etc/nginx/snippets/cloudflare-realip.conf
  for conf in "${NGINX_SRC}"/*.zagvar.com.conf; do
    cp "${conf}" "/etc/nginx/sites-available/$(basename "${conf}")"
    ln -sf "/etc/nginx/sites-available/$(basename "${conf}")" \
      "/etc/nginx/sites-enabled/$(basename "${conf}")"
  done
  rm -f /etc/nginx/sites-enabled/default
  install -d -o www-data -g www-data /var/www/zagvar
  nginx -t && systemctl reload nginx
fi
systemctl enable nginx

# ---------------------------------------------------------------------------
log "Firewall"
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# ---------------------------------------------------------------------------
log "Done. Next steps:"
cat <<EOF

  1. Add the CI deploy public key to /home/${APP_USER}/.ssh/authorized_keys
  2. Create ${APP_DIR}/.env from .env.production.example (fill secrets).
EOF
if [[ -n "${DB_PASSWORD}" ]]; then
  echo "     >>> Generated DB password for role '${DB_USER}': ${DB_PASSWORD}"
  echo "         Put it in DATABASE_URL. It will NOT be shown again."
else
  echo "     (DB role already existed — reuse the existing password.)"
fi
cat <<EOF
  3. Copy docker-compose.prod.yml into ${APP_DIR}/ and run:
       cd ${APP_DIR} && docker compose -f docker-compose.prod.yml up -d
  4. Seed the super admin once:
       docker compose -f docker-compose.prod.yml exec api npm run db:seed
  5. Once DNS A records point here, issue TLS:
       certbot --nginx -d api.stil.mn -d zagvar.com -d www.zagvar.com
EOF
