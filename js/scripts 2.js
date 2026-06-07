(function () {
  "use strict";

  // ── Tiedostopolku media-kansioon ──────────────────────────────────
  const SVG_PATH = "media/CP_Logo_simple_r_new.svg";

  // ── Animaatioasetukset ─────────────────────────────────────────────
  const CONFIG = {
    main:          { id: "path2", duration: 3000 },
    pauseBetween:  400,
    vertical:      { id: "path1", duration: 800 },
    nameDelay:     400,
    easing:        "linear",
  };

  // ── SVG lataus ja injektointi ──────────────────────────────────────
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

    wrapper.appendChild(svg);
    return svg;
  }

  // ── ClipPath-animaatio ─────────────────────────────────────────────
  // KORJAUS: käytetään rect.style.width (ei setAttribute)
  // jotta CSS transition toimii oikein
  function animatePath(svg, pathEl, clipId, duration, delay, easing) {
    return new Promise((resolve) => {

      // Haetaan polun sijainti SVG-koordinaateissa
      let bbox;
      try {
        bbox = pathEl.getBBox();
      } catch(e) {
        // getBBox ei onnistu ennen kuin SVG on renderöity —
        // käytetään ylisuuria varmuusarvoja
        bbox = { x: 0, y: 0, width: 1000, height: 1000 };
      }

      const margin = 20;
      const x      = bbox.x - margin;
      const y      = bbox.y - margin;
      const w      = bbox.width  + margin * 2;
      const h      = bbox.height + margin * 2;

      // Luo tai löydä defs
      let defs = svg.querySelector("defs");
      if (!defs) {
        defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        svg.insertBefore(defs, svg.firstChild);
      }

      // Rakenna clipPath + rect
      const clipPath = document.createElementNS("http://www.w3.org/2000/svg", "clipPath");
      clipPath.id = clipId;

      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");

      // TÄRKEÄÄ: kaikki dimensiot style-ominaisuuksina,
      // jotta CSS transition voi seurata niitä
      rect.style.x      = `${x}px`;
      rect.style.y      = `${y}px`;
      rect.style.width  = "0px";       // alussa piilotettu
      rect.style.height = `${h}px`;

      clipPath.appendChild(rect);
      defs.appendChild(clipPath);

      // Kiinnitä maski polkuun ja tee se näkyväksi
      pathEl.setAttribute("clip-path", `url(#${clipId})`);
      pathEl.style.opacity = "1";

      // Käynnistä animaatio viiveen jälkeen
      setTimeout(() => {
        // Pakota selain renderöimään alkutila ennen transition-muutosta
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            rect.style.transition = `width ${duration}ms ${easing}`;
            rect.style.width      = `${w}px`;  // triggeröi transition
            setTimeout(resolve, duration);
          });
        });
      }, delay);
    });
  }

  // ── Polun haku ────────────────────────────────────────────────────
  function getPath(svg, id) {
    const el = svg.getElementById(id);
    if (!el) throw new Error(`Polkua id="${id}" ei löydy`);
    el.style.opacity = "0"; // piilota aluksi
    return el;
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
    svg.querySelectorAll("clipPath[id^='clip-']").forEach(el => el.remove());
    svg.querySelectorAll("[clip-path]").forEach(el => {
      el.removeAttribute("clip-path");
      el.style.opacity = "0";
    });
    nameEl.style.transition = "none";
    nameEl.style.opacity    = "0";
    nameEl.style.transform  = "translateY(6px)";
  }

  // ── Pääanimaatio ──────────────────────────────────────────────────
  async function runAnimation(svg, nameEl) {
    const mainPath = getPath(svg, CONFIG.main.id);
    const vertPath = getPath(svg, CONFIG.vertical.id);

    // 1. Pääkaari — odotetaan valmistuminen
    await animatePath(
      svg, mainPath, "clip-main",
      CONFIG.main.duration, 0, CONFIG.easing
    );

    // 2. Tauko — sitten pystyviiva
    await animatePath(
      svg, vertPath, "clip-vert",
      CONFIG.vertical.duration, CONFIG.pauseBetween, CONFIG.easing
    );

    // 3. Nimi ilmestyy
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
