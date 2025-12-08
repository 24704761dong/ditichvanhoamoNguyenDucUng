const state = {
  points: [],
  timeline: [],
  museum: [],
  markers: [],
  map: null,
  leafletMarkers: {},
  routeAnimation: null,
  timelineVis: null,
  tourInterval: null,
  currentMarkerAudio: null,
  currentLang: "vi"
};

const DATA_PATHS = {
  points: "data/points.json",
  timeline: "data/timeline.json",
  museum: "data/museum.json",
  markers: "data/ar_markers.json"
};

const PLACEHOLDER_IMAGE = "assets/images/anh_tu_lieu_canduy.svg";
const PLACEHOLDER_ALT = "Đồ hoạ mô phỏng XR Lab";
const SHARED_AUDIO_SRC = "assets/audio/audio_thuyet_minh.wav";

const encodeAssetPath = (path) => {
  if (!path) return "";
  try {
    return encodeURI(path);
  } catch (error) {
    console.warn("Không encode được đường dẫn:", path, error);
    return path;
  }
};

async function fetchJSON(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Không tải được ${path}`);
  }
  return response.json();
}

function injectStatusBanner(message, selector = ".hero") {
  const target = document.querySelector(selector);
  if (!target) return;
  target.insertAdjacentHTML("beforeend", `<p class="status-banner">${message}</p>`);
}

async function init() {
  let points = [];
  let timeline = [];
  let museum = [];
  let markers = [];
  try {
    const [pointsRes, timelineRes, museumRes, markersRes] = await Promise.allSettled([
      fetchJSON(DATA_PATHS.points),
      fetchJSON(DATA_PATHS.timeline),
      fetchJSON(DATA_PATHS.museum),
      fetchJSON(DATA_PATHS.markers)
    ]);

    const parseResult = (result, label) => {
      if (result.status === "fulfilled") {
        return result.value;
      }
      console.warn(`Không tải được ${label}:`, result.reason);
      injectStatusBanner(`Không tải được ${label}. Đang hiển thị giao diện mô phỏng không có dữ liệu.`);
      return [];
    };

    points = parseResult(pointsRes, "điểm bản đồ");
    timeline = parseResult(timelineRes, "timeline");
    museum = parseResult(museumRes, "bảo tàng ảo");
    markers = parseResult(markersRes, "danh sách marker AR");
  } catch (error) {
    console.error(error);
    injectStatusBanner(`Lỗi khởi tạo: ${error.message}`);
  } finally {
    state.points = points;
    state.timeline = timeline;
    state.museum = museum;
    state.markers = markers;

    renderMuseum(museum);
    initAR(markers);
    initMap(points, museum);
    initTimeline(timeline);
    bindUI();
  }
}

function renderMuseum(items) {
  const grid = document.getElementById("museum-grid");
  if (!grid) return;
  grid.innerHTML = "";
  if (!items?.length) {
    grid.innerHTML = `<p class="status-banner status-banner--inline">Chưa có hiện vật trong data/museum.json.</p>`;
    return;
  }
  items.forEach((item, index) => {
    const primaryMedia = item.media?.[0];
    const imageSrc = encodeAssetPath(primaryMedia?.url) || PLACEHOLDER_IMAGE;
    const imageAlt = primaryMedia?.alt || PLACEHOLDER_ALT;
    const card = document.createElement("article");
    card.className = "gallery-card";
    card.innerHTML = `
      <img src="${imageSrc}" alt="${imageAlt}" loading="lazy" />
      <div class="card-body">
        <p class="eyebrow">${item.category || "Hiện vật"}</p>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <button class="btn ghost" data-museum="${item.id}" aria-label="Xem chi tiết ${item.title}">Xem chi tiết</button>
      </div>
    `;
    grid.appendChild(card);
  });
}

function initAR(markers) {
  const list = document.getElementById("ar-marker-list");
  const modelViewer = document.getElementById("qr-model-viewer");
  const arEntity = document.getElementById("ar-entity");
  const markerEl = document.getElementById("dynamic-marker");
  const audioButton = document.getElementById("play-ar-audio");

  if (!list || !modelViewer || !arEntity || !markerEl || !audioButton) return;

  list.innerHTML = "";
  if (!markers?.length) {
    list.innerHTML = `<li class="status-banner">Chưa có marker để hiển thị. Kiểm tra file data/ar_markers.json.</li>`;
    return;
  }
  markers.forEach((marker, index) => {
    const li = document.createElement("li");
    li.className = "marker-item";
    li.innerHTML = `
      <h4>${marker.title}</h4>
      <p>${marker.description}</p>
      <div class="cta-group">
        <button class="btn primary" data-marker="${marker.id}">Nạp marker</button>
        <a class="btn ghost" href="${marker.qrLink}" target="_blank" rel="noopener">Mở AR (QR)</a>
      </div>
    `;
    list.appendChild(li);
  });

  const setMarker = (marker) => {
    if (!marker) return;
    const patternUrl = encodeAssetPath(marker.patternUrl) || marker.patternUrl;
    const modelUrl = encodeAssetPath(marker.modelUrl) || marker.modelUrl;
    const audioSrc = encodeAssetPath(marker.audio) || encodeAssetPath(SHARED_AUDIO_SRC);
    markerEl.setAttribute("type", "pattern");
    markerEl.setAttribute("url", patternUrl);
    arEntity.setAttribute("gltf-model", modelUrl);
    arEntity.setAttribute("scale", marker.modelScale);
    arEntity.setAttribute("rotation", marker.modelRotation);
    arEntity.setAttribute("position", marker.modelPosition);
    modelViewer.setAttribute("src", modelUrl);
    modelViewer.setAttribute("ios-src", modelUrl);
    modelViewer.setAttribute("ar", "ar");
    audioButton.dataset.audioSrc = audioSrc || SHARED_AUDIO_SRC;
  };

  list.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-marker]");
    if (!btn) return;
    const markerId = btn.dataset.marker;
    const marker = markers.find((m) => m.id === markerId);
    setMarker(marker);
  });

  audioButton.addEventListener("click", () => {
    const src = audioButton.dataset.audioSrc;
    if (!src) {
      alert("Chưa có file audio cho marker này.");
      return;
    }
    if (state.currentMarkerAudio) {
      state.currentMarkerAudio.pause();
    }
    state.currentMarkerAudio = new Audio(src);
    state.currentMarkerAudio.play().catch(() => {
      alert("Không phát được audio. Kiểm tra file hoặc HTTPS.");
    });
  });

  setMarker(markers[0]);
}

function initMap(points, museumItems) {
  const container = document.getElementById("map-container");
  if (!container) return;
  if (typeof L === "undefined" || !L?.map) {
    container.innerHTML = `<p class="status-banner status-banner--inline">Không tải được Leaflet từ CDN. Kiểm tra kết nối mạng hoặc cấu hình script.</p>`;
    return;
  }

  const safePoints = Array.isArray(points) ? points : [];
  const safeMuseumItems = Array.isArray(museumItems) ? museumItems : [];

  container.innerHTML = "";
  const map = L.map(container).setView([16.046, 108.188], 15);
  const todayLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
    maxZoom: 19
  }).addTo(map);
  const historicLayer = L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
    attribution: "© OSM France",
    maxZoom: 19
  });

  const historyPolygon = L.polygon([
    [16.043, 108.186],
    [16.05, 108.186],
    [16.051, 108.193],
    [16.044, 108.194]
  ], {
    color: "#d9a66a",
    weight: 2,
    fillOpacity: 0.12,
    dashArray: "4 6"
  });

  const overlayGroup = L.layerGroup([historyPolygon]);

  const heritageLocation = { lat: 16.0462, lng: 108.1885 };
  const heritageCircle = L.circleMarker([heritageLocation.lat, heritageLocation.lng], {
    color: "#d98b3a",
    weight: 2,
    fillColor: "#f6c98d",
    fillOpacity: 0.65,
    radius: 12
  }).bindTooltip("Khu di tích Nghĩa binh", { permanent: false, direction: "top" });
  const heritageLayer = L.layerGroup([heritageCircle]).addTo(map);

  const pointsGroup = L.layerGroup().addTo(map);

  safePoints.forEach((point) => {
    const marker = L.marker([point.lat, point.lng]).addTo(pointsGroup);
    const museumItem = safeMuseumItems.find((item) => item.id === point.museum_item_id);
    const firstImage = encodeAssetPath(point.images?.[0]);
    const pointAudio = encodeAssetPath(point.audio || SHARED_AUDIO_SRC);
    const arTarget = encodeAssetPath(point.ar_target);
    const popupHtml = `
      <div class="map-popup">
        <h3>${point.title}</h3>
        <p>${point.short_desc}</p>
        ${firstImage ? `<img src="${firstImage}" alt="${point.title}" loading="lazy" />` : ""}
        <div class="cta-group">
          ${pointAudio ? `<button class="btn ghost" data-audio="${pointAudio}">Nghe audio</button>` : ""}
          ${arTarget ? `<button class="btn primary" data-ar="${arTarget}">Mở AR</button>` : ""}
          <button class="btn ghost" data-museum="${point.museum_item_id}">Chi tiết</button>
        </div>
      </div>
    `;
    marker.bindPopup(popupHtml);
    state.leafletMarkers[point.id] = marker;
  });

  if (!safePoints.length) {
    container.insertAdjacentHTML(
      "beforeend",
      `<div class="status-banner map-status-overlay">Chưa có điểm tham quan trong data/points.json, bản đồ sẽ hiển thị khi dữ liệu sẵn sàng.</div>`
    );
  }

  container.addEventListener("click", (event) => {
    const audioBtn = event.target.closest("button[data-audio]");
    const arBtn = event.target.closest("button[data-ar]");
    const museumBtn = event.target.closest("button[data-museum]");
    if (audioBtn) {
      new Audio(audioBtn.dataset.audio).play();
    }
    if (arBtn) {
      openModal(`<h2>Mở AR</h2><model-viewer src="${arBtn.dataset.ar}" ar ar-modes="scene-viewer quick-look webxr" camera-controls></model-viewer>`);
    }
    if (museumBtn) {
      showMuseumModal(museumBtn.dataset.museum);
    }
  });

  const baseLayers = {
    "Bản đồ hôm nay": todayLayer,
    "Bản đồ vệ tinh nhân đạo": historicLayer
  };
  const overlays = {
    "Vùng lịch sử": overlayGroup,
    "Khu di tích Nghĩa binh": heritageLayer,
    "Điểm trưng bày": pointsGroup
  };

  L.control.layers(baseLayers, overlays).addTo(map);
  state.map = map;
}

function focusMap(pointId) {
  const marker = state.leafletMarkers[pointId];
  if (!marker || !state.map) return;
  state.map.setView(marker.getLatLng(), 17, { animate: true });
  marker.openPopup();
}

function initTimeline(data) {
  const container = document.getElementById("timeline-container");
  const canvas = document.getElementById("timeline-chart");
  if (!container || !canvas) return;

  const showMessage = (message) => {
    container.innerHTML = `<p class="status-banner status-banner--inline">${message}</p>`;
    renderTimelineStory([]);
  };

  if (typeof Chart === "undefined") {
    showMessage("Không tải được Chart.js. Kiểm tra CDN hoặc kết nối mạng.");
    return;
  }

  if (!data?.length) {
    showMessage("Chưa có dữ liệu timeline trong data/timeline.json.");
    return;
  }

  if (state.timelineVis?.destroy) {
    state.timelineVis.destroy();
  }

  const sorted = [...data].sort((a, b) => new Date(a.dateStart) - new Date(b.dateStart));
  const points = sorted.map((item, index) => ({
    x: item.dateStart,
    y: index + 1,
    id: item.id,
    title: item.title,
    summary: item.summary,
    mapPointId: item.mapPointId
  }));

  const ctx = canvas.getContext("2d");
  const chart = new Chart(ctx, {
    type: "line",
    data: {
      datasets: [
        {
          label: "Mốc thời gian nghĩa binh",
          data: points,
          parsing: false,
          borderColor: "#2b3a67",
          backgroundColor: "rgba(43, 58, 103, 0.15)",
          pointBackgroundColor: "#d9a66a",
          pointBorderColor: "#2b3a67",
          pointHoverRadius: 7,
          pointRadius: 5,
          pointHitRadius: 12,
          tension: 0.3,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: "nearest",
        axis: "x",
        intersect: false
      },
      scales: {
        x: {
          type: "time",
          time: {
            unit: "year",
            tooltipFormat: "dd/MM/yyyy"
          },
          grid: { color: "rgba(0,0,0,0.05)" },
          ticks: { color: "#2b3a67" },
          title: { display: true, text: "Năm" }
        },
        y: {
          ticks: {
            stepSize: 1,
            callback: (value) => `Mốc ${value}`
          },
          min: 0,
          grid: { display: false },
          title: { display: true, text: "Trình tự sự kiện" }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (context) => {
              const point = context[0]?.raw;
              if (!point) return "Mốc";
              const date = new Date(point.x);
              return `${point.title} · ${date.toLocaleDateString("vi-VN")}`;
            },
            label: (context) => context.raw?.summary || "Không có mô tả"
          }
        }
      },
      onClick: (_, elements) => {
        if (!elements?.length) return;
        const point = points[elements[0].index];
        if (!point) return;
        const timelineItem = data.find((item) => item.id === point.id) || sorted[elements[0].index];
        if (!timelineItem) return;
        showTimelineModal(timelineItem);
        if (timelineItem.mapPointId) {
          focusMap(timelineItem.mapPointId);
        }
      }
    }
  });

  state.timelineVis = chart;
  renderTimelineStory(sorted);
}

function showTimelineModal(item) {
  const mediaHtml = item.media
    ?.map((media) => {
      const url = encodeAssetPath(media.url) || media.url;
      if (media.type === "image") {
        return `<img src="${url}" alt="${media.caption}" loading="lazy" />`;
      }
      if (media.type === "video") {
        return `<iframe width="100%" height="315" src="${media.url}" title="Video timeline" allowfullscreen></iframe>`;
      }
      if (media.type === "audio") {
        return `<audio controls src="${url}"></audio>`;
      }
      return "";
    })
    .join("");
  openModal(`
    <h2 id="modal-title">${item.title}</h2>
    <p><strong>Thời gian:</strong> ${item.dateStart}${item.dateEnd ? ` – ${item.dateEnd}` : ""}</p>
    <p>${item.summary}</p>
    ${mediaHtml || ""}
  `);
}

function renderTimelineStory(items) {
  const storyContainer = document.getElementById("timeline-story");
  if (!storyContainer) return;
  storyContainer.innerHTML = "";
  if (!items?.length) {
    storyContainer.innerHTML = `<p class="status-banner status-banner--inline">Chưa có diễn biến lịch sử để hiển thị.</p>`;
    return;
  }
  items.forEach((item) => {
    const article = document.createElement("article");
    const formattedDate = new Date(item.dateStart).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
    article.innerHTML = `
      <h3>${item.title}</h3>
      <time datetime="${item.dateStart}">${formattedDate}${item.dateEnd ? ` – ${new Date(item.dateEnd).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}` : ""}</time>
      <p>${item.summary}</p>
    `;
    storyContainer.appendChild(article);
  });
}

function showMuseumModal(id) {
  const item = state.museum.find((entry) => entry.id === id);
  if (!item) return;
  const mediaBlocks = item.media
    ?.map((media) => {
      const url = encodeAssetPath(media.url) || media.url;
      if (media.type === "image") {
        return `<figure><img src="${url}" alt="${media.alt || item.title}" loading="lazy" /><figcaption>${media.caption || ""}</figcaption></figure>`;
      }
      if (media.type === "audio") {
        return `<audio controls src="${url}"></audio>`;
      }
      return "";
    })
    .join("");
  const modelBlock = item.model
    ? `<model-viewer src="${encodeAssetPath(item.model) || item.model}" ar camera-controls shadow-intensity="0.6"></model-viewer>`
    : "";
  const audioGuide = encodeAssetPath(item.audioGuide) || item.audioGuide;
  openModal(`
    <h2 id="modal-title">${item.title}</h2>
    <p>${item.description}</p>
    <p><strong>Niên đại:</strong> ${item.date} · <strong>Tác giả:</strong> ${item.creator}</p>
    <p><strong>Provenance:</strong> ${item.provenance}</p>
    ${mediaBlocks || ""}
    ${modelBlock}
    ${audioGuide ? `<audio controls src="${audioGuide}"></audio>` : ""}
    <p class="status-banner">Sản phẩm mô phỏng.</p>
  `);
}

function bindUI() {
  const modal = document.getElementById("modal");
  const modalClose = document.getElementById("modal-close");
  if (modal && modalClose) {
    modalClose.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
  }

  document.body.addEventListener("click", (event) => {
    const museumBtn = event.target.closest("button[data-museum]");
    if (museumBtn) {
      showMuseumModal(museumBtn.dataset.museum);
    }
  });

  const startTourBtn = document.getElementById("start-tour");
  const stopTourBtn = document.getElementById("stop-tour");
  startTourBtn?.addEventListener("click", startTour);
  stopTourBtn?.addEventListener("click", stopTour);

  document.getElementById("play-route")?.addEventListener("click", playRouteAnimation);
  document.getElementById("reset-route")?.addEventListener("click", resetRouteAnimation);

  initLangSwitch();
  initMenuToggle();
  initScanOverlay();
}

function initLangSwitch() {
  const toggle = document.getElementById("lang-toggle");
  const menu = document.getElementById("lang-menu");
  if (!toggle || !menu) return;

  const toggleMenu = () => {
    const expanded = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!expanded));
    menu.hidden = expanded;
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  menu.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-lang]");
    if (!btn) return;
    const lang = btn.dataset.lang;
    state.currentLang = lang;
    document.documentElement.lang = lang;
    const label = toggle.querySelector(".lang-code");
    if (label) label.textContent = lang.toUpperCase();
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    console.info("Đang xem bản trình diễn ở ngôn ngữ:", lang);
  });

  document.addEventListener("click", (event) => {
    if (menu.hidden) return;
    if (!menu.contains(event.target) && !toggle.contains(event.target)) {
      menu.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
    }
  });
}

function initMenuToggle() {
  const toggle = document.getElementById("menu-toggle");
  const nav = document.getElementById("primary-nav");
  if (!toggle || !nav) return;

  const closeMenu = () => {
    nav.classList.remove("is-open");
    nav.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
  };

  const openMenu = () => {
    nav.classList.add("is-open");
    nav.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (nav.classList.contains("is-open")) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  nav.addEventListener("click", (event) => {
    if (event.target.tagName === "A") {
      closeMenu();
    }
  });

  document.addEventListener("click", (event) => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) {
      closeMenu();
    }
  });
}

function initScanOverlay() {
  const trigger = document.getElementById("scan-trigger");
  const overlay = document.getElementById("scan-overlay");
  const arViewport = document.getElementById("ar-viewport");
  const arScene = document.querySelector(".ar-viewport__scene");
  if (!trigger || !overlay) return;

  const statusEl = overlay.querySelector(".scan-status");
  const defaultStatus = statusEl?.textContent || "Đang quét… chưa nhận diện được marker hợp lệ.";
  const restoreBodyScroll = () => {
    const modal = document.getElementById("modal");
    if (modal?.getAttribute("aria-hidden") === "false") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
  };

  const closeOverlay = () => {
    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    if (statusEl) statusEl.textContent = defaultStatus;
    restoreBodyScroll();
  };

  const openOverlay = () => {
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const activateArViewport = () => {
    if (!arViewport) return;
    if (arViewport.dataset.state === "active") return;
    arViewport.dataset.state = "active";
    arViewport.removeAttribute("hidden");
    arViewport.setAttribute("aria-busy", "false");
    if (arScene) {
      arScene.setAttribute("aria-hidden", "false");
    }
  };

  trigger.addEventListener("click", () => {
    activateArViewport();
    openOverlay();
    if (statusEl) {
      statusEl.textContent = "Đang quét… vui lòng giữ khung hình ổn định.";
      setTimeout(() => {
        if (overlay.classList.contains("is-visible") && statusEl) {
          statusEl.textContent = "Không phát hiện marker hợp lệ trong vùng nhìn.";
        }
      }, 1800);
    }
  });

  overlay.querySelectorAll("[data-close-scan]").forEach((btn) => {
    btn.addEventListener("click", closeOverlay);
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });
}

function openModal(html) {
  const modal = document.getElementById("modal");
  const body = document.getElementById("modal-body");
  if (!modal || !body) return;
  body.innerHTML = html;
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeModal() {
  const modal = document.getElementById("modal");
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
  const scanOverlay = document.getElementById("scan-overlay");
  if (scanOverlay?.classList.contains("is-visible")) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "auto";
  }
}

function startTour() {
  const cards = Array.from(document.querySelectorAll(".gallery-card"));
  if (!cards.length) return;
  let index = 0;
  stopTour();
  cards.forEach((card) => card.classList.remove("is-highlighted"));
  state.tourInterval = setInterval(() => {
    cards.forEach((card) => card.classList.remove("is-highlighted"));
    const card = cards[index % cards.length];
    card.classList.add("is-highlighted");
    card.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
    index += 1;
  }, 4000);
}

function stopTour() {
  if (state.tourInterval) {
    clearInterval(state.tourInterval);
    state.tourInterval = null;
  }
  document.querySelectorAll(".gallery-card").forEach((card) => card.classList.remove("is-highlighted"));
}

function playRouteAnimation() {
  if (!state.map || !state.points.length) return;
  resetRouteAnimation();
  const ordered = [...state.points].sort((a, b) => (a.route_order || 0) - (b.route_order || 0));
  const route = ordered.map((point) => [point.lat, point.lng]);
  const polyline = L.polyline([], { color: "#2b3a67", weight: 4 }).addTo(state.map);
  state.routeAnimation = { polyline, progress: 0, route };
  const step = () => {
    if (!state.routeAnimation) return;
    const { polyline, route, progress } = state.routeAnimation;
    if (progress >= route.length) {
      state.routeAnimation = null;
      return;
    }
    polyline.addLatLng(route[progress]);
    state.routeAnimation.progress += 1;
    focusMap(ordered[progress].id);
    state.routeAnimation.timer = setTimeout(step, 1500);
  };
  step();
}

function resetRouteAnimation() {
  if (state.routeAnimation?.polyline) {
    state.map.removeLayer(state.routeAnimation.polyline);
  }
  if (state.routeAnimation?.timer) {
    clearTimeout(state.routeAnimation.timer);
  }
  state.routeAnimation = null;
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
  }
});

init();
