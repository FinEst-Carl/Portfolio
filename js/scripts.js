(function () {
  "use strict";

  const SVG_PATH = "media/CP_Logo_simple_r_new.svg";

  // ── Alkuperäiset yksinkertaiset polut (inkscape:original-d) ──────
  // Nämä ovat ne viivat joita kynä oikeasti piirtää.
  // Fill-muodot (taper_stroke) paljastetaan animaation lopussa.
  const STROKES = {
    main: {
      fillId:   "path2",
      d: "m 411.088,267.399 c -6.128,-7.195 -60.402,-100.956 -180.351,-92.994 -88.96,5.904 -188.93,81.568 -192.012,217.156 -2.195,96.588 49.159,206.013 192.012,217.157 68.827,5.37 136.004,-36.593 160.456,-64.457 22.491,-25.628 216.806,-278.038 239.088,-307.026 54.977,-71.522 142.528,-63.435 153.501,-62.83 117.229,6.455 194.943,118.624 191.993,216.343 -2.887,95.64 -70.09,215.388 -191.993,217.97 C 670.755,611.113 607.588,513.553 599.66,503.297",
      width:    12,    // stroke-paksuus piirtovaiheessa
      duration: 3000,
      delay:    0,
    },
    vertical: {
      fillId:   "path1",
      d: "m 615.062,489.23 c -0.005,-0.35175 -0.0265,32.4472 -0.0519,77.7839 -0.021,37.56524 -0.0447,83.73827 -0.064,126.79313 -0.0219,49.01607 -0.0382,93.99074 -0.0382,117.62197",
      width:    8,
      duration: 800,
      delay:    0,     // lasketaan automaattisesti
    },
  };

  const CONFIG = {
    pauseBetween: 400,   // ms viivausten välissä
    easing:       "linear",
    // Kuinka kauan fill-muoto häivyy sisään piirtoviivan päälle
    fillFadeMs:   300,
    nameDelay:    400,
  };

  // ── SVG lataus ────────────────────────────────────────────────────
  async function loadSVG(wrapper) {
    const res = await fetch(SVG_PATH);
    if (!res.ok) throw new Error(`SVG ei löydy: ${SVG_PATH}`);
    const text = await res.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, "image/svg+xml");
    const svg = doc.querySelector("svg");

    svg.id = "cp-logo";
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "auto");
    svg.removeAttribute("style");
    svg.style.cssText = "display:block; overflow:visible; cursor:pointer;";

    // Piilotetaan fill-muodot aluksi — ne paljastuvat animaation lopussa
    ["path1", "path2"].forEach(id => {
      const el = doc.getElementById(id);
      if (el) el.style.opacity = "0";
    });

    wrapper.appendChild(svg);
    return svg;
  }

  // ── Luo stroke-viiva joka animoidaan dasharray:lla ────────────────
  function createStrokePath(svg, d, strokeWidth) {
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", d);
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "#1a1410");
    path.setAttribute("stroke-width", strokeWidth);
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.appendChild(path);
    return path;
  }

  // ── Kynäanimaatio yhdelle viivaukselle ───────────────────────────
  // 1. Piirretään stroke-viiva dasharray-tekniikalla (kynäliike)
  // 2. Kun valmis, paljastetaan fill-muoto ja poistetaan stroke
  function animateStroke(svg, strokeDef, easing) {
    return new Promise((resolve) => {

      // Luo piirtoviiva
      const strokeEl = createStrokePath(svg, strokeDef.d, strokeDef.width);

      // Mittaa polun pituus
      let length;
      try {
        length = strokeEl.getTotalLength();
      } catch(e) {
        length = 2000; // fallback
      }

      // Aseta dasharray: koko viiva on yksi "viiva" + yksi "väli"
      strokeEl.style.strokeDasharray  = length;
      strokeEl.style.strokeDashoffset = length; // piilotettu alussa

      // Pakota alkutila renderöitymään ennen transitiota
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {

          // Käynnistä piirtyminen
          strokeEl.style.transition     = `stroke-dashoffset ${strokeDef.duration}ms ${easing}`;
          strokeEl.style.strokeDashoffset = "0";

          // Kun piirtäminen valmis: vaihda fill-muotoon
          setTimeout(() => {
            const fillEl = svg.getElementById(strokeDef.fillId);

            // Häivytä fill sisään
            if (fillEl) {
              fillEl.style.transition = `opacity ${CONFIG.fillFadeMs}ms ease`;
              fillEl.style.opacity    = "1";
            }

            // Häivytä stroke-viiva ulos samaan aikaan
            strokeEl.style.transition = `opacity ${CONFIG.fillFadeMs}ms ease`;
            strokeEl.style.opacity    = "0";

            // Siivoa stroke pois kun häivytys valmis
            setTimeout(() => {
              strokeEl.remove();
              resolve();
            }, CONFIG.fillFadeMs);

          }, strokeDef.duration);
        });
      });
    });
  }

  // ── Nimen animaatio ───────────────────────────────────────────────
  function animateName(nameEl, delay) {
    setTimeout(() => {
      nameEl.style.transition = "opacity 1000ms ease, transform 1000ms ease";
      nameEl.style.opacity    = "1";
      nameEl.style.transform  = "translateY(0)";
    }, delay);
  }

  // ── Reset ─────────────────────────────────────────────────────────
  function reset(svg, nameEl) {
    // Poista mahdolliset stroke-viivat
    svg.querySelectorAll("path[fill='none']").forEach(el => el.remove());

    // Piilota fill-muodot
    ["path1", "path2"].forEach(id => {
      const el = svg.getElementById(id);
      if (el) { el.style.transition = "none"; el.style.opacity = "0"; }
    });

    // Nollaa nimi
    nameEl.style.transition = "none";
    nameEl.style.opacity    = "0";
    nameEl.style.transform  = "translateY(6px)";
  }

  // ── Pääanimaatio ──────────────────────────────────────────────────
  async function runAnimation(svg, nameEl) {
    // 1. Pääkaari
    await animateStroke(svg, {
      ...STROKES.main,
      delay: 0,
    }, CONFIG.easing);

    // 2. Tauko
    await new Promise(r => setTimeout(r, CONFIG.pauseBetween));

    // 3. Pystyviiva
    await animateStroke(svg, {
      ...STROKES.vertical,
      delay: 0,
    }, CONFIG.easing);

    // 4. Nimi
    animateName(nameEl, CONFIG.nameDelay);
  }

  // ── Init ──────────────────────────────────────────────────────────
  async function init() {
    const wrapper = document.getElementById("logo-wrapper");
    const nameEl  = document.querySelector(".logo-name");
    if (!wrapper || !nameEl) return;

    try {
      const svg = await loadSVG(wrapper);
      await runAnimation(svg, nameEl);

      svg.addEventListener("click", async () => {
        reset(svg, nameEl);
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        await runAnimation(svg, nameEl);
      });

    } catch (err) {
      console.error("Animaatio epäonnistui:", err);
      wrapper.innerHTML = `<img src="${SVG_PATH}" style="width:100%;height:auto;" alt="CP Logo"/>`;
      nameEl.style.opacity = "1";
      nameEl.style.transform = "none";
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
