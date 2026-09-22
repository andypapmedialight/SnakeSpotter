# SnakeSpotter

A field log for snake sightings along Edgars Creek in Coburg North. Record species, notes, and time, then pin the location on the map.

Sightings are stored in a SQLite file on disk. There is no account system and no hosted database. Hub deploys rsync the app into `/opt/snakespotter` but keep the database at `/var/lib/snakespotter/sightings.db`, so logged sightings survive each push to `main`.

Source of truth: [github.com/andypapmedialight/SnakeSpotter](https://github.com/andypapmedialight/SnakeSpotter) (`main`). Anthemic Hub deploys from that branch, not from a laptop working copy.

## Run locally

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m app.main
```

Open [http://127.0.0.1:4867](http://127.0.0.1:4867).

The server binds to `0.0.0.0:4867`.

## Google Maps key

Set `GOOGLE_MAPS_API_KEY` in `.env` or your shell to enable the map picker and pins. Enable the **Maps JavaScript API** for that key.

Without a key the app stays usable: a banner explains that the map is offline, and you enter latitude and longitude by hand.

**Never commit the key.** On Anthemic Hub it is a GitHub Actions secret that lands in `/etc/snakespotter/snakespotter.env` on the droplet.

```bash
gh secret set GOOGLE_MAPS_API_KEY --repo andypapmedialight/SnakeSpotter
```

Then push `main` (or run **Actions → Deploy**) so CI installs the env file. If the secret is empty, the hub app still serves; maps stay in the fallback.

## Anthemic Hub

Public URL: [https://snakespot.anthemic-developments.com/](https://snakespot.anthemic-developments.com/)

Push to `main` → GitHub Actions rsyncs into `/home/deploy/incoming-snakespotter/` → `sudo /usr/local/bin/snakespotter-deploy-apply.sh` promotes into `/opt/snakespotter`, SQLite at `/var/lib/snakespotter/sightings.db`, systemd `snakespotter.service` on `127.0.0.1:8075`. nginx in **anthemic-ops** proxies the `snakespot.anthemic-developments.com` subdomain. The old path `/snakespotter/` redirects there.

One-time droplet bootstrap (from GitHub, as root):

```bash
git clone --depth 1 --branch main \
  https://github.com/andypapmedialight/SnakeSpotter.git /tmp/SnakeSpotter
/tmp/SnakeSpotter/scripts/droplet/bootstrap-snakespotter.sh \
  /tmp/SnakeSpotter/scripts/droplet/snakespotter-deploy-apply.sh \
  /tmp/SnakeSpotter/scripts/droplet/snakespotter.service
```

Same four deploy secrets as the other Anthemic repos: `DEPLOY_HOST`, `DEPLOY_PORT`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`.

## What you can do

- Log a sighting (species or Unsure, notes, datetime, lat/lng)
- See every sighting in a list
- Roll over a pin (or a list row) to see the full sighting on the map
- Open a sighting and jump to its pin
- Click the map around Edgars Creek, Coburg North to drop a pin
- Open Summary for counts by time of day, month, and creek stretch
- Open Gallery to compare identification photos when you need them

The map stays on that creek corridor, from Photography Drive down to Bell Street. Pins outside the area are rejected.

The species list is snakes recorded around Edgars Creek and inner-north Melbourne: Eastern Brown, Tiger, Lowland Copperhead, Red-bellied Black, White-lipped, Little Whip, and Small-eyed. Unsure is always available. Identification photos are Wikimedia Commons files; credits sit under each picture. Each species shows how venomous it is.

Local data lives in `data/sightings.db`. Hub data lives in `/var/lib/snakespotter/sightings.db`.
