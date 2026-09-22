# Snakes known from inner-north Melbourne and the Merri–Edgars creek corridor.
# Photos are Wikimedia Commons files; see static/species/ATTRIBUTION.txt.
# Eastern Brown: iNaturalist, Edgars Creek Reserve, Coburg North, 2023.
# Tiger: Friends of Merri Creek (urban waterways including Merri Creek).
# The remaining five are Melbourne’s other locally indigenous snakes
# (eMelbourne / Museum Victoria). Unsure stays first for unidentified sightings.

SPECIES = [
    {
        "name": "Unsure",
        "slug": "unsure",
        "image": None,
        "credit": None,
        "license": None,
        "license_url": None,
        "source": None,
    },
    {
        "name": "Eastern Brown Snake",
        "slug": "eastern-brown-snake",
        "image": "eastern-brown-snake.jpg",
        "credit": "Matt from Melbourne",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
        "source": "https://commons.wikimedia.org/wiki/File:Eastern_Brown_Snake_(Pseudonaja_textilis)_(8582601994).jpg",
    },
    {
        "name": "Tiger Snake",
        "slug": "tiger-snake",
        "image": "tiger-snake.jpg",
        "credit": "Matt from Melbourne",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
        "source": "https://commons.wikimedia.org/wiki/File:Eastern_Tiger_Snake_(Notechis_scutatus)_(8398218886).jpg",
    },
    {
        "name": "Lowland Copperhead",
        "slug": "lowland-copperhead",
        "image": "lowland-copperhead.jpg",
        "credit": "Max Tibby",
        "license": "CC0",
        "license_url": "https://creativecommons.org/publicdomain/zero/1.0/",
        "source": "https://commons.wikimedia.org/wiki/File:Austrelaps_superbus_299730325_(cropped).jpg",
    },
    {
        "name": "Red-bellied Black Snake",
        "slug": "red-bellied-black-snake",
        "image": "red-bellied-black-snake.jpg",
        "credit": "Matt from Melbourne",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
        "source": "https://commons.wikimedia.org/wiki/File:Red-bellied_Black_Snake_(Pseudechis_porphyriacus)_(8397137495).jpg",
    },
    {
        "name": "White-lipped Snake",
        "slug": "white-lipped-snake",
        "image": "white-lipped-snake.jpg",
        "credit": "John Wombey, CSIRO",
        "license": "CC BY 3.0",
        "license_url": "https://creativecommons.org/licenses/by/3.0/",
        "source": "https://commons.wikimedia.org/wiki/File:CSIRO_ScienceImage_7486_Whitelipped_Snake.jpg",
    },
    {
        "name": "Little Whip Snake",
        "slug": "little-whip-snake",
        "image": "little-whip-snake.jpg",
        "credit": "Matt from Melbourne",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
        "source": "https://commons.wikimedia.org/wiki/File:Little_Whip_Snake_(Parasuta_flagellum)_(9038903489).jpg",
    },
    {
        "name": "Small-eyed Snake",
        "slug": "small-eyed-snake",
        "image": "small-eyed-snake.jpg",
        "credit": "Matt from Melbourne",
        "license": "CC BY 2.0",
        "license_url": "https://creativecommons.org/licenses/by/2.0/",
        "source": "https://commons.wikimedia.org/wiki/File:Eastern_Small-eyed_Snake_(Cryptophis_nigrescens)_(8909756146).jpg",
    },
]

NAMES = [item["name"] for item in SPECIES]


def by_name(name: str) -> dict | None:
    needle = name.strip().casefold()
    for item in SPECIES:
        if item["name"].casefold() == needle:
            return item
    return None
