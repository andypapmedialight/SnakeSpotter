#!/usr/bin/env bash
# Installed on the Droplet as /usr/local/bin/snakespotter-deploy-apply.sh (root, 755).
# Invoked by the deploy user via:
#   sudo /usr/local/bin/snakespotter-deploy-apply.sh /home/deploy/incoming-snakespotter
#
# Does NOT self-update from incoming-snakespotter (deploy→root RCE). Install a
# new copy manually as root after review:
#   install -m 755 -o root -g root \
#     /home/deploy/incoming-snakespotter/snakespotter-deploy-apply.sh \
#     /usr/local/bin/snakespotter-deploy-apply.sh
set -euo pipefail

_normalize_incoming_raw() {
  local raw="$1"
  raw="${raw//$'\r'/}"
  raw="${raw//$'\n'/}"
  raw="$(printf '%s' "$raw" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  printf '%s' "$raw"
}

_validate_incoming() {
  local raw="$1"
  if [[ -z "${raw}" || "${raw}" == *..* || "${raw}" != /* ]]; then
    echo "snakespotter-deploy-apply: refused INCOMING path '${raw}'" >&2
    exit 1
  fi
  if [[ ! -d "${raw}" ]]; then
    echo "snakespotter-deploy-apply: INCOMING is not a directory: ${raw}" >&2
    exit 1
  fi
  local resolved
  resolved="$(cd "${raw}" && pwd -P)"
  if [[ ! "${resolved}" =~ ^/home/[a-zA-Z0-9._-]+/incoming-snakespotter$ ]]; then
    echo "snakespotter-deploy-apply: INCOMING must resolve to /home/<user>/incoming-snakespotter (got ${resolved})" >&2
    exit 1
  fi
  INCOMING="${resolved}"
}

if [[ -n "${1:-}" ]]; then
  _validate_incoming "$(_normalize_incoming_raw "$1")"
else
  _validate_incoming "/home/deploy/incoming-snakespotter"
fi

SELF_INCOMING="${INCOMING}/snakespotter-deploy-apply.sh"
APPLY_BIN="/usr/local/bin/snakespotter-deploy-apply.sh"
if [[ "${EUID:-$(id -u)}" -eq 0 ]] && [[ -f "${SELF_INCOMING}" ]] && [[ -f "${APPLY_BIN}" ]]; then
  if ! cmp -s "${SELF_INCOMING}" "${APPLY_BIN}" 2>/dev/null; then
    echo "snakespotter-deploy-apply: WARNING: ${SELF_INCOMING} differs from ${APPLY_BIN}; not auto-updating (install manually as root)" >&2
  fi
fi

for f in requirements.txt app/main.py app/config.py app/db.py app/models.py app/area.py app/species.py app/admin.py; do
  if [[ ! -f "${INCOMING}/${f}" ]]; then
    echo "snakespotter-deploy-apply: missing ${INCOMING}/${f}" >&2
    exit 1
  fi
done
if [[ ! -d "${INCOMING}/static" ]] || [[ ! -d "${INCOMING}/templates" ]]; then
  echo "snakespotter-deploy-apply: missing static/ or templates/ in ${INCOMING}" >&2
  exit 1
fi

OPT=/opt/snakespotter
DATA=/var/lib/snakespotter
ENV_DIR=/etc/snakespotter
ENV_FILE="${ENV_DIR}/snakespotter.env"

if ! id -u snakespotter >/dev/null 2>&1; then
  useradd --system --home "${DATA}" --shell /usr/sbin/nologin --user-group snakespotter
fi

mkdir -p "${OPT}" "${DATA}" "${ENV_DIR}"
chown snakespotter:snakespotter "${DATA}"
chmod 750 "${DATA}"

_sighting_count() {
  local db="$1"
  if [[ ! -f "${db}" ]]; then
    echo 0
    return
  fi
  python3 - "${db}" <<'PY'
import sqlite3, sys
path = sys.argv[1]
try:
    conn = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
    print(conn.execute("SELECT COUNT(*) FROM sightings").fetchone()[0])
except Exception:
    print(0)
PY
}

_preserve_hub_db() {
  local opt_db="${OPT}/data/sightings.db"
  local hub_db="${DATA}/sightings.db"
  if [[ ! -f "${hub_db}" && -f "${opt_db}" ]]; then
    echo "snakespotter-deploy-apply: moving ${opt_db} -> ${hub_db}"
    cp -a "${opt_db}" "${hub_db}"
    for suffix in -wal -shm -journal; do
      if [[ -f "${opt_db}${suffix}" ]]; then
        cp -a "${opt_db}${suffix}" "${hub_db}${suffix}"
      fi
    done
    chown snakespotter:snakespotter "${hub_db}" "${hub_db}"-wal "${hub_db}"-shm "${hub_db}"-journal 2>/dev/null || true
  fi
}

_preserve_hub_db
SIGHTINGS_BEFORE="$(_sighting_count "${DATA}/sightings.db")"

_extract_env_value() {
  local file="$1"
  local key="$2"
  if [[ ! -f "${file}" ]]; then
    printf '%s' ""
    return
  fi
  awk -F= -v k="${key}" '
    $1==k { print substr($0, index($0,$2)); exit }
  ' "${file}" | tr -d '\r'
}

_write_runtime_env() {
  local incoming_env="${INCOMING}/private/snakespotter.env"
  local incoming_key existing_key incoming_admin existing_admin
  incoming_key="$(_extract_env_value "${incoming_env}" GOOGLE_MAPS_API_KEY)"
  existing_key="$(_extract_env_value "${ENV_FILE}" GOOGLE_MAPS_API_KEY)"
  incoming_admin="$(_extract_env_value "${incoming_env}" ADMIN_PASSWORD)"
  existing_admin="$(_extract_env_value "${ENV_FILE}" ADMIN_PASSWORD)"
  local maps_key="${incoming_key}"
  if [[ -z "${maps_key}" && -n "${existing_key}" ]]; then
    maps_key="${existing_key}"
  fi
  local admin_password="${incoming_admin}"
  if [[ -z "${admin_password}" && -n "${existing_admin}" ]]; then
    admin_password="${existing_admin}"
  fi
  umask 077
  {
    echo "HOST=127.0.0.1"
    echo "PORT=8075"
    echo "DATABASE_PATH=/var/lib/snakespotter/sightings.db"
    printf 'GOOGLE_MAPS_API_KEY=%s\n' "${maps_key}"
    printf 'ADMIN_PASSWORD=%s\n' "${admin_password}"
  } > "${ENV_FILE}"
  chmod 640 "${ENV_FILE}"
  chown root:snakespotter "${ENV_FILE}"
}
_write_runtime_env

_ensure_python_venv() {
  local pyver
  pyver="$(python3 -c 'import sys; print("%d.%d" % (sys.version_info.major, sys.version_info.minor))')"
  if python3 -c "import ensurepip" 2>/dev/null; then
    return 0
  fi
  echo "snakespotter-deploy-apply: installing python${pyver}-venv (ensurepip missing)"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y "python${pyver}-venv" python3-venv
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y "python${pyver}-venv" python3-venv
  else
    echo "snakespotter-deploy-apply: cannot install a python venv package" >&2
    exit 1
  fi
}

rsync -a --delete \
  --exclude venv \
  --exclude '.venv' \
  --exclude '.git' \
  --exclude '.github' \
  --exclude '.idea' \
  --exclude '.env' \
  --exclude '__pycache__' \
  --exclude '.pytest_cache' \
  --exclude 'data' \
  --exclude 'data/' \
  --exclude 'data/**' \
  --exclude 'private' \
  --filter 'P data/' \
  --filter 'P data/**' \
  "${INCOMING}/" "${OPT}/"

_ensure_python_venv
if [[ ! -x "${OPT}/venv/bin/python" ]] || [[ ! -x "${OPT}/venv/bin/pip" ]]; then
  rm -rf "${OPT}/venv"
  python3 -m venv "${OPT}/venv"
fi
"${OPT}/venv/bin/pip" install --upgrade pip
"${OPT}/venv/bin/pip" install -r "${OPT}/requirements.txt"

chown -R snakespotter:snakespotter "${OPT}"
chmod -R a+rX "${OPT}"

if [[ -f "${INCOMING}/snakespotter.service" ]]; then
  install -o root -g root -m 644 "${INCOMING}/snakespotter.service" /etc/systemd/system/snakespotter.service
elif [[ -f "${INCOMING}/scripts/droplet/snakespotter.service" ]]; then
  install -o root -g root -m 644 "${INCOMING}/scripts/droplet/snakespotter.service" /etc/systemd/system/snakespotter.service
fi

systemctl daemon-reload
systemctl enable snakespotter.service
systemctl restart snakespotter.service

health_ok=0
for _ in $(seq 1 20); do
  if curl -fsS --max-time 3 http://127.0.0.1:8075/health | grep -q '"ok"'; then
    health_ok=1
    break
  fi
  sleep 1
done
if [[ "${health_ok}" -ne 1 ]]; then
  echo "snakespotter-deploy-apply: loopback /health failed" >&2
  systemctl status snakespotter.service --no-pager >&2 || true
  journalctl -u snakespotter.service -n 40 --no-pager >&2 || true
  exit 1
fi

SIGHTINGS_AFTER="$(_sighting_count "${DATA}/sightings.db")"
if [[ "${SIGHTINGS_AFTER}" -lt "${SIGHTINGS_BEFORE}" ]]; then
  echo "snakespotter-deploy-apply: sightings dropped ${SIGHTINGS_BEFORE} -> ${SIGHTINGS_AFTER}" >&2
  exit 1
fi

echo "snakespotter-deploy-apply: OK (${SIGHTINGS_AFTER} sightings)"
