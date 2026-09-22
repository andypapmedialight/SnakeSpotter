# Edgars Creek through Coburg North, padded to nearby streets,
# Cash Reserve, and the Merri Creek confluence.
NAME = "Edgars Creek, Coburg North"
CENTER_LAT = -37.72455
CENTER_LNG = 144.97949
DEFAULT_ZOOM = 15
MIN_ZOOM = 14
NORTH = -37.7125
SOUTH = -37.7380
WEST = 144.9690
EAST = 144.9930


def contains(latitude: float, longitude: float) -> bool:
    return SOUTH <= latitude <= NORTH and WEST <= longitude <= EAST
