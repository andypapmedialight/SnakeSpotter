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


def contains(latitude: float, longitude: float) -> bool:
    return SOUTH <= latitude <= NORTH and WEST <= longitude <= EAST
