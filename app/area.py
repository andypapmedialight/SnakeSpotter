# Edgars Creek, Coburg North: Photography Drive to Bell Street,
# Sydney Road (west) to Gilbert Road (east).
# Sydney Road in this band: about 144.9636 (north) to 144.9665 (Bell Street).
# Gilbert Road in this band: about 144.9891 (Bell Street) to 144.9922 (north).
# Bounds sit just outside those centrelines so both roads stay on the map.
# Centre: Edgars Creek beside Harold Stevens Athletics Track, Jackson Reserve.
# The track is about -37.7321, 144.9758; the creek centreline there is 144.9755.
NAME = "Edgars Creek, Coburg North"
CENTER_LAT = -37.7321
CENTER_LNG = 144.9755
DEFAULT_ZOOM = 17
MIN_ZOOM = 14
NORTH = -37.7254
SOUTH = -37.7445
WEST = 144.9632
EAST = 144.9926

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
