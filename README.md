# SnakeSpotter

A local field log for snake sightings. Record species, notes, and time, then pin the location on a Google Map.

Sightings are stored in a SQLite file on disk. There is no account system and no hosted database.

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

## What you can do

- Log a sighting (species, notes, datetime, lat/lng)
- See every sighting in a list
- Open a sighting and jump to its pin
- Click the map to drop a pin when Maps is available

Data lives in `data/sightings.db`.
