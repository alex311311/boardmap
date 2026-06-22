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

const frameCount = 241;
const frameRate = 24;
const maxFrameCache = 44;
const preloadRadius = 14;
const frameCache = new Map();

const chapters = [
  {
    kicker: "DeFi at Peak.",
    title: "EverFlight",
    line: "Move through the ridge, the clouds, and the city in one continuous ascent."
  },
  {
    kicker: "Forward motion.",
    title: "Ridge",
    line: "The scroll follows the original camera move, so the terrain advances naturally."
  },
  {
    kicker: "Cloud flow.",
    title: "Glide",
    line: "The ridges stay continuous as the camera cuts through the cloud layer."
  },
  {
    kicker: "Peak arrival.",
    title: "Summit",
    line: "The final seconds open into the wide view above the clouds."
  }
];

let targetProgress = 0;
let currentProgress = 0;
let duration = frameCount / frameRate;
let width = window.innerWidth;
let height = window.innerHeight;
let pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
let particles = [];
let lastScrollY = window.scrollY;
let scrollVelocity = 0;

function clamp(value, min = 0, max = 1) {
  return Math.min(Math.max(value, min), max);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
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

function render() {
  currentProgress += (targetProgress - currentProgress) * 0.12;
  const progress = clamp(currentProgress);

  document.documentElement.style.setProperty("--flight", progress.toFixed(4));
  progressText.textContent = `${Math.round(progress * 100)}%`;
  progressBar.style.transform = `scaleX(${progress})`;

  drawFlight(progress);
  drawWind(progress);
  renderCopy(progress);

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

resize();
prepareStage();
updateTarget();
render();
