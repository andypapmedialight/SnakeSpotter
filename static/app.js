(() => {
  const config = window.SNAKESPOTTER || { mapsEnabled: false };
  const speciesCatalog = Array.isArray(config.species) ? config.species : [];
  const mapArea = config.map || {
    center: { lat: -37.7325, lng: 144.977 },
    zoom: 14,
    minZoom: 13,
    bounds: { north: -37.7125, south: -37.752, east: 144.993, west: 144.963 },
  };

  const els = {
    mapsBanner: document.getElementById("maps-banner"),
    appBanner: document.getElementById("app-banner"),
    map: document.getElementById("map"),
    mapFallback: document.getElementById("map-fallback"),
    mapHint: document.getElementById("map-hint"),
    listView: document.getElementById("list-view"),
    formView: document.getElementById("form-view"),
    detailView: document.getElementById("detail-view"),
    listLoading: document.getElementById("list-loading"),
    listError: document.getElementById("list-error"),
    listEmpty: document.getElementById("list-empty"),
    list: document.getElementById("sighting-list"),
    listCount: document.getElementById("list-count"),
    form: document.getElementById("sighting-form"),
    formError: document.getElementById("form-error"),
    species: document.getElementById("species"),
    speciesPicker: document.getElementById("species-picker"),
    notes: document.getElementById("notes"),
    observedAt: document.getElementById("observed-at"),
    latitude: document.getElementById("latitude"),
    longitude: document.getElementById("longitude"),
    saveBtn: document.getElementById("save-btn"),
    newBtn: document.getElementById("new-btn"),
    emptyNewBtn: document.getElementById("empty-new-btn"),
    formCancel: document.getElementById("form-cancel"),
    detailBack: document.getElementById("detail-back"),
    detailLoading: document.getElementById("detail-loading"),
    detailError: document.getElementById("detail-error"),
    detailBody: document.getElementById("detail-body"),
    detailHeading: document.getElementById("detail-heading"),
    detailPhoto: document.getElementById("detail-species-photo"),
    detailSpeciesImg: document.getElementById("detail-species-img"),
    detailSpeciesCredit: document.getElementById("detail-species-credit"),
    detailWhen: document.getElementById("detail-when"),
    detailWhere: document.getElementById("detail-where"),
    detailLogged: document.getElementById("detail-logged"),
    detailNotes: document.getElementById("detail-notes"),
  };

  const state = {
    mode: "list",
    sightings: [],
    selectedId: null,
    loadingList: true,
    listError: "",
    mapsReady: false,
    mapsFailed: !config.mapsEnabled,
    map: null,
    markers: [],
    markersById: new Map(),
    pickMarker: null,
    snakeIcon: null,
    infoWindow: null,
    hoverCloseTimer: null,
    hoveredSightingId: null,
    stickySightingId: null,
  };

  function show(el, on = true) {
    el.hidden = !on;
  }

  function setAppBanner(message) {
    if (!message) {
      show(els.appBanner, false);
      els.appBanner.textContent = "";
      return;
    }
    els.appBanner.textContent = message;
    show(els.appBanner, true);
  }

  function setMode(mode) {
    state.mode = mode;
    show(els.listView, mode === "list");
    show(els.formView, mode === "form");
    show(els.detailView, mode === "detail");
    show(els.mapHint, mode === "form" && state.mapsReady && !state.mapsFailed);
    if (mode !== "form" && state.pickMarker) {
      state.pickMarker.setMap(null);
      state.pickMarker = null;
    }
    if (mode === "form") closeInfoWindow({ force: true });
  }

  function toLocalInputValue(date) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
      date.getHours()
    )}:${pad(date.getMinutes())}`;
  }

  function formatWhen(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatCoords(lat, lng) {
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  }

  function resetForm() {
    els.form.reset();
    els.observedAt.value = toLocalInputValue(new Date());
    els.formError.hidden = true;
    els.formError.textContent = "";
    els.saveBtn.disabled = false;
    els.saveBtn.textContent = "Save sighting";
    highlightSpecies("");
  }

  function speciesRecord(name) {
    const needle = (name || "").trim().toLowerCase();
    return speciesCatalog.find((item) => item.name.toLowerCase() === needle) || null;
  }

  function highlightSpecies(name) {
    const needle = (name || "").trim().toLowerCase();
    for (const card of els.speciesPicker.querySelectorAll(".species-card")) {
      const match = card.dataset.species.toLowerCase() === needle;
      card.setAttribute("aria-pressed", match ? "true" : "false");
    }
  }

  function parseApiError(payload, fallback) {
    if (!payload) return fallback;
    if (typeof payload.detail === "string") return payload.detail;
    if (Array.isArray(payload.detail)) {
      return payload.detail
        .map((item) => {
          const field = Array.isArray(item.loc) ? item.loc.slice(1).join(" ") : "";
          return field ? `${field}: ${item.msg}` : item.msg;
        })
        .join(" ");
    }
    return fallback;
  }

  async function fetchJson(url, options) {
    const response = await fetch(url, options);
    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok) {
      throw new Error(parseApiError(payload, `Request failed (${response.status})`));
    }
    return payload;
  }

  function renderList() {
    show(els.listLoading, state.loadingList);
    show(els.listError, Boolean(state.listError) && !state.loadingList);
    els.listError.textContent = state.listError;
    const empty = !state.loadingList && !state.listError && state.sightings.length === 0;
    show(els.listEmpty, empty);
    show(els.list, !state.loadingList && !state.listError && !empty);
    els.listCount.textContent = state.loadingList
      ? ""
      : `${state.sightings.length} logged`;

    els.list.replaceChildren();
    for (const sighting of state.sightings) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sighting-card";
      if (sighting.id === state.selectedId) button.classList.add("is-active");
      button.innerHTML = `<h3></h3><p></p>`;
      button.querySelector("h3").textContent = sighting.species;
      button.querySelector("p").textContent = `${formatWhen(sighting.observed_at)} · ${formatCoords(
        sighting.latitude,
        sighting.longitude
      )}`;
      button.addEventListener("click", () => openDetail(sighting.id));
      button.addEventListener("mouseenter", () => openInfoWindow(sighting));
      button.addEventListener("mouseleave", () => scheduleHoverClose());
      button.addEventListener("focus", () => openInfoWindow(sighting));
      button.addEventListener("blur", () => scheduleHoverClose());
      item.appendChild(button);
      els.list.appendChild(item);
    }
  }

  function snakeIcon() {
    if (state.snakeIcon) return state.snakeIcon;
    state.snakeIcon = {
      url: new URL("static/marker-snake.png", window.location.href).href,
      scaledSize: new google.maps.Size(36, 71),
      anchor: new google.maps.Point(18, 70),
    };
    return state.snakeIcon;
  }

  function placeSnakeMarker(position, title) {
    const options = {
      map: state.map,
      position,
      icon: snakeIcon(),
      optimized: false,
    };
    if (title) options.title = title;
    return new google.maps.Marker(options);
  }

  function clearHoverClose() {
    if (state.hoverCloseTimer) {
      window.clearTimeout(state.hoverCloseTimer);
      state.hoverCloseTimer = null;
    }
  }

  function closeInfoWindow({ force = false } = {}) {
    clearHoverClose();
    if (!force && state.stickySightingId) return;
    state.hoveredSightingId = null;
    if (force) state.stickySightingId = null;
    if (state.infoWindow) state.infoWindow.close();
  }

  function scheduleHoverClose() {
    clearHoverClose();
    state.hoverCloseTimer = window.setTimeout(() => {
      if (state.stickySightingId) {
        if (state.hoveredSightingId !== state.stickySightingId) {
          const sticky = state.sightings.find((item) => item.id === state.stickySightingId);
          if (sticky) {
            openInfoWindow(sticky, { sticky: true });
            return;
          }
          state.stickySightingId = null;
        } else {
          return;
        }
      }
      state.hoveredSightingId = null;
      if (state.infoWindow) state.infoWindow.close();
    }, 300);
  }

  function buildInfoWindowCard(sighting) {
    const card = document.createElement("div");
    card.className = "iw-card";
    card.setAttribute("role", "button");
    card.tabIndex = 0;

    const kicker = document.createElement("p");
    kicker.className = "iw-kicker";
    kicker.textContent = "Sighting";

    const title = document.createElement("h3");
    title.className = "iw-title";
    title.textContent = sighting.species;
    card.append(kicker, title);

    const match = speciesRecord(sighting.species);
    if (match && match.image && !/[\\/]/.test(match.image)) {
      const figure = document.createElement("figure");
      figure.className = "iw-photo";
      const img = document.createElement("img");
      img.src = `static/species/${match.image}`;
      img.alt = match.name;
      figure.appendChild(img);
      if (match.credit && match.license) {
        const caption = document.createElement("figcaption");
        caption.className = "iw-credit";
        caption.textContent = `${match.credit} · ${match.license}`;
        figure.appendChild(caption);
      }
      card.appendChild(figure);
    }

    const meta = document.createElement("dl");
    meta.className = "iw-meta";
    for (const [label, value] of [
      ["Observed", formatWhen(sighting.observed_at)],
      ["Location", formatCoords(sighting.latitude, sighting.longitude)],
      ["Logged", formatWhen(sighting.created_at)],
    ]) {
      const row = document.createElement("div");
      const dt = document.createElement("dt");
      dt.textContent = label;
      const dd = document.createElement("dd");
      dd.textContent = value;
      row.append(dt, dd);
      meta.appendChild(row);
    }
    card.appendChild(meta);

    const notes = document.createElement("p");
    notes.className = "iw-notes";
    if (sighting.notes) {
      notes.textContent = sighting.notes;
    } else {
      notes.classList.add("iw-muted");
      notes.textContent = "No notes recorded.";
    }
    card.appendChild(notes);

    card.addEventListener("mouseenter", () => {
      clearHoverClose();
      state.hoveredSightingId = sighting.id;
    });
    card.addEventListener("mouseleave", () => {
      if (state.stickySightingId !== sighting.id) scheduleHoverClose();
    });
    const stickAndOpen = () => {
      state.stickySightingId = sighting.id;
      openDetail(sighting.id);
    };
    card.addEventListener("click", stickAndOpen);
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        stickAndOpen();
      }
    });
    return card;
  }

  function ensureInfoWindow() {
    if (state.infoWindow) return state.infoWindow;
    state.infoWindow = new google.maps.InfoWindow({
      pixelOffset: new google.maps.Size(0, -72),
      disableAutoPan: false,
      maxWidth: 280,
    });
    state.infoWindow.addListener("closeclick", () => {
      state.stickySightingId = null;
      state.hoveredSightingId = null;
    });
    return state.infoWindow;
  }

  function openInfoWindow(sighting, { sticky = false, refresh = false } = {}) {
    if (!state.map || !window.google || !google.maps || !sighting) return;
    clearHoverClose();
    if (sticky) state.stickySightingId = sighting.id;
    const alreadyOpen =
      state.hoveredSightingId === sighting.id &&
      state.infoWindow &&
      typeof state.infoWindow.getMap === "function" &&
      Boolean(state.infoWindow.getMap());
    state.hoveredSightingId = sighting.id;
    if (alreadyOpen && !refresh) return;
    const infoWindow = ensureInfoWindow();
    infoWindow.setContent(buildInfoWindowCard(sighting));
    const marker = state.markersById.get(sighting.id);
    if (marker) {
      infoWindow.open({ map: state.map, anchor: marker, shouldFocus: false });
    } else {
      infoWindow.setPosition({ lat: sighting.latitude, lng: sighting.longitude });
      infoWindow.open({ map: state.map, shouldFocus: false });
    }
  }

  function syncMapMarkers() {
    if (!state.map || !window.google || !google.maps) return;
    for (const marker of state.markers) marker.setMap(null);
    state.markers = [];
    state.markersById.clear();
    for (const sighting of state.sightings) {
      const marker = placeSnakeMarker({ lat: sighting.latitude, lng: sighting.longitude });
      marker.addListener("mouseover", () => openInfoWindow(sighting));
      marker.addListener("mouseout", () => scheduleHoverClose());
      marker.addListener("click", () => {
        openInfoWindow(sighting, { sticky: true });
        openDetail(sighting.id);
      });
      state.markers.push(marker);
      state.markersById.set(sighting.id, marker);
    }
    const keepId = state.stickySightingId || state.hoveredSightingId;
    if (!keepId) return;
    const keep = state.sightings.find((item) => item.id === keepId);
    if (keep) openInfoWindow(keep, { sticky: Boolean(state.stickySightingId) });
    else closeInfoWindow({ force: true });
  }

  function focusSighting(sighting) {
    if (!state.map) return;
    if (!inSurveyArea(sighting.latitude, sighting.longitude)) return;
    state.map.panTo({ lat: sighting.latitude, lng: sighting.longitude });
    if (state.map.getZoom() < 15) state.map.setZoom(16);
  }

  function inSurveyArea(lat, lng) {
    const bounds = mapArea.bounds;
    return lat >= bounds.south && lat <= bounds.north && lng >= bounds.west && lng <= bounds.east;
  }

  function setPickPosition(lat, lng) {
    els.latitude.value = Number(lat).toFixed(6);
    els.longitude.value = Number(lng).toFixed(6);
    if (!state.map || !window.google) return;
    const position = { lat: Number(lat), lng: Number(lng) };
    if (!state.pickMarker) {
      state.pickMarker = placeSnakeMarker(position, "New sighting");
      state.pickMarker.setZIndex(google.maps.Marker.MAX_ZINDEX + 1);
    } else {
      state.pickMarker.setPosition(position);
    }
  }

  function initMap() {
    if (state.mapsFailed || !window.google || !google.maps) {
      showMapFallback();
      return;
    }
    state.mapsReady = true;
    show(els.mapFallback, false);
    show(els.mapsBanner, false);
    state.map = new google.maps.Map(els.map, {
      center: mapArea.center,
      zoom: mapArea.zoom,
      minZoom: mapArea.minZoom,
      maxZoom: 19,
      restriction: {
        latLngBounds: mapArea.bounds,
        strictBounds: true,
      },
      mapTypeId: "terrain",
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: true,
    });
    state.map.addListener("click", (event) => {
      closeInfoWindow({ force: true });
      if (state.mode !== "form") setMode("form");
      setPickPosition(event.latLng.lat(), event.latLng.lng());
    });
    syncMapMarkers();
  }

  function showMapFallback(message) {
    state.mapsFailed = true;
    state.mapsReady = false;
    show(els.mapFallback, true);
    show(els.mapHint, false);
    show(els.mapsBanner, true);
    if (message) els.mapsBanner.textContent = message;
  }

  async function loadSightings() {
    state.loadingList = true;
    state.listError = "";
    renderList();
    try {
      const data = await fetchJson("api/sightings");
      state.sightings = data.items || [];
    } catch (error) {
      state.listError = error.message || "Could not load sightings.";
      setAppBanner("Could not load sightings. Check that the app is running, then try again.");
    } finally {
      state.loadingList = false;
      renderList();
      syncMapMarkers();
    }
  }

  function openForm() {
    resetForm();
    setMode("form");
    els.species.focus();
  }

  async function openDetail(id) {
    state.selectedId = id;
    const listed = state.sightings.find((item) => item.id === id);
    if (listed) openInfoWindow(listed, { sticky: true });
    setMode("detail");
    show(els.detailLoading, true);
    show(els.detailError, false);
    show(els.detailBody, false);
    renderList();
    try {
      const sighting = await fetchJson(`api/sightings/${id}`);
      els.detailHeading.textContent = sighting.species;
      const match = speciesRecord(sighting.species);
      if (match && match.image) {
        els.detailSpeciesImg.src = `static/species/${match.image}`;
        els.detailSpeciesImg.alt = match.name;
        els.detailSpeciesCredit.textContent =
          match.credit && match.license ? `${match.credit} · ${match.license}` : "";
        show(els.detailPhoto, true);
      } else {
        els.detailSpeciesImg.removeAttribute("src");
        els.detailSpeciesImg.alt = "";
        els.detailSpeciesCredit.textContent = "";
        show(els.detailPhoto, false);
      }
      els.detailWhen.textContent = formatWhen(sighting.observed_at);
      els.detailWhere.textContent = formatCoords(sighting.latitude, sighting.longitude);
      els.detailLogged.textContent = formatWhen(sighting.created_at);
      if (sighting.notes) {
        els.detailNotes.hidden = false;
        els.detailNotes.textContent = sighting.notes;
      } else {
        els.detailNotes.hidden = false;
        els.detailNotes.textContent = "No notes recorded.";
      }
      show(els.detailLoading, false);
      show(els.detailBody, true);
      openInfoWindow(sighting, { sticky: true, refresh: true });
      focusSighting(sighting);
    } catch (error) {
      show(els.detailLoading, false);
      els.detailError.textContent = error.message || "Could not load this sighting.";
      show(els.detailError, true);
    }
  }

  function backToList() {
    state.selectedId = null;
    closeInfoWindow({ force: true });
    setMode("list");
    renderList();
  }

  els.newBtn.addEventListener("click", openForm);
  els.emptyNewBtn.addEventListener("click", openForm);
  els.formCancel.addEventListener("click", backToList);
  els.detailBack.addEventListener("click", backToList);

  els.speciesPicker.addEventListener("click", (event) => {
    const card = event.target.closest(".species-card");
    if (!card) return;
    els.species.value = card.dataset.species;
    highlightSpecies(card.dataset.species);
  });
  els.species.addEventListener("input", () => highlightSpecies(els.species.value));

  els.latitude.addEventListener("change", () => {
    if (els.latitude.value && els.longitude.value) {
      setPickPosition(els.latitude.value, els.longitude.value);
    }
  });
  els.longitude.addEventListener("change", () => {
    if (els.latitude.value && els.longitude.value) {
      setPickPosition(els.latitude.value, els.longitude.value);
    }
  });

  els.form.addEventListener("submit", async (event) => {
    event.preventDefault();
    els.formError.hidden = true;
    const rawSpecies = els.species.value.trim();
    const species =
      !rawSpecies || rawSpecies.toLowerCase() === "unsure" ? "Unsure" : rawSpecies;
    const latitude = Number(els.latitude.value);
    const longitude = Number(els.longitude.value);
    if (!els.observedAt.value) {
      els.formError.textContent = "Observed time is required.";
      els.formError.hidden = false;
      return;
    }
    if (Number.isNaN(latitude) || Number.isNaN(longitude) || !inSurveyArea(latitude, longitude)) {
      els.formError.textContent =
        "Drop a pin around Edgars Creek in Coburg North, or enter coordinates in that area.";
      els.formError.hidden = false;
      return;
    }

    els.saveBtn.disabled = true;
    els.saveBtn.textContent = "Saving…";
    try {
      const created = await fetchJson("api/sightings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          species,
          notes: els.notes.value.trim(),
          observed_at: els.observedAt.value,
          latitude,
          longitude,
        }),
      });
      setAppBanner("");
      await loadSightings();
      openDetail(created.id);
    } catch (error) {
      els.formError.textContent = error.message || "Could not save this sighting.";
      els.formError.hidden = false;
      els.saveBtn.disabled = false;
      els.saveBtn.textContent = "Save sighting";
    }
  });

  if (!config.mapsEnabled) {
    showMapFallback();
  } else {
    window.addEventListener("google-maps-ready", initMap, { once: true });
    window.addEventListener(
      "google-maps-auth-failure",
      () => {
        showMapFallback(
          "Google Maps could not load. Check GOOGLE_MAPS_API_KEY, then restart the app. You can still enter latitude and longitude."
        );
      },
      { once: true }
    );
    window.setTimeout(() => {
      if (!state.mapsReady && !state.mapsFailed) {
        showMapFallback(
          "Google Maps did not finish loading. Enter latitude and longitude to keep logging sightings."
        );
      }
    }, 8000);
  }

  setMode("list");
  loadSightings();
})();
