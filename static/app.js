(() => {
  const config = window.SNAKESPOTTER || { mapsEnabled: false };
  const speciesCatalog = Array.isArray(config.species) ? config.species : [];
  const creekReaches = Array.isArray(config.reaches) ? config.reaches : [];
  const DAY_PERIODS = [
    { id: "night", name: "Night", hint: "12am–6am", start: 0, end: 6 },
    { id: "morning", name: "Morning", hint: "6am–12pm", start: 6, end: 12 },
    { id: "afternoon", name: "Afternoon", hint: "12pm–6pm", start: 12, end: 18 },
    { id: "evening", name: "Evening", hint: "6pm–12am", start: 18, end: 24 },
  ];
  const MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const mapArea = config.map || {
    center: { lat: -37.7321, lng: 144.9755 },
    zoom: 17,
    minZoom: 14,
    bounds: { north: -37.7254, south: -37.7445, east: 144.9926, west: 144.9632 },
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
    summaryView: document.getElementById("summary-view"),
    galleryView: document.getElementById("gallery-view"),
    safetyView: document.getElementById("safety-view"),
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
    locateBtn: document.getElementById("locate-btn"),
    saveBtn: document.getElementById("save-btn"),
    newBtn: document.getElementById("new-btn"),
    emptyNewBtn: document.getElementById("empty-new-btn"),
    formCancel: document.getElementById("form-cancel"),
    galleryBtn: document.getElementById("gallery-btn"),
    formGalleryBtn: document.getElementById("form-gallery-btn"),
    galleryBack: document.getElementById("gallery-back"),
    galleryPickHint: document.getElementById("gallery-pick-hint"),
    gallerySafetyBtn: document.getElementById("gallery-safety-btn"),
    safetyBtn: document.getElementById("safety-btn"),
    safetyBack: document.getElementById("safety-back"),
    adminBtn: document.getElementById("admin-btn"),
    adminStatus: document.getElementById("admin-status"),
    adminView: document.getElementById("admin-view"),
    adminForm: document.getElementById("admin-form"),
    adminPassword: document.getElementById("admin-password"),
    adminError: document.getElementById("admin-error"),
    adminCancel: document.getElementById("admin-cancel"),
    adminLoginBtn: document.getElementById("admin-login-btn"),
    confirmView: document.getElementById("confirm-view"),
    confirmCopy: document.getElementById("confirm-copy"),
    confirmCancel: document.getElementById("confirm-cancel"),
    confirmOk: document.getElementById("confirm-ok"),
    detailRemove: document.getElementById("detail-remove"),
    summaryBtn: document.getElementById("summary-btn"),
    summaryBack: document.getElementById("summary-back"),
    summaryEmptyNew: document.getElementById("summary-empty-new"),
    summaryTotal: document.getElementById("summary-total"),
    summaryLoading: document.getElementById("summary-loading"),
    summaryError: document.getElementById("summary-error"),
    summaryEmpty: document.getElementById("summary-empty"),
    summaryBody: document.getElementById("summary-body"),
    statTod: document.getElementById("stat-tod"),
    statToy: document.getElementById("stat-toy"),
    statLoc: document.getElementById("stat-loc"),
    detailBack: document.getElementById("detail-back"),
    detailLoading: document.getElementById("detail-loading"),
    detailError: document.getElementById("detail-error"),
    detailBody: document.getElementById("detail-body"),
    detailHeading: document.getElementById("detail-heading"),
    detailVenom: document.getElementById("detail-venom"),
    detailVenomNote: document.getElementById("detail-venom-note"),
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
    mapsAuthFailed: false,
    map: null,
    markers: [],
    markersById: new Map(),
    pickMarker: null,
    snakeIcon: null,
    infoWindow: null,
    hoverCloseTimer: null,
    hoveredSightingId: null,
    stickySightingId: null,
    galleryPicking: false,
    adminEnabled: Boolean(config.adminEnabled),
    adminSignedIn: false,
    pendingDeleteId: null,
    locateRequest: 0,
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
    show(els.detailView, mode === "detail");
    show(els.summaryView, mode === "summary");
  }

  function isFormOpen() {
    return Boolean(els.formView && els.formView.open);
  }

  function isAdminOpen() {
    return Boolean(els.adminView && els.adminView.open);
  }

  function isConfirmOpen() {
    return Boolean(els.confirmView && els.confirmView.open);
  }

  function isGalleryOpen() {
    return Boolean(els.galleryView && els.galleryView.open);
  }

  function isSafetyOpen() {
    return Boolean(els.safetyView && els.safetyView.open);
  }

  function applyAdminUi() {
    document.body.classList.toggle("admin-on", state.adminSignedIn);
    if (els.adminBtn) {
      show(els.adminBtn, state.adminEnabled);
      els.adminBtn.textContent = state.adminSignedIn ? "Sign out" : "Admin";
    }
    if (els.adminStatus) show(els.adminStatus, state.adminSignedIn);
    if (els.detailRemove) show(els.detailRemove, state.adminSignedIn && state.mode === "detail");
  }

  function resetAdminForm() {
    if (els.adminForm) els.adminForm.reset();
    if (els.adminError) {
      els.adminError.hidden = true;
      els.adminError.textContent = "";
    }
    if (els.adminLoginBtn) {
      els.adminLoginBtn.disabled = false;
      els.adminLoginBtn.textContent = "Sign in";
    }
  }

  function closeAdmin() {
    if (isAdminOpen()) els.adminView.close();
    resetAdminForm();
  }

  function openAdmin() {
    closeGallery();
    closeSafety();
    if (els.adminError) {
      els.adminError.hidden = true;
      els.adminError.textContent = "";
    }
    if (els.adminForm) els.adminForm.reset();
    if (!isAdminOpen()) els.adminView.showModal();
    window.setTimeout(() => els.adminPassword && els.adminPassword.focus(), 30);
  }

  function closeConfirm() {
    state.pendingDeleteId = null;
    if (isConfirmOpen()) els.confirmView.close();
  }

  function askRemoveSighting(sighting) {
    if (!sighting) return;
    state.pendingDeleteId = sighting.id;
    els.confirmCopy.textContent = `${sighting.species}, ${formatObservedClock(sighting.observed_at)}. This cannot be undone.`;
    if (!isConfirmOpen()) els.confirmView.showModal();
  }

  async function refreshAdminSession() {
    if (!state.adminEnabled) {
      state.adminSignedIn = false;
      applyAdminUi();
      return;
    }
    try {
      const data = await fetchJson("api/admin/session");
      state.adminSignedIn = Boolean(data && data.signed_in);
    } catch {
      state.adminSignedIn = false;
    }
    applyAdminUi();
    renderList();
  }

  async function signOutAdmin() {
    try {
      await fetchJson("api/admin/logout", { method: "POST" });
    } catch {
      // Cookie is httponly; still drop the local flag if the request fails.
    }
    state.adminSignedIn = false;
    applyAdminUi();
    renderList();
  }

  async function removePendingSighting() {
    const id = state.pendingDeleteId;
    if (!id) return;
    els.confirmOk.disabled = true;
    els.confirmOk.textContent = "Removing…";
    try {
      await fetchJson(`api/sightings/${id}`, { method: "DELETE" });
      closeConfirm();
      if (state.selectedId === id) {
        state.selectedId = null;
        setMode("list");
      }
      if (state.stickySightingId === id || state.hoveredSightingId === id) {
        closeInfoWindow({ force: true });
      }
      setAppBanner("");
      await loadSightings();
    } catch (error) {
      closeConfirm();
      if (/sign-in/i.test(error.message || "")) {
        state.adminSignedIn = false;
        applyAdminUi();
        openAdmin();
        els.adminError.textContent = "Sign in again to remove sightings.";
        els.adminError.hidden = false;
      } else {
        setAppBanner(error.message || "Could not remove that sighting.");
      }
    } finally {
      els.confirmOk.disabled = false;
      els.confirmOk.textContent = "Remove";
    }
  }

  function refreshMap() {
    if (!state.map || !window.google || !google.maps) return;
    google.maps.event.trigger(state.map, "resize");
  }

  function openForm({ reset = true } = {}) {
    if (reset) resetForm();
    closeInfoWindow({ force: true });
    if (!isFormOpen()) els.formView.show();
    document.body.classList.add("form-open");
    show(els.mapHint, state.mapsReady && !state.mapsFailed);
    window.setTimeout(refreshMap, 50);
    if (reset) els.species.focus();
  }

  function closeForm() {
    closeGallery();
    state.locateRequest += 1;
    if (els.locateBtn) {
      els.locateBtn.disabled = false;
      els.locateBtn.textContent = "Use current location";
    }
    if (isFormOpen()) els.formView.close();
    document.body.classList.remove("form-open");
    show(els.mapHint, false);
    if (state.pickMarker) {
      state.pickMarker.setMap(null);
      state.pickMarker = null;
    }
    window.setTimeout(refreshMap, 50);
  }

  function openGallery() {
    if (!els.galleryView) return;
    closeSafety();
    state.galleryPicking = isFormOpen();
    if (els.galleryPickHint) show(els.galleryPickHint, state.galleryPicking);
    highlightSpecies(els.species ? els.species.value : "");
    if (!isGalleryOpen()) els.galleryView.showModal();
    document.body.classList.add("gallery-open");
  }

  function closeGallery() {
    if (isGalleryOpen()) els.galleryView.close();
    document.body.classList.remove("gallery-open");
  }

  function openSafety() {
    if (!els.safetyView) return;
    closeGallery();
    closeAdmin();
    if (!isSafetyOpen()) els.safetyView.showModal();
    document.body.classList.add("safety-open");
  }

  function closeSafety() {
    if (isSafetyOpen()) els.safetyView.close();
    document.body.classList.remove("safety-open");
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

  function observedAsLocal(iso) {
    if (!iso) return null;
    // datetime-local is stored as a UTC wall clock. Read those numbers as local
    // time so "2 hours ago" matches the clock the person entered.
    const match = String(iso).match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/
    );
    if (!match) {
      const fallback = new Date(iso);
      return Number.isNaN(fallback.getTime()) ? null : fallback;
    }
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3]),
      Number(match[4]),
      Number(match[5]),
      Number(match[6] || 0)
    );
  }

  function formatObservedClock(iso) {
    const date = observedAsLocal(iso);
    if (!date) return iso || "";
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function formatRelative(iso) {
    const date = observedAsLocal(iso);
    if (!date) return iso || "";
    const seconds = Math.round((Date.now() - date.getTime()) / 1000);
    const ahead = seconds < 0;
    const abs = Math.abs(seconds);
    const phrase = (count, unit) => {
      const label = `${count} ${unit}${count === 1 ? "" : "s"}`;
      return ahead ? `in ${label}` : `${label} ago`;
    };
    if (abs < 60) return "just now";
    if (abs < 3600) return phrase(Math.floor(abs / 60), "minute");
    if (abs < 86400) return phrase(Math.floor(abs / 3600), "hour");
    return phrase(Math.floor(abs / 86400), "day");
  }

  function refreshRelativeTimes() {
    for (const node of document.querySelectorAll("[data-observed]")) {
      node.textContent = formatRelative(node.dataset.observed);
    }
    for (const sighting of state.sightings) {
      const marker = state.markersById.get(sighting.id);
      if (marker) {
        marker.setTitle(`${sighting.species}, ${formatRelative(sighting.observed_at)}`);
      }
    }
  }

  function formatCoords(lat, lng) {
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  }

  function observedClock(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    // datetime-local is stored as UTC wall-clock, so read UTC hour/month.
    return { hour: date.getUTCHours(), month: date.getUTCMonth() };
  }

  function dayPeriodFor(hour) {
    return DAY_PERIODS.find((period) => hour >= period.start && hour < period.end) || DAY_PERIODS[0];
  }

  function reachFor(latitude) {
    if (latitude > mapArea.bounds.north) {
      return { id: "north-of-area", name: "North of Photography Drive", south: mapArea.bounds.north };
    }
    for (const reach of creekReaches) {
      if (latitude >= reach.south) return reach;
    }
    return { id: "south-of-area", name: "South of Bell Street", south: mapArea.bounds.south };
  }

  function reachBand(reach) {
    const index = creekReaches.findIndex((item) => item.id === reach.id);
    const north =
      index <= 0 ? mapArea.bounds.north : creekReaches[index - 1].south;
    const south = Number(reach.south);
    return { north, south, lat: (north + south) / 2, lng: mapArea.center.lng };
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

  function venomInfo(name) {
    const match = speciesRecord(name);
    const allowed = new Set(["extreme", "high", "moderate", "mild", "unknown"]);
    const level = match && allowed.has(match.venom_level) ? match.venom_level : "unknown";
    return {
      level,
      label: (match && match.venom_label) || "Unknown — treat as dangerous",
      note: (match && match.venom_note) || "Treat as highly venomous until identified. Do not handle.",
    };
  }

  function makeVenomBadge(name) {
    const info = venomInfo(name);
    const badge = document.createElement("span");
    badge.className = `venom-badge venom-${info.level}`;
    badge.textContent = info.label;
    return badge;
  }

  function highlightSpecies(name) {
    const needle = (name || "").trim().toLowerCase();
    if (!els.speciesPicker) return;
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

  async function fetchJson(url, options = {}) {
    const response = await fetch(url, { credentials: "same-origin", ...options });
    if (response.status === 204) return null;
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
    const sightings = mappedSightings();
    const empty = !state.loadingList && !state.listError && sightings.length === 0;
    show(els.listEmpty, empty);
    show(els.list, !state.loadingList && !state.listError && !empty);
    els.listCount.textContent = state.loadingList ? "" : `${sightings.length} logged`;

    els.list.replaceChildren();
    for (const sighting of sightings) {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sighting-card";
      if (sighting.id === state.selectedId) button.classList.add("is-active");
      button.replaceChildren();
      const title = document.createElement("h3");
      title.textContent = sighting.species;
      const when = document.createElement("p");
      when.className = "sighting-when";
      when.dataset.observed = sighting.observed_at;
      when.textContent = formatRelative(sighting.observed_at);
      when.title = formatObservedClock(sighting.observed_at);
      button.append(title, when, makeVenomBadge(sighting.species));
      button.addEventListener("click", () => openDetail(sighting.id));
      button.addEventListener("mouseenter", () => openInfoWindow(sighting));
      button.addEventListener("mouseleave", () => scheduleHoverClose());
      button.addEventListener("focus", () => openInfoWindow(sighting));
      button.addEventListener("blur", () => scheduleHoverClose());
      item.appendChild(button);
      if (state.adminSignedIn) {
        const actions = document.createElement("div");
        actions.className = "sighting-row-actions";
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn btn-danger sighting-remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", (event) => {
          event.stopPropagation();
          askRemoveSighting(sighting);
        });
        actions.appendChild(remove);
        item.appendChild(actions);
      }
      els.list.appendChild(item);
    }
  }

  function renderBarList(container, rows) {
    container.replaceChildren();
    const max = Math.max(0, ...rows.map((row) => row.count));
    for (const row of rows) {
      const item = document.createElement("li");
      const inner = row.onSelect ? document.createElement("button") : document.createElement("div");
      inner.className = "stat-row";
      if (row.onSelect) inner.type = "button";

      const label = document.createElement("span");
      label.className = "stat-label";
      label.append(row.name);
      if (row.hint) {
        const hint = document.createElement("span");
        hint.className = "stat-hint";
        hint.textContent = row.hint;
        label.appendChild(hint);
      }

      const track = document.createElement("span");
      track.className = "stat-track";
      const fill = document.createElement("span");
      fill.className = "stat-fill";
      fill.style.width = max ? `${Math.round((row.count / max) * 100)}%` : "0%";
      track.appendChild(fill);

      const count = document.createElement("span");
      count.className = "stat-count";
      count.textContent = String(row.count);

      inner.append(label, track, count);
      if (row.onSelect) inner.addEventListener("click", row.onSelect);
      item.appendChild(inner);
      container.appendChild(item);
    }
  }

  function renderSummary() {
    show(els.summaryLoading, state.loadingList);
    show(els.summaryError, Boolean(state.listError) && !state.loadingList);
    els.summaryError.textContent = state.listError;
    const sightings = mappedSightings();
    const empty = !state.loadingList && !state.listError && sightings.length === 0;
    show(els.summaryEmpty, empty);
    show(els.summaryBody, !state.loadingList && !state.listError && !empty);

    const total = sightings.length;
    els.summaryTotal.textContent = state.loadingList
      ? ""
      : total === 1
        ? "1 sighting logged"
        : `${total} sightings logged`;
    if (empty || state.loadingList || state.listError) return;

    const todCounts = Object.fromEntries(DAY_PERIODS.map((period) => [period.id, 0]));
    const monthCounts = Array(12).fill(0);
    const locCounts = new Map(creekReaches.map((reach) => [reach.id, 0]));

    for (const sighting of sightings) {
      const clock = observedClock(sighting.observed_at);
      if (clock) {
        todCounts[dayPeriodFor(clock.hour).id] += 1;
        monthCounts[clock.month] += 1;
      }
      const reach = reachFor(sighting.latitude);
      locCounts.set(reach.id, (locCounts.get(reach.id) || 0) + 1);
    }

    renderBarList(
      els.statTod,
      DAY_PERIODS.map((period) => ({
        name: period.name,
        hint: period.hint,
        count: todCounts[period.id],
      }))
    );
    renderBarList(
      els.statToy,
      MONTHS.map((name, index) => ({
        name,
        count: monthCounts[index],
      }))
    );

    const locationRows = creekReaches.map((reach) => ({
      name: reach.name,
      count: locCounts.get(reach.id) || 0,
      onSelect: () => {
        const band = reachBand(reach);
        if (!state.map) return;
        state.map.panTo({ lat: band.lat, lng: band.lng });
        if (state.map.getZoom() < 16) state.map.setZoom(16);
      },
    }));
    for (const extra of [
      { id: "north-of-area", name: "North of Photography Drive" },
      { id: "south-of-area", name: "South of Bell Street" },
    ]) {
      const count = locCounts.get(extra.id) || 0;
      if (!count) continue;
      locationRows.push({ name: extra.name, count });
    }
    renderBarList(els.statLoc, locationRows);
  }

  function openSummary() {
    closeForm();
    closeInfoWindow({ force: true });
    setMode("summary");
    renderSummary();
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

    const title = document.createElement("h3");
    title.className = "iw-title";
    title.textContent = sighting.species;
    const when = document.createElement("p");
    when.className = "iw-when";
    when.dataset.observed = sighting.observed_at;
    when.textContent = formatRelative(sighting.observed_at);
    when.title = formatObservedClock(sighting.observed_at);
    card.append(title, when, makeVenomBadge(sighting.species));

    const match = speciesRecord(sighting.species);
    if (match && match.image && !/[\\/]/.test(match.image)) {
      const figure = document.createElement("figure");
      figure.className = "iw-photo";
      const img = document.createElement("img");
      img.src = `static/species/${match.image}`;
        img.alt = `${match.name}, ${venomInfo(match.name).label}`;
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
      ["Observed", formatObservedClock(sighting.observed_at)],
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
    for (const sighting of mappedSightings()) {
      const marker = placeSnakeMarker(
        { lat: sighting.latitude, lng: sighting.longitude },
        `${sighting.species}, ${formatRelative(sighting.observed_at)}`
      );
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

  function mappedSightings() {
    return state.sightings.filter((sighting) =>
      inSurveyArea(sighting.latitude, sighting.longitude)
    );
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

  function mapsApiReady() {
    return Boolean(window.__snakeMapsReady && window.google && google.maps && google.maps.Map);
  }

  function initMap() {
    if (state.map || state.mapsAuthFailed) return;
    if (!mapsApiReady()) {
      showMapFallback();
      return;
    }
    state.mapsFailed = false;
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
        strictBounds: false,
      },
      mapTypeId: "terrain",
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: true,
      gestureHandling: "greedy",
      clickableIcons: false,
    });
    state.map.addListener("click", (event) => {
      closeInfoWindow({ force: true });
      openForm({ reset: !isFormOpen() });
      setPickPosition(event.latLng.lat(), event.latLng.lng());
    });
    google.maps.event.addListenerOnce(state.map, "idle", refreshMap);
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
    renderSummary();
    try {
      const data = await fetchJson("api/sightings");
      state.sightings = data.items || [];
    } catch (error) {
      state.listError = error.message || "Could not load sightings.";
      setAppBanner("Could not load sightings. Check that the app is running, then try again.");
    } finally {
      state.loadingList = false;
      renderList();
      renderSummary();
      syncMapMarkers();
    }
  }

  function openFormFromButton() {
    openForm({ reset: true });
  }

  async function openDetail(id) {
    closeForm();
    state.selectedId = id;
    const listed = state.sightings.find((item) => item.id === id);
    if (listed) openInfoWindow(listed, { sticky: true });
    setMode("detail");
    show(els.detailLoading, true);
    show(els.detailError, false);
    show(els.detailBody, false);
    show(els.detailRemove, false);
    renderList();
    try {
      const sighting = await fetchJson(`api/sightings/${id}`);
      els.detailHeading.textContent = sighting.species;
      const match = speciesRecord(sighting.species);
      const venom = venomInfo(sighting.species);
      els.detailVenom.className = `venom-badge venom-${venom.level}`;
      els.detailVenom.textContent = venom.label;
      show(els.detailVenom, true);
      els.detailVenomNote.textContent = venom.note;
      show(els.detailVenomNote, true);
      if (match && match.image) {
        els.detailSpeciesImg.src = `static/species/${match.image}`;
        els.detailSpeciesImg.alt = `${match.name}, ${venom.label}`;
        els.detailSpeciesCredit.textContent =
          match.credit && match.license ? `${match.credit} · ${match.license}` : "";
        show(els.detailPhoto, true);
      } else {
        els.detailSpeciesImg.removeAttribute("src");
        els.detailSpeciesImg.alt = "";
        els.detailSpeciesCredit.textContent = "";
        show(els.detailPhoto, false);
      }
      els.detailWhen.textContent = formatObservedClock(sighting.observed_at);
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
      show(els.detailRemove, state.adminSignedIn);
      openInfoWindow(sighting, { sticky: true, refresh: true });
      focusSighting(sighting);
    } catch (error) {
      show(els.detailLoading, false);
      els.detailError.textContent = error.message || "Could not load this sighting.";
      show(els.detailError, true);
      show(els.detailRemove, false);
    }
  }

  function backToList() {
    state.selectedId = null;
    closeInfoWindow({ force: true });
    setMode("list");
    show(els.detailRemove, false);
    renderList();
  }

  els.newBtn.addEventListener("click", openFormFromButton);
  els.emptyNewBtn.addEventListener("click", openFormFromButton);
  els.summaryEmptyNew.addEventListener("click", openFormFromButton);
  els.formCancel.addEventListener("click", closeForm);
  els.detailBack.addEventListener("click", backToList);
  els.summaryBtn.addEventListener("click", openSummary);
  els.summaryBack.addEventListener("click", backToList);
  if (els.galleryBtn) els.galleryBtn.addEventListener("click", openGallery);
  if (els.formGalleryBtn) els.formGalleryBtn.addEventListener("click", openGallery);
  if (els.galleryBack) els.galleryBack.addEventListener("click", closeGallery);
  if (els.safetyBtn) els.safetyBtn.addEventListener("click", openSafety);
  if (els.safetyBack) els.safetyBack.addEventListener("click", closeSafety);
  if (els.gallerySafetyBtn) {
    els.gallerySafetyBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openSafety();
    });
  }
  els.adminBtn.addEventListener("click", () => {
    if (state.adminSignedIn) {
      signOutAdmin();
      return;
    }
    openAdmin();
  });
  els.adminCancel.addEventListener("click", closeAdmin);
  els.adminView.addEventListener("close", resetAdminForm);
  els.adminView.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAdmin();
  });
  els.confirmCancel.addEventListener("click", closeConfirm);
  els.confirmOk.addEventListener("click", removePendingSighting);
  els.confirmView.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeConfirm();
  });
  els.detailRemove.addEventListener("click", () => {
    const sighting = state.sightings.find((item) => item.id === state.selectedId);
    if (sighting) askRemoveSighting(sighting);
  });
  els.adminForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    els.adminError.hidden = true;
    const password = els.adminPassword.value;
    if (!password) {
      els.adminError.textContent = "Enter the admin password.";
      els.adminError.hidden = false;
      return;
    }
    els.adminLoginBtn.disabled = true;
    els.adminLoginBtn.textContent = "Signing in…";
    try {
      await fetchJson("api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      state.adminSignedIn = true;
      applyAdminUi();
      renderList();
      if (state.mode === "detail") show(els.detailRemove, true);
      closeAdmin();
    } catch (error) {
      els.adminError.textContent = error.message || "Could not sign in.";
      els.adminError.hidden = false;
      els.adminLoginBtn.disabled = false;
      els.adminLoginBtn.textContent = "Sign in";
    }
  });
  els.formView.addEventListener("close", () => {
    document.body.classList.remove("form-open");
    show(els.mapHint, false);
  });
  els.galleryView.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeGallery();
  });
  els.galleryView.addEventListener("close", () => {
    document.body.classList.remove("gallery-open");
  });
  if (els.safetyView) {
    els.safetyView.addEventListener("cancel", (event) => {
      event.preventDefault();
      closeSafety();
    });
    els.safetyView.addEventListener("close", () => {
      document.body.classList.remove("safety-open");
    });
  }
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (isConfirmOpen()) {
      event.preventDefault();
      closeConfirm();
      return;
    }
    if (isAdminOpen()) {
      event.preventDefault();
      closeAdmin();
      return;
    }
    if (isSafetyOpen()) {
      event.preventDefault();
      closeSafety();
      return;
    }
    if (isGalleryOpen()) {
      event.preventDefault();
      closeGallery();
      return;
    }
    if (isFormOpen()) {
      event.preventDefault();
      closeForm();
    }
  });

  els.speciesPicker.addEventListener("click", (event) => {
    const card = event.target.closest(".species-card");
    if (!card) return;
    highlightSpecies(card.dataset.species);
    if (state.galleryPicking && isFormOpen()) {
      els.species.value = card.dataset.species;
      closeGallery();
      els.species.focus();
    }
  });
  els.species.addEventListener("input", () => highlightSpecies(els.species.value));

  function useCurrentLocation() {
    els.formError.hidden = true;
    if (!navigator.geolocation) {
      els.formError.textContent =
        "This browser cannot share your location. Click the map or type coordinates.";
      els.formError.hidden = false;
      return;
    }
    const request = ++state.locateRequest;
    els.locateBtn.disabled = true;
    els.locateBtn.textContent = "Finding location…";
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== state.locateRequest) return;
        els.locateBtn.disabled = false;
        els.locateBtn.textContent = "Use current location";
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!inSurveyArea(latitude, longitude)) {
          els.formError.textContent =
            "Your location is outside Edgars Creek in Coburg North. Click the map or type coordinates in that area.";
          els.formError.hidden = false;
          return;
        }
        setPickPosition(latitude, longitude);
        if (state.map) {
          const spot = { lat: latitude, lng: longitude };
          state.map.panTo(spot);
          if (state.map.getZoom() < 16) state.map.setZoom(16);
        }
      },
      (error) => {
        if (request !== state.locateRequest) return;
        els.locateBtn.disabled = false;
        els.locateBtn.textContent = "Use current location";
        if (error && error.code === 1) {
          els.formError.textContent =
            "Location access is off. Allow it in the browser, or click the map.";
        } else if (error && error.code === 3) {
          els.formError.textContent =
            "Finding your location took too long. Try again, or click the map.";
        } else {
          els.formError.textContent =
            "Current location is unavailable. Click the map or type coordinates.";
        }
        els.formError.hidden = false;
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }

  if (els.locateBtn) els.locateBtn.addEventListener("click", useCurrentLocation);

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

  function onMapsAuthFailure() {
    if (state.mapsAuthFailed) return;
    state.mapsAuthFailed = true;
    showMapFallback(
      "Google Maps could not load. Check GOOGLE_MAPS_API_KEY, then restart the app. You can still enter latitude and longitude."
    );
  }

  if (!config.mapsEnabled) {
    showMapFallback();
  } else {
    window.addEventListener("google-maps-ready", initMap);
    window.addEventListener("google-maps-auth-failure", onMapsAuthFailure);
    if (window.__snakeMapsAuthFailed) onMapsAuthFailure();
    else if (mapsApiReady()) initMap();
    window.setTimeout(() => {
      if (state.map || state.mapsAuthFailed) return;
      if (mapsApiReady()) {
        initMap();
        return;
      }
      showMapFallback(
        "Google Maps did not finish loading. Enter latitude and longitude to keep logging sightings."
      );
    }, 8000);
  }

  setMode("list");
  applyAdminUi();
  refreshAdminSession();
  loadSightings();
  window.setInterval(refreshRelativeTimes, 30000);
})();
