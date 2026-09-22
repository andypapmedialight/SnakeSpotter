#!/usr/bin/env bash
# One-time Droplet bootstrap for SnakeSpotter. Run as root.
# Does not deploy the app — that is GitHub Actions on main +
# snakespotter-deploy-apply.sh.
#
# Prefer sourcing this script from GitHub, not a laptop working copy:
#   git clone --depth 1 --branch main \
#     https://github.com/andypapmedialight/SnakeSpotter.git /tmp/SnakeSpotter
#   /tmp/SnakeSpotter/scripts/droplet/bootstrap-snakespotter.sh \
#     /tmp/SnakeSpotter/scripts/droplet/snakespotter-deploy-apply.sh \
#     /tmp/SnakeSpotter/scripts/droplet/snakespotter.service
set -euo pipefail

if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
  echo "bootstrap-snakespotter: run as root" >&2
  exit 1
fi

DATA=/var/lib/snakespotter
APPLY_SRC="${1:-/tmp/snakespotter-deploy-apply.sh}"
SERVICE_SRC="${2:-/tmp/snakespotter.service}"

if ! id -u snakespotter >/dev/null 2>&1; then
  useradd --system --home "${DATA}" --shell /usr/sbin/nologin --user-group snakespotter
fi

mkdir -p /opt/snakespotter "${DATA}" /etc/snakespotter /home/deploy/incoming-snakespotter
chown deploy:deploy /home/deploy/incoming-snakespotter
chown snakespotter:snakespotter "${DATA}"
chmod 750 "${DATA}"

pyver="$(python3 -c 'import sys; print("%d.%d" % (sys.version_info.major, sys.version_info.minor))')"
if ! python3 -c "import ensurepip" 2>/dev/null; then
  echo "bootstrap-snakespotter: installing python${pyver}-venv"
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -qq
    DEBIAN_FRONTEND=noninteractive apt-get install -y "python${pyver}-venv" python3-venv
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y "python${pyver}-venv" python3-venv
  fi
fi

if [[ ! -f /etc/snakespotter/snakespotter.env ]]; then
  cat > /etc/snakespotter/snakespotter.env <<'EOF'
HOST=127.0.0.1
PORT=8075
DATABASE_PATH=/var/lib/snakespotter/sightings.db
GOOGLE_MAPS_API_KEY=
EOF
  chmod 640 /etc/snakespotter/snakespotter.env
  chown root:snakespotter /etc/snakespotter/snakespotter.env
fi

if [[ -f "${APPLY_SRC}" ]]; then
  install -o root -g root -m 755 "${APPLY_SRC}" /usr/local/bin/snakespotter-deploy-apply.sh
else
  echo "bootstrap-snakespotter: ${APPLY_SRC} missing" >&2
  exit 1
fi

if [[ -f "${SERVICE_SRC}" ]]; then
  install -o root -g root -m 644 "${SERVICE_SRC}" /etc/systemd/system/snakespotter.service
  systemctl daemon-reload
fi

tee /etc/sudoers.d/deploy-snakespotter >/dev/null <<'EOF'
deploy ALL=(root) NOPASSWD: /usr/local/bin/snakespotter-deploy-apply.sh
EOF
chmod 440 /etc/sudoers.d/deploy-snakespotter
visudo -cf /etc/sudoers.d/deploy-snakespotter

echo "bootstrap-snakespotter: OK"
echo "Next: GitHub secrets on andypapmedialight/SnakeSpotter, then Actions → Deploy."
