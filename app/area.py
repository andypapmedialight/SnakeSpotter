# Edgars Creek through Coburg North, including the Merri Creek junction.
# Confluence is the Coburg Fishway / weir, about -37.7350, 144.9718.
NAME = "Edgars Creek, Coburg North"
CENTER_LAT = -37.7285
CENTER_LNG = 144.9770
DEFAULT_ZOOM = 15
MIN_ZOOM = 13
NORTH = -37.7125
SOUTH = -37.7460
WEST = 144.9630
EAST = 144.9930


def contains(latitude: float, longitude: float) -> bool:
    return SOUTH <= latitude <= NORTH and WEST <= longitude <= EAST
