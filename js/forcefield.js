/**
 * ForceField Background — vanilla JS + p5.js port
 * Replaces the CSS dot-grid with an interactive particle canvas
 * scoped to the hero section only.
 */
(() => {
  "use strict";

  // ── Config ────────────────────────────────────────────────────────────────
  const CONFIG = {
    imageUrl:        "https://cdn.pixabay.com/photo/2024/12/13/20/29/alps-9266131_1280.jpg",
    hue:             38,          // golden-amber to match --terracotta (#FED655)
    saturation:      95,
    spacing:         11,
    density:         1.8,
    minStroke:       1.5,
    maxStroke:       5,
    noiseScale:      0,
    invertImage:     true,
    invertWireframe: true,
    magnifierEnabled:true,
    magnifierRadius: 160,
    forceStrength:   12,
    friction:        0.88,
    restoreSpeed:    0.045,
    threshold:       255,
  };

  // ── Mount point ───────────────────────────────────────────────────────────
  // Insert a fixed full-screen canvas host BEFORE everything else in <body>
  const host = document.createElement("div");
  host.id = "forcefield-bg";
  host.style.cssText = [
    "position:fixed",
    "inset:0",
    "z-index:-3",        // behind body::before (-2) and body::after (-1)
    "pointer-events:none",
    "overflow:hidden",
  ].join(";");
  document.body.prepend(host);

  // ── Wait for p5 to be available, then boot ───────────────────────────────
  function boot() {
    /* eslint-disable no-undef */
    new p5((p) => {
      let originalImg, img;
      let palette = [];
      let points  = [];

      // cached values to detect changes
      let lastHue = -1, lastSaturation = -1;
      let lastSpacing = -1, lastDensity = -1;
      let lastInvertImage = null;

      let magX, magY;
      const INERTIA = 0.1;

      // ── preload ────────────────────────────────────────────────────────
      p.preload = () => {
        p.loadImage(
          CONFIG.imageUrl,
          (img) => { originalImg = img; },
          ()    => { console.warn("[ForceField] image failed to load"); }
        );
      };

      // ── setup ──────────────────────────────────────────────────────────
      p.setup = () => {
        const cnv = p.createCanvas(host.clientWidth, host.clientHeight);
        cnv.parent(host);
        cnv.style("display", "block");

        magX = p.width  / 2;
        magY = p.height / 2;

        processImage();
        buildPalette(CONFIG.hue, CONFIG.saturation);
        buildPoints();
      };

      // ── resize ─────────────────────────────────────────────────────────
      p.windowResized = () => {
        p.resizeCanvas(host.clientWidth, host.clientHeight);
        processImage();
        buildPoints();
      };

      // ── helpers ────────────────────────────────────────────────────────
      function processImage() {
        if (!originalImg) return;
        img = originalImg.get();
        if (p.width > 0 && p.height > 0) img.resize(p.width, p.height);
        img.filter(p.GRAY);

        if (CONFIG.invertImage) {
          img.loadPixels();
          for (let i = 0; i < img.pixels.length; i += 4) {
            img.pixels[i]     = 255 - img.pixels[i];
            img.pixels[i + 1] = 255 - img.pixels[i + 1];
            img.pixels[i + 2] = 255 - img.pixels[i + 2];
          }
          img.updatePixels();
        }
        lastInvertImage = CONFIG.invertImage;
      }

      function buildPalette(h, s) {
        palette = [];
        p.push();
        p.colorMode(p.HSL);
        for (let i = 0; i < 12; i++) {
          palette.push(p.color(h, s, p.map(i, 0, 11, 90, 15)));
        }
        p.pop();
        lastHue        = h;
        lastSaturation = s;
      }

      function buildPoints() {
        if (!img) return;
        points = [];
        const sp = Math.max(2, CONFIG.spacing);

        for (let y = 0; y < img.height; y += sp) {
          for (let x = 0; x < img.width;  x += sp) {
            if (p.random() > CONFIG.density) continue;

            const nx = CONFIG.noiseScale
              ? (p.noise(x * CONFIG.noiseScale, y * CONFIG.noiseScale) - 0.5) * sp
              : 0;
            const ny = CONFIG.noiseScale
              ? (p.noise((x + 500) * CONFIG.noiseScale, (y + 500) * CONFIG.noiseScale) - 0.5) * sp
              : 0;

            const px = x + nx;
            const py = y + ny;

            points.push({
              pos:         p.createVector(px, py),
              originalPos: p.createVector(px, py),
              vel:         p.createVector(0, 0),
            });
          }
        }

        lastSpacing = CONFIG.spacing;
        lastDensity = CONFIG.density;
      }

      function applyForce(mx, my) {
        if (!CONFIG.magnifierEnabled) return;
        const { magnifierRadius, forceStrength, friction, restoreSpeed } = CONFIG;

        for (const pt of points) {
          const dir = p5.Vector.sub(pt.pos, p.createVector(mx, my));
          const d   = dir.mag();

          if (d < magnifierRadius) {
            dir.normalize();
            pt.vel.add(dir.mult(forceStrength / Math.max(1, d)));
          }

          pt.vel.mult(friction);
          pt.vel.add(p5.Vector.sub(pt.pos, pt.originalPos).mult(-restoreSpeed));
          pt.pos.add(pt.vel);
        }
      }

      // ── draw ───────────────────────────────────────────────────────────
      p.draw = () => {
        if (!img) return;

        // Transparent background so the CSS body bg shows through on other sections
        p.clear();
        p.background(0);

        // Regen palette if needed (CONFIG values could be changed externally)
        if (CONFIG.hue !== lastHue || CONFIG.saturation !== lastSaturation) {
          buildPalette(CONFIG.hue, CONFIG.saturation);
        }
        if (CONFIG.invertImage !== lastInvertImage) processImage();
        if (CONFIG.spacing !== lastSpacing || CONFIG.density !== lastDensity) buildPoints();

        // Smooth magnifier follow
        magX = p.lerp(magX, p.mouseX, INERTIA);
        magY = p.lerp(magY, p.mouseY, INERTIA);

        applyForce(magX, magY);

        img.loadPixels();
        p.noFill();

        for (const pt of points) {
          const { x, y } = pt.pos;
          const d  = p.dist(x, y, magX, magY);

          const px = p.constrain(p.floor(x), 0, img.width  - 1);
          const py = p.constrain(p.floor(y), 0, img.height - 1);

          const idx        = (px + py * img.width) * 4;
          const brightness = img.pixels[idx];
          if (brightness === undefined) continue;

          const show = CONFIG.invertWireframe
            ? brightness < CONFIG.threshold
            : brightness > CONFIG.threshold;

          if (!show) continue;

          let si = p.constrain(
            Math.floor(p.map(brightness, 0, 255, 0, palette.length - 1)),
            0, palette.length - 1
          );

          let sw = p.map(brightness, 0, 255, CONFIG.minStroke, CONFIG.maxStroke);
          if (CONFIG.magnifierEnabled && d < CONFIG.magnifierRadius) {
            sw *= p.map(d, 0, CONFIG.magnifierRadius, 2.2, 1);
          }

          if (palette[si]) {
            p.stroke(palette[si]);
            p.strokeWeight(sw);
            p.point(x, y);
          }
        }
      };
    }, host);
    /* eslint-enable no-undef */
  }

  // p5 is loaded via CDN — wait until it's ready
  if (typeof p5 !== "undefined") {
    boot();
  } else {
    document.querySelector("script[src*='p5']")
      ?.addEventListener("load", boot);
    // fallback poll (should never be needed)
    const t = setInterval(() => {
      if (typeof p5 !== "undefined") { clearInterval(t); boot(); }
    }, 50);
  }
})();
