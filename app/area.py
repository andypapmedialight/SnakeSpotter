# Edgars Creek through Coburg North, down to De Chene Reserve.
# Confluence (Coburg Fishway): about -37.7350, 144.9718.
# De Chene Reserve south edge: about -37.7425, 144.978.
NAME = "Edgars Creek, Coburg North"
CENTER_LAT = -37.7325
CENTER_LNG = 144.9770
DEFAULT_ZOOM = 14
MIN_ZOOM = 13
NORTH = -37.7125
SOUTH = -37.7520
WEST = 144.9630
EAST = 144.9930


def contains(latitude: float, longitude: float) -> bool:
    return SOUTH <= latitude <= NORTH and WEST <= longitude <= EAST
