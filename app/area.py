# Edgars Creek, Coburg North: Photography Drive south to Bell Street.
# Photography Drive north kerb at Newlands Rd: about -37.7257, 144.9743.
# Bell Street in this corridor: about -37.7410 west to -37.7443 east;
# creek crossing near -37.7424, 144.977.
NAME = "Edgars Creek, Coburg North"
CENTER_LAT = -37.7350
CENTER_LNG = 144.9770
DEFAULT_ZOOM = 15
MIN_ZOOM = 14
NORTH = -37.7254
SOUTH = -37.7445
WEST = 144.9630
EAST = 144.9930

# North-to-south creek stretches. A pin belongs to the first reach whose
# south edge is still south of it.
REACHES = [
    {"id": "photography-drive", "name": "Photography Drive", "south": -37.7290},
    {"id": "newlands", "name": "Newlands", "south": -37.7335},
    {"id": "confluence", "name": "Edgars–Merri confluence", "south": -37.7380},
    {"id": "dechene", "name": "De Chene Reserve", "south": -37.7420},
    {"id": "bell-street", "name": "Bell Street", "south": SOUTH},
]


def contains(latitude: float, longitude: float) -> bool:
    return SOUTH <= latitude <= NORTH and WEST <= longitude <= EAST


def reach_for(latitude: float) -> dict:
    if latitude > NORTH:
        return {"id": "north-of-area", "name": "North of Photography Drive", "south": NORTH}
    for item in REACHES:
        if latitude >= item["south"]:
            return item
    return {"id": "south-of-area", "name": "South of Bell Street", "south": SOUTH}
