(() => {
  const config = window.SNAKESPOTTER || { mapsEnabled: false };

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
    pickMarker: null,
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
      item.appendChild(button);
      els.list.appendChild(item);
    }
  }

  function syncMapMarkers() {
    if (!state.map || !window.google || !google.maps) return;
    for (const marker of state.markers) marker.setMap(null);
    state.markers = state.sightings.map((sighting) => {
      const marker = new google.maps.Marker({
        map: state.map,
        position: { lat: sighting.latitude, lng: sighting.longitude },
        title: sighting.species,
      });
      marker.addListener("click", () => openDetail(sighting.id));
      return marker;
    });
    if (state.sightings.length === 1) {
      state.map.setCenter({
        lat: state.sightings[0].latitude,
        lng: state.sightings[0].longitude,
      });
      state.map.setZoom(12);
    } else if (state.sightings.length > 1) {
      const bounds = new google.maps.LatLngBounds();
      for (const sighting of state.sightings) {
        bounds.extend({ lat: sighting.latitude, lng: sighting.longitude });
      }
      state.map.fitBounds(bounds, 48);
    }
  }

  function focusSighting(sighting) {
    if (!state.map) return;
    state.map.panTo({ lat: sighting.latitude, lng: sighting.longitude });
    if (state.map.getZoom() < 13) state.map.setZoom(14);
  }

  function setPickPosition(lat, lng) {
    els.latitude.value = Number(lat).toFixed(6);
    els.longitude.value = Number(lng).toFixed(6);
    if (!state.map || !window.google) return;
    const position = { lat: Number(lat), lng: Number(lng) };
    if (!state.pickMarker) {
      state.pickMarker = new google.maps.Marker({
        map: state.map,
        position,
        title: "New sighting",
      });
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
      center: { lat: 20, lng: 12 },
      zoom: 3,
      mapTypeId: "terrain",
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: true,
    });
    state.map.addListener("click", (event) => {
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
    setMode("detail");
    show(els.detailLoading, true);
    show(els.detailError, false);
    show(els.detailBody, false);
    renderList();
    try {
      const sighting = await fetchJson(`api/sightings/${id}`);
      els.detailHeading.textContent = sighting.species;
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
      focusSighting(sighting);
    } catch (error) {
      show(els.detailLoading, false);
      els.detailError.textContent = error.message || "Could not load this sighting.";
      show(els.detailError, true);
    }
  }

  function backToList() {
    state.selectedId = null;
    setMode("list");
    renderList();
  }

  els.newBtn.addEventListener("click", openForm);
  els.emptyNewBtn.addEventListener("click", openForm);
  els.formCancel.addEventListener("click", backToList);
  els.detailBack.addEventListener("click", backToList);

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
    const species = els.species.value.trim();
    const latitude = Number(els.latitude.value);
    const longitude = Number(els.longitude.value);
    if (!species) {
      els.formError.textContent = "Species is required.";
      els.formError.hidden = false;
      return;
    }
    if (!els.observedAt.value) {
      els.formError.textContent = "Observed time is required.";
      els.formError.hidden = false;
      return;
    }
    if (
      Number.isNaN(latitude) ||
      Number.isNaN(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      els.formError.textContent =
        "Enter a valid latitude (-90 to 90) and longitude (-180 to 180), or click the map.";
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
