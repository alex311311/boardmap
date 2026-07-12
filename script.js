const flightStage = document.querySelector(".flight-scroll");
const progressText = document.querySelector("#progressText");
const progressBar = document.querySelector("#progressBar");
const chapterKicker = document.querySelector("#chapterKicker");
const chapterTitle = document.querySelector("#chapterTitle");
const chapterLine = document.querySelector("#chapterLine");
const flightCanvas = document.querySelector("#flightCanvas");
const flightCtx = flightCanvas.getContext("2d");
const windCanvas = document.querySelector("#wind");
const windCtx = windCanvas.getContext("2d");
const worldMap = document.querySelector("#world-map");
const atlasVideo = document.querySelector(".atlas-video");
const completionLinks = document.querySelectorAll("#mapEntry, .nav-map-link");
const heroLinks = document.querySelectorAll('.brand, .nav-links a[href="#flight"]');
const regionHotspots = document.querySelectorAll("[data-region]");
const regionView = document.querySelector("#region-map");
const regionKicker = document.querySelector("#regionKicker");
const regionTitle = document.querySelector("#regionTitle");
const regionDescription = document.querySelector("#regionDescription");
const regionImage = document.querySelector("#regionImage");
const atlasReturn = document.querySelector("#atlasReturn");
const regionBoard = document.querySelector("#regionBoard");
const nodeStateCanvas = document.querySelector("#nodeStateCanvas");
const nodeStateCtx = nodeStateCanvas?.getContext("2d");
const hitMapCanvas = document.querySelector("#hitMapCanvas");
const hitMapCtx = hitMapCanvas?.getContext("2d", { willReadFrequently: true });
const gameDetail = document.querySelector("#gameDetail");
const gameDetailClose = document.querySelector("#gameDetailClose");
const gameDetailStatus = document.querySelector("#gameDetailStatus");
const gameDetailTitle = document.querySelector("#gameDetailTitle");
const gameDetailGenre = document.querySelector("#gameDetailGenre");
const gameDetailTheme = document.querySelector("#gameDetailTheme");
const gameDetailPlayers = document.querySelector("#gameDetailPlayers");
const gameDetailTime = document.querySelector("#gameDetailTime");
const gameDetailDifficulty = document.querySelector("#gameDetailDifficulty");
const gameDetailLastPlayed = document.querySelector("#gameDetailLastPlayed");
const gameDetailLastPlayers = document.querySelector("#gameDetailLastPlayers");
const cloudTransition = document.querySelector("#cloudTransition");
const cloudTransitionTitle = document.querySelector("#cloudTransitionTitle");
const cloudTransitionVideo = document.querySelector("#cloudTransitionVideo");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
const summaryProgress = document.querySelector("#summaryProgress");
const summaryOpened = document.querySelector("#summaryOpened");
const summaryRanks = document.querySelector("#summaryRanks");
const summaryTopGame = document.querySelector("#summaryTopGame");

const frameCount = 241;
const frameRate = 24;
const maxFrameCache = 44;
const preloadRadius = 14;
const frameCache = new Map();
const boardmapData = window.BOARDMAP_DATA || {
  boardGames: [],
  boardGameLocations: [],
  playSessions: []
};

function dataArray(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.value)) return value.value;
  return [];
}

const chapters = [
  {
    kicker: "Boardmap opens.",
    title: "Top down",
    line: "Only those who sketch the forest first know where to plant each tree."
  },
  {
    kicker: "Forward motion.",
    title: "Game",
    line: "A game is a series of interesting choices. - Sid Meier"
  },
  {
    kicker: "Cloud passage.",
    title: "Life",
    line: "Real life consists of bluffing, of little tactics of deception, of asking yourself what is the other man going to think I mean to do. And that is what games are about in my theory. - John von Neumann"
  },
  {
    kicker: "Map arrival.",
    title: "Atlas",
    line: "When the flight reaches the end, the Boardmap world is ready to enter."
  }
];

const regions = {
  "strategy-plains": {
    kicker: "Strategy Plains",
    title: "Strategy Plains",
    description: "Introductory strategy, card, set, and abstract games.",
    image: "assets/map/regions/strategy-plains.png",
    alt: "Strategy Plains region map"
  },
  "engine-highlands": {
    kicker: "Engine Highlands",
    title: "Engine Highlands",
    description: "Build-up, engine, resource, and economy games.",
    image: "assets/map/regions/engine-highlands.png",
    alt: "Engine Highlands region map"
  },
  "route-territory-coast": {
    kicker: "Route & Territory Coast",
    title: "Route & Territory Coast",
    description: "Route building, area control, tile placement, and territory games.",
    image: "assets/map/regions/route-territory-coast.png",
    alt: "Route and Territory Coast region map"
  },
  "social-isles": {
    kicker: "Social Isles",
    title: "Social Isles",
    description: "Social deduction, mafia, negotiation, and party-driven games.",
    image: "assets/map/regions/social-isles.png",
    alt: "Social Isles region map"
  },
  "wagering-port": {
    kicker: "Wagering Port",
    title: "Wagering Port",
    description: "Betting, prediction, auction, and trading games.",
    image: "assets/map/regions/wagering-port.png",
    alt: "Wagering Port region map"
  },
  "mystery-district": {
    kicker: "Mystery District",
    title: "Mystery District",
    description: "Deduction, murder mystery, escape-room, and investigation games.",
    image: "assets/map/regions/mystery-district.png",
    alt: "Mystery District region map"
  }
};

const boardGames = dataArray(boardmapData.boardGames);
const boardGameLocations = dataArray(boardmapData.boardGameLocations);
const playSessions = [];
const sharedMembers = new Map();
const sessionMemberIds = new Map();
const gamesById = new Map(boardGames.map((game) => [game.id, game]));
const playCountsByGame = playSessions.reduce((counts, session) => {
  counts.set(session.gameId, (counts.get(session.gameId) || 0) + 1);
  return counts;
}, new Map());
const placedLocations = boardGameLocations.filter((location) => location.placementStatus === "placed");
const REGION_CANVAS_WIDTH = 1536;
const REGION_CANVAS_HEIGHT = 1024;
const DEFAULT_NODE_GEOMETRY = { visualRadiusX: 34, visualRadiusY: 23, hitRadiusX: 37, hitRadiusY: 25 };
const REGION_NODE_GEOMETRY = {
  "strategy-plains": { visualRadiusX: 43, visualRadiusY: 26, hitRadiusX: 44, hitRadiusY: 27 },
  "engine-highlands": { visualRadiusX: 46, visualRadiusY: 27, hitRadiusX: 47, hitRadiusY: 28 },
  "route-territory-coast": { visualRadiusX: 36, visualRadiusY: 22, hitRadiusX: 37, hitRadiusY: 23 },
  "social-isles": DEFAULT_NODE_GEOMETRY,
  "wagering-port": { visualRadiusX: 37, visualRadiusY: 32, hitRadiusX: 38, hitRadiusY: 33 },
  "mystery-district": { visualRadiusX: 42, visualRadiusY: 28, hitRadiusX: 43, hitRadiusY: 29 }
};
const hitColorToNodeKey = new Map();

let targetProgress = 0;
let currentProgress = 0;
let duration = frameCount / frameRate;
let width = window.innerWidth;
let height = window.innerHeight;
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
let particles = [];
let lastScrollY = window.scrollY;
let scrollVelocity = 0;
let isFlightComplete = null;
let isMapOpen = false;
let activeRegionId = null;
let selectedNodeKey = null;
let isScreenTransitioning = false;
let selectedMobileRegionId = null;
const visitedDestinationTitles = new Set(["Boardmap"]);
let regionOverlayMetrics = {
  left: 0,
  top: 0,
  width: REGION_CANVAS_WIDTH,
  height: REGION_CANVAS_HEIGHT
};

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

async function loadSharedPlaySessions() {
  const db = window.supabaseBoardmapDataSource?.client;
  if (!db) return;
  const [sessions, members, participants] = await Promise.all([
    db.from("play_sessions").select("id, game_id, played_at, note, created_at"),
    db.from("members").select("id, display_name"),
    db.from("play_session_members").select("session_id, member_id")
  ]);
  [sessions, members, participants].forEach(({ error }) => { if (error) throw error; });
  playSessions.splice(0, playSessions.length, ...sessions.data.map((record) => ({
    id: record.id,
    gameId: record.game_id,
    date: record.played_at,
    note: record.note || "",
    createdAt: record.created_at
  })));
  sharedMembers.clear();
  members.data.forEach((member) => sharedMembers.set(member.id, member.display_name));
  sessionMemberIds.clear();
  participants.data.forEach((participant) => {
    const ids = sessionMemberIds.get(participant.session_id) || [];
    ids.push(participant.member_id);
    sessionMemberIds.set(participant.session_id, ids);
  });
  playCountsByGame.clear();
  playSessions.forEach((session) => playCountsByGame.set(session.gameId, (playCountsByGame.get(session.gameId) || 0) + 1));
  renderProgressSummary();
  if (activeRegionId) renderRegionCanvases(activeRegionId);
}

function getLatestSession(gameId) {
  return playSessions
    .filter((session) => session.gameId === gameId)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;
}

function getLatestPlayers(gameId) {
  const latest = getLatestSession(gameId);
  if (!latest) return [];
  return (sessionMemberIds.get(latest.id) || [])
    .map((memberId) => sharedMembers.get(memberId))
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "ko"));
}

function renderProgressSummary() {
  const totals = { locked: 0, bronze: 0, silver: 0, gold: 0 };
  boardGames.forEach((game) => { totals[getGameStatus(game.id).key] += 1; });
  const opened = boardGames.length - totals.locked;
  const percent = boardGames.length ? Math.round((opened / boardGames.length) * 100) : 0;
  const top = [...playCountsByGame.entries()].sort((a, b) => b[1] - a[1])[0];

  summaryProgress.textContent = `${percent}%`;
  summaryOpened.textContent = `${opened} of ${boardGames.length} opened`;
  summaryRanks.innerHTML = `<span>Bronze ${totals.bronze}</span><span>Silver ${totals.silver}</span><span>Gold ${totals.gold}</span>`;
  summaryTopGame.textContent = top ? `Most played: ${gamesById.get(top[0])?.title || "Unknown"} (${top[1]})` : "No plays recorded yet.";
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function waitForTransition(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function runCloudTransition(changeScreen, destinationTitle = "") {
  if (isScreenTransitioning || typeof changeScreen !== "function") return;

  const transitionTitle = destinationTitle && !visitedDestinationTitles.has(destinationTitle)
    ? destinationTitle
    : "";

  if (destinationTitle) visitedDestinationTitles.add(destinationTitle);

  if (!cloudTransition || reducedMotionQuery.matches) {
    changeScreen();
    return;
  }

  isScreenTransitioning = true;
  cloudTransition.hidden = false;
  cloudTransition.classList.remove("is-video-playing", "is-titled", "is-title-leaving", "is-title-only");
  cloudTransitionTitle.textContent = transitionTitle;
  cloudTransitionTitle.dataset.title = transitionTitle;
  if (cloudTransitionVideo) {
    cloudTransitionVideo.pause();
    cloudTransitionVideo.currentTime = 0;
    cloudTransitionVideo.playbackRate = 1;
  }
  void cloudTransition.offsetWidth;
  cloudTransition.classList.add("is-video-playing");
  await cloudTransitionVideo?.play().catch(() => {});
  await waitForTransition(2500);
  changeScreen();
  await waitForTransition(2540);
  cloudTransitionVideo?.pause();
  cloudTransition.classList.remove("is-video-playing");
  if (transitionTitle) {
    cloudTransition.classList.add("is-title-only");
    cloudTransition.classList.add("is-titled");
    await waitForTransition(2400);
    await waitForTransition(1000);
    cloudTransition.classList.remove("is-titled");
    cloudTransition.classList.add("is-title-leaving");
    await waitForTransition(280);
  }
  cloudTransition.hidden = true;
  cloudTransition.classList.remove("is-title-leaving", "is-title-only");
  cloudTransitionTitle.textContent = "";
  cloudTransitionTitle.dataset.title = "";
  isScreenTransitioning = false;
}

function updateTarget() {
  const scrollable = flightStage.offsetHeight - window.innerHeight;
  const localY = window.scrollY - flightStage.offsetTop;
  targetProgress = scrollable > 0 ? clamp(localY / scrollable) : 0;
  scrollVelocity = lerp(scrollVelocity, Math.abs(window.scrollY - lastScrollY) / Math.max(height, 1), 0.45);
  lastScrollY = window.scrollY;
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  flightCanvas.width = Math.floor(width * pixelRatio);
  flightCanvas.height = Math.floor(height * pixelRatio);
  flightCanvas.style.width = `${width}px`;
  flightCanvas.style.height = `${height}px`;
  flightCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  windCanvas.width = Math.floor(width * pixelRatio);
  windCanvas.height = Math.floor(height * pixelRatio);
  windCanvas.style.width = `${width}px`;
  windCanvas.style.height = `${height}px`;
  windCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  particles = Array.from({ length: width < 760 ? 20 : 34 }, () => ({
    angle: Math.random() * Math.PI * 2,
    radius: Math.random() * Math.max(width, height) * 0.72,
    z: Math.random(),
    length: 18 + Math.random() * 42
  }));

  updateTarget();
  syncRegionOverlayFit();
  if (width > 840 && selectedMobileRegionId) clearMobileRegionSelection();
}

function clearMobileRegionSelection() {
  selectedMobileRegionId = null;
  regionHotspots.forEach((hotspot) => {
    hotspot.classList.remove("is-mobile-selected");
    hotspot.setAttribute("aria-pressed", "false");
  });
}

function selectMobileRegion(hotspot, regionId) {
  selectedMobileRegionId = regionId;
  regionHotspots.forEach((candidate) => {
    const selected = candidate === hotspot;
    candidate.classList.toggle("is-mobile-selected", selected);
    candidate.setAttribute("aria-pressed", String(selected));
  });
}

function framePath(index) {
  return `assets/sequence/flight-${String(index + 1).padStart(3, "0")}.jpg`;
}

function loadFrame(index) {
  const safeIndex = Math.round(clamp(index, 0, frameCount - 1));
  const cached = frameCache.get(safeIndex);

  if (cached) {
    cached.lastUsed = performance.now();
    return cached;
  }

  const image = new Image();
  const record = {
    image,
    loaded: false,
    lastUsed: performance.now()
  };

  image.decoding = "async";
  image.onload = () => {
    record.loaded = true;
  };
  image.src = framePath(safeIndex);
  frameCache.set(safeIndex, record);
  return record;
}

function warmFrames(centerIndex) {
  loadFrame(centerIndex);
  loadFrame(centerIndex + 1);

  for (let offset = 1; offset <= preloadRadius; offset += 1) {
    loadFrame(centerIndex + offset);
    loadFrame(centerIndex - offset);
  }

  if (frameCache.size <= maxFrameCache) return;

  [...frameCache.entries()]
    .sort((a, b) => {
      const distanceA = Math.abs(a[0] - centerIndex);
      const distanceB = Math.abs(b[0] - centerIndex);
      return distanceB - distanceA || a[1].lastUsed - b[1].lastUsed;
    })
    .slice(0, frameCache.size - maxFrameCache)
    .forEach(([index]) => {
      if (Math.abs(index - centerIndex) > preloadRadius + 2) {
        frameCache.delete(index);
      }
    });
}

function nearestLoadedFrame(index) {
  let nearest = null;
  let nearestDistance = Infinity;

  frameCache.forEach((record, key) => {
    if (!record.loaded) return;

    const distance = Math.abs(key - index);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = record;
    }
  });

  return nearest;
}

function drawCover(context, image) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const sourceRatio = sourceWidth / sourceHeight;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let drawX = 0;
  let drawY = 0;

  if (sourceRatio > canvasRatio) {
    drawWidth = height * sourceRatio;
    drawX = (width - drawWidth) * 0.5;
  } else {
    drawHeight = width / sourceRatio;
    drawY = (height - drawHeight) * 0.5;
  }

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

function drawFlight(progress) {
  const exactFrame = progress * (frameCount - 1);
  const baseIndex = Math.floor(exactFrame);
  const nextIndex = Math.min(baseIndex + 1, frameCount - 1);
  const blend = exactFrame - baseIndex;
  const baseFrame = loadFrame(baseIndex);
  const nextFrame = loadFrame(nextIndex);
  const fallbackFrame = nearestLoadedFrame(baseIndex);

  warmFrames(baseIndex);

  flightCtx.clearRect(0, 0, width, height);

  if (baseFrame.loaded) {
    flightCtx.globalAlpha = 1;
    drawCover(flightCtx, baseFrame.image);
  } else if (fallbackFrame) {
    flightCtx.globalAlpha = 1;
    drawCover(flightCtx, fallbackFrame.image);
  } else {
    flightCtx.globalAlpha = 1;
    return;
  }

  if (nextFrame.loaded && nextIndex !== baseIndex) {
    flightCtx.globalAlpha = blend;
    drawCover(flightCtx, nextFrame.image);
    flightCtx.globalAlpha = 1;
  }
}

function drawWind(progress) {
  windCtx.clearRect(0, 0, width, height);

  const intensity = clamp(scrollVelocity * 2.4 + Math.abs(targetProgress - currentProgress) * 4.2, 0, 0.48);
  const centerX = width * (0.52 + Math.sin(progress * Math.PI) * 0.03);
  const centerY = height * (0.5 - progress * 0.035);
  const maxRadius = Math.hypot(width, height) * 0.62;

  if (intensity < 0.025) return;

  particles.forEach((particle) => {
    particle.radius += (1.6 + particle.z * 4.2) * (0.25 + intensity);

    if (particle.radius > maxRadius) {
      particle.angle = Math.random() * Math.PI * 2;
      particle.radius = Math.random() * 42;
      particle.z = Math.random();
      particle.length = 18 + Math.random() * 42;
    }

    const startRadius = Math.max(0, particle.radius - particle.length * (0.7 + intensity));
    const endRadius = particle.radius + particle.length * intensity;
    const startX = centerX + Math.cos(particle.angle) * startRadius;
    const startY = centerY + Math.sin(particle.angle) * startRadius;
    const endX = centerX + Math.cos(particle.angle) * endRadius;
    const endY = centerY + Math.sin(particle.angle) * endRadius;
    const alpha = clamp(intensity * (0.08 + particle.z * 0.11), 0.012, 0.16);

    windCtx.beginPath();
    windCtx.moveTo(startX, startY);
    windCtx.lineTo(endX, endY);
    windCtx.lineWidth = 0.45 + particle.z * 0.9;
    windCtx.strokeStyle = `rgba(251, 255, 244, ${alpha})`;
    windCtx.stroke();
  });
}

function renderCopy(progress) {
  const chapterIndex = Math.min(chapters.length - 1, Math.floor(progress * chapters.length));
  const chapter = chapters[chapterIndex];
  chapterKicker.textContent = chapter.kicker;
  chapterTitle.textContent = chapter.title;
  chapterLine.textContent = chapter.line;
}

function renderCompletionState(progress) {
  const completed = progress >= 0.985 || targetProgress >= 0.995;

  if (completed === isFlightComplete) return;

  isFlightComplete = completed;
  document.body.classList.toggle("is-flight-complete", completed);

  completionLinks.forEach((link) => {
    link.tabIndex = completed ? 0 : -1;
    link.setAttribute("aria-hidden", String(!completed));
  });
}

function openWorldMap() {
  if (!isFlightComplete || !worldMap) return;

  if (!isMapOpen) {
    isMapOpen = true;
    document.body.classList.add("is-map-open");
    worldMap.hidden = false;
    worldMap.setAttribute("aria-hidden", "false");
  }

  syncAtlasVideoPlayback();

}

function syncAtlasVideoPlayback() {
  if (!atlasVideo) return;

  const shouldPlay = isMapOpen && !activeRegionId && !reducedMotionQuery.matches;
  if (shouldPlay) {
    atlasVideo.play().catch(() => {});
  } else {
    atlasVideo.pause();
  }
}

function closeWorldMap() {
  if (!worldMap || !isMapOpen) return;

  if (activeRegionId) closeRegionMap();
  isMapOpen = false;
  document.body.classList.remove("is-map-open");
  worldMap.hidden = true;
  worldMap.setAttribute("aria-hidden", "true");
  syncAtlasVideoPlayback();

  requestAnimationFrame(() => {
    window.scrollTo({ top: flightStage.offsetTop, behavior: "auto" });
  });
}

function bindMapEntryLinks() {
  completionLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      if (!isFlightComplete) return;

      if (isMapOpen && activeRegionId) {
        runCloudTransition(closeRegionMap, "World Atlas");
        return;
      }

      if (!isMapOpen) runCloudTransition(openWorldMap, "World Atlas");
    });
  });

  heroLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      if (isMapOpen) {
        runCloudTransition(closeWorldMap, "Boardmap");
        return;
      }

      window.scrollTo({ top: flightStage.offsetTop, behavior: "smooth" });
    });
  });
}

function getGameStatus(gameId) {
  const count = playCountsByGame.get(gameId) || 0;

  if (count >= 10) return { key: "gold", label: "Gold", count };
  if (count >= 5) return { key: "silver", label: "Silver", count };
  if (count >= 1) return { key: "bronze", label: "Bronze", count };
  return { key: "locked", label: "Locked", count };
}

function getNodeGeometry(regionId) {
  return REGION_NODE_GEOMETRY[regionId] || DEFAULT_NODE_GEOMETRY;
}

function getRegionLocations(regionId) {
  return placedLocations
    .filter((location) => location.regionId === regionId)
    .sort((a, b) => {
      const gameA = gamesById.get(a.gameId);
      const gameB = gamesById.get(b.gameId);
      return (a.nodeOrder || gameA?.sourceOrder || 0) - (b.nodeOrder || gameB?.sourceOrder || 0);
    });
}

function getLocationNodeKey(location, index = 0) {
  return location.nodeId || location.gameId || `${location.regionId}-node-${location.nodeOrder || index + 1}`;
}

function colorForNode(index) {
  const value = index + 1;
  const red = value & 255;
  const green = (value >> 8) & 255;
  const blue = (value >> 16) & 255;
  return { red, green, blue, key: `${red},${green},${blue}` };
}

function ensureRegionCanvasSize() {
  if (!nodeStateCanvas || !hitMapCanvas) return;

  if (nodeStateCanvas.width !== REGION_CANVAS_WIDTH || nodeStateCanvas.height !== REGION_CANVAS_HEIGHT) {
    nodeStateCanvas.width = REGION_CANVAS_WIDTH;
    nodeStateCanvas.height = REGION_CANVAS_HEIGHT;
  }

  if (hitMapCanvas.width !== REGION_CANVAS_WIDTH || hitMapCanvas.height !== REGION_CANVAS_HEIGHT) {
    hitMapCanvas.width = REGION_CANVAS_WIDTH;
    hitMapCanvas.height = REGION_CANVAS_HEIGHT;
  }
}

function syncRegionOverlayFit() {
  if (!regionBoard) return;

  const rect = regionBoard.getBoundingClientRect();

  if (!rect.width || !rect.height) return;

  regionOverlayMetrics = {
    left: 0,
    top: 0,
    width: rect.width,
    height: rect.height
  };

  [regionImage, nodeStateCanvas, hitMapCanvas].forEach((element) => {
    if (!element) return;

    element.style.left = "0";
    element.style.top = "0";
    element.style.width = "100%";
    element.style.height = "100%";
  });
}

function locationToCanvasPoint(location) {
  return {
    x: (location.x / 100) * REGION_CANVAS_WIDTH,
    y: (location.y / 100) * REGION_CANVAS_HEIGHT
  };
}

function drawEllipse(context, x, y, radiusX, radiusY) {
  context.beginPath();
  context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
}

function drawLockedSlot(context, x, y, status, selected = false, geometry = DEFAULT_NODE_GEOMETRY) {
  const { visualRadiusX, visualRadiusY } = geometry;

  if (status.key === "locked") {
    context.save();
    context.globalAlpha = selected ? 1 : 0.62;

    if (selected) {
      context.shadowColor = "rgba(251, 255, 244, 0.34)";
      context.shadowBlur = 22;
      drawEllipse(context, x, y, visualRadiusX + 9, visualRadiusY + 7);
      context.strokeStyle = "rgba(251, 255, 244, 0.7)";
      context.lineWidth = 7;
      context.stroke();
      context.shadowColor = "transparent";
    }

    drawEllipse(context, x, y, visualRadiusX + 3, visualRadiusY + 2);
    context.lineWidth = selected ? 5 : 3;
    context.strokeStyle = selected ? "rgba(251, 255, 244, 0.98)" : "rgba(232, 238, 228, 0.62)";
    context.stroke();

    drawEllipse(context, x, y, visualRadiusX - 7, visualRadiusY - 5);
    context.lineWidth = selected ? 3 : 2;
    context.strokeStyle = "rgba(54, 64, 55, 0.58)";
    context.stroke();
    context.restore();
    return;
  }

  const palette = {
    bronze: {
      shadow: "#42281f", base: "#94624d", highlight: "#d2a189", edge: "#bf8062", glow: "rgba(171, 108, 78, 0.3)"
    },
    silver: {
      shadow: "#3f4b51", base: "#89989f", highlight: "#e0e5e4", edge: "#c2ced0", glow: "rgba(183, 204, 211, 0.3)"
    },
    gold: {
      shadow: "#4f3e20", base: "#a98b4f", highlight: "#ead79c", edge: "#d0b56c", glow: "rgba(205, 175, 103, 0.34)"
    }
  }[status.key] || {};
  const unlocked = true;

  context.save();
  context.globalAlpha = selected ? 1 : 0.94;

  if (selected) {
    context.shadowColor = unlocked ? palette.glow : "rgba(230, 236, 228, 0.24)";
    context.shadowBlur = 16;
    drawEllipse(context, x, y, visualRadiusX + 8, visualRadiusY + 6);
    context.strokeStyle = "rgba(244, 245, 235, 0.78)";
    context.lineWidth = 3;
    context.stroke();
    context.shadowColor = "transparent";
  }

  const metal = context.createLinearGradient(x - visualRadiusX, y - visualRadiusY, x + visualRadiusX, y + visualRadiusY);
  metal.addColorStop(0, palette.shadow);
  metal.addColorStop(0.2, palette.base);
  metal.addColorStop(0.38, palette.highlight);
  metal.addColorStop(0.52, palette.base);
  metal.addColorStop(0.78, palette.shadow);
  metal.addColorStop(1, palette.base);

  context.shadowColor = unlocked ? palette.glow : "transparent";
  context.shadowBlur = unlocked ? 10 : 0;
  drawEllipse(context, x, y, visualRadiusX + 2, visualRadiusY + 1);
  context.fillStyle = metal;
  context.fill();
  context.shadowColor = "transparent";
  context.lineWidth = 4;
  context.strokeStyle = "rgba(11, 20, 14, 0.7)";
  context.stroke();
  context.lineWidth = selected ? 2.5 : 1.75;
  context.strokeStyle = selected ? "rgba(250, 248, 232, 0.94)" : palette.edge;
  context.stroke();

  const inset = context.createRadialGradient(x - visualRadiusX * 0.2, y - visualRadiusY * 0.25, 1, x, y, visualRadiusX * 0.82);
  inset.addColorStop(0, palette.highlight);
  inset.addColorStop(0.38, palette.base);
  inset.addColorStop(1, palette.shadow);
  drawEllipse(context, x, y, visualRadiusX - 6, visualRadiusY - 6);
  context.fillStyle = inset;
  context.fill();
  context.lineWidth = 1.5;
  context.strokeStyle = palette.edge;
  context.stroke();

  context.restore();
}

function renderRegionCanvases(regionId) {
  if (!nodeStateCtx || !hitMapCtx) return;

  ensureRegionCanvasSize();
  nodeStateCtx.clearRect(0, 0, REGION_CANVAS_WIDTH, REGION_CANVAS_HEIGHT);
  hitMapCtx.clearRect(0, 0, REGION_CANVAS_WIDTH, REGION_CANVAS_HEIGHT);
  hitColorToNodeKey.clear();
  const geometry = getNodeGeometry(regionId);

  getRegionLocations(regionId).forEach((location, index) => {
    const game = gamesById.get(location.gameId);
    const nodeKey = getLocationNodeKey(location, index);
    const point = locationToCanvasPoint(location);
    const status = game ? getGameStatus(game.id) : { key: "locked", label: "None", count: 0 };
    const color = colorForNode(index);
    hitColorToNodeKey.set(color.key, nodeKey);

    drawLockedSlot(nodeStateCtx, point.x, point.y, status, selectedNodeKey === nodeKey, geometry);

    drawEllipse(hitMapCtx, point.x, point.y, geometry.hitRadiusX, geometry.hitRadiusY);
    hitMapCtx.fillStyle = `rgb(${color.red}, ${color.green}, ${color.blue})`;
    hitMapCtx.fill();
  });
}

function showGameDetail(game, status, nodeKey = game?.id) {
  if (!gameDetail || !game) return;

  selectedNodeKey = nodeKey;
  gameDetail.hidden = false;
  gameDetailStatus.textContent = `${status.label} / ${status.count} plays`;
  gameDetailTitle.textContent = game.title;
  gameDetailGenre.textContent = game.genres?.join(", ") || game.primaryGenre || "-";
  gameDetailTheme.textContent = game.theme || "-";
  gameDetailPlayers.textContent = game.recommendedPlayers || "-";
  gameDetailTime.textContent = game.playTime || "-";
  gameDetailDifficulty.textContent = game.difficulty || "-";
  gameDetailLastPlayed.textContent = getLatestSession(game.id)?.date || "Never";
  gameDetailLastPlayers.textContent = getLatestPlayers(game.id).join(", ") || "None yet";

  if (activeRegionId) {
    renderRegionCanvases(activeRegionId);
  }
}

function showEmptyNodeDetail(location, nodeKey) {
  if (!gameDetail || !location) return;

  selectedNodeKey = nodeKey;
  gameDetail.hidden = false;
  gameDetailStatus.textContent = "None";
  gameDetailTitle.textContent = "NONE";
  gameDetailGenre.textContent = "-";
  gameDetailTheme.textContent = "-";
  gameDetailPlayers.textContent = "-";
  gameDetailTime.textContent = "-";
  gameDetailDifficulty.textContent = "-";
  gameDetailLastPlayed.textContent = "Never";
  gameDetailLastPlayers.textContent = "None yet";

  if (activeRegionId) {
    renderRegionCanvases(activeRegionId);
  }
}

function hideGameDetail() {
  if (!gameDetail) return;

  selectedNodeKey = null;
  gameDetail.hidden = true;

  if (activeRegionId) {
    renderRegionCanvases(activeRegionId);
  }
}

function openRegionMap(regionId) {
  const region = regions[regionId];

  if (!region || !regionView || !regionImage) return;

  const regionNodeCount = getRegionLocations(regionId).length;
  activeRegionId = regionId;
  syncAtlasVideoPlayback();
  regionKicker.textContent = region.kicker;
  regionTitle.textContent = region.title;
  regionDescription.textContent = `${region.description} ${regionNodeCount} nodes mapped.`;
  regionImage.src = region.image;
  regionImage.alt = region.alt;
  regionView.hidden = false;
  regionView.setAttribute("aria-hidden", "false");
  selectedNodeKey = null;
  hideGameDetail();
  syncRegionOverlayFit();
  renderRegionCanvases(regionId);

  requestAnimationFrame(syncRegionOverlayFit);
}

function closeRegionMap() {
  if (!regionView || !worldMap) return;

  activeRegionId = null;
  syncAtlasVideoPlayback();
  regionView.hidden = true;
  regionView.setAttribute("aria-hidden", "true");
  hideGameDetail();

}

function handleRegionBoardClick(event) {
  if (!activeRegionId || !hitMapCtx || !regionBoard) return;

  syncRegionOverlayFit();

  const rect = regionBoard.getBoundingClientRect();
  const imageX = event.clientX - rect.left - regionOverlayMetrics.left;
  const imageY = event.clientY - rect.top - regionOverlayMetrics.top;

  if (
    imageX < 0 ||
    imageY < 0 ||
    imageX > regionOverlayMetrics.width ||
    imageY > regionOverlayMetrics.height
  ) {
    return;
  }

  const canvasX = Math.floor((imageX / regionOverlayMetrics.width) * REGION_CANVAS_WIDTH);
  const canvasY = Math.floor((imageY / regionOverlayMetrics.height) * REGION_CANVAS_HEIGHT);

  if (canvasX < 0 || canvasY < 0 || canvasX >= REGION_CANVAS_WIDTH || canvasY >= REGION_CANVAS_HEIGHT) return;

  const [red, green, blue, alpha] = hitMapCtx.getImageData(canvasX, canvasY, 1, 1).data;
  let nodeKey = alpha >= 8 ? hitColorToNodeKey.get(`${red},${green},${blue}`) : null;

  if (!nodeKey) {
    nodeKey = findNodeKeyAtCanvasPoint(canvasX, canvasY);
  }

  if (!nodeKey) return;

  if (selectedNodeKey === nodeKey && !gameDetail.hidden) {
    hideGameDetail();
    return;
  }

  const locations = getRegionLocations(activeRegionId);
  const location = locations.find((entry, index) => getLocationNodeKey(entry, index) === nodeKey);
  if (!location) return;

  const game = gamesById.get(location.gameId);
  if (game) {
    showGameDetail(game, getGameStatus(game.id), nodeKey);
    return;
  }

  showEmptyNodeDetail(location, nodeKey);
}

function findNodeKeyAtCanvasPoint(canvasX, canvasY) {
  let nearest = null;
  let nearestScore = Infinity;
  const geometry = getNodeGeometry(activeRegionId);

  getRegionLocations(activeRegionId).forEach((location, index) => {
    const point = locationToCanvasPoint(location);
    const dx = (canvasX - point.x) / geometry.hitRadiusX;
    const dy = (canvasY - point.y) / geometry.hitRadiusY;
    const score = dx * dx + dy * dy;

    if (score <= 1 && score < nearestScore) {
      nearest = getLocationNodeKey(location, index);
      nearestScore = score;
    }
  });

  return nearest;
}

function bindRegionNavigation() {
  regionHotspots.forEach((hotspot) => {
    hotspot.setAttribute("aria-pressed", "false");
    hotspot.addEventListener("click", () => {
      const regionId = hotspot.dataset.region;
      if (window.matchMedia("(max-width: 840px)").matches) {
        if (selectedMobileRegionId !== regionId) {
          selectMobileRegion(hotspot, regionId);
          return;
        }
        clearMobileRegionSelection();
      }
      runCloudTransition(() => openRegionMap(regionId), regions[regionId]?.title || "Region Map");
    });
  });

  if (atlasReturn) {
    atlasReturn.addEventListener("click", () => runCloudTransition(closeRegionMap, "World Atlas"));
  }

  if (regionBoard) {
    regionBoard.addEventListener("click", handleRegionBoardClick);
  }

  if (gameDetailClose) {
    gameDetailClose.addEventListener("click", hideGameDetail);
  }

  if (regionImage) {
    regionImage.addEventListener("load", () => {
      syncRegionOverlayFit();

      if (activeRegionId) {
        renderRegionCanvases(activeRegionId);
      }
    });
  }
}

function render() {
  currentProgress += (targetProgress - currentProgress) * 0.12;
  const progress = clamp(currentProgress);

  document.documentElement.style.setProperty("--flight", progress.toFixed(4));
  progressText.textContent = `${Math.round(progress * 100)}%`;
  progressBar.style.transform = `scaleX(${progress})`;

  drawFlight(progress);
  drawWind(progress);
  renderCopy(progress);
  renderCompletionState(progress);

  scrollVelocity *= 0.88;
  requestAnimationFrame(render);
}

function prepareStage() {
  flightStage.style.height = `${Math.max(620, duration * 78)}vh`;
  flightStage.style.minHeight = `${Math.max(4200, Math.round(duration * 620))}px`;
  updateTarget();
  warmFrames(0);
}

window.addEventListener("scroll", updateTarget, { passive: true });
window.addEventListener("resize", resize);

bindMapEntryLinks();
bindRegionNavigation();
renderProgressSummary();
loadSharedPlaySessions().catch((error) => console.error("Could not load Supabase play sessions.", error));
resize();
prepareStage();
updateTarget();
renderCompletionState(0);
syncAtlasVideoPlayback();
render();
