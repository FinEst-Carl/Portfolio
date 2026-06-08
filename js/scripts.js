(function () {
  "use strict";

  const SVG_PATH = "media/CP_Logo_simple_r_new.svg";

  const CONFIG = {
    main:         { id: "path2", duration: 3000 },
    pauseBetween: 400,
    vertical:     { id: "path1", duration: 800 },
    nameDelay:    400,
    easing:       "linear",
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

    wrapper.appendChild(svg);
    return svg;
  }

  // ── Korvaa d-attribuutti original-d:llä ──────────────────────────
  // Inkscape LPE generoi monimutkaisen d-attribuutin joka ei toimi
  // stroke-dasharray animaation kanssa oikein.
  // original-d on se yksinkertainen polku jota kynä seuraa.
  function useOriginalPath(el) {
    const inkscapeNS = "http://www.inkscape.org/namespaces/inkscape";
    const originalD = el.getAttributeNS(inkscapeNS, "original-d");
    if (originalD) {
      el.setAttribute("d", originalD);
    }
    // Poista LPE-viittaus jottei selain yritä soveltaa sitä
    el.removeAttributeNS(inkscapeNS, "path-effect");
    el.removeAttribute("inkscape:path-effect");
  }

  // ── Animoi polku stroke-dasharray tekniikalla ─────────────────────
  function animatePath(el, duration, easing) {
    return new Promise((resolve) => {
      const length = el.getTotalLength();

      // Aseta alkutila: koko viiva piilossa
      el.style.strokeDasharray  = length;
      el.style.strokeDashoffset = length;

      // Kaksi requestAnimationFrame varmistaa että selain
      // renderöi alkutilan ennen kuin transitio alkaa
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.transition       = `stroke-dashoffset ${duration}ms ${easing}`;
          el.style.strokeDashoffset = "0";
          setTimeout(resolve, duration);
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
    [CONFIG.main.id, CONFIG.vertical.id].forEach(id => {
      const el = svg.getElementById(id);
      if (!el) return;
      el.style.transition       = "none";
      el.style.strokeDashoffset = el.getTotalLength();
    });
    nameEl.style.transition = "none";
    nameEl.style.opacity    = "0";
    nameEl.style.transform  = "translateY(6px)";
  }

  // ── Pääanimaatio ──────────────────────────────────────────────────
  async function runAnimation(svg, nameEl) {
    const mainEl = svg.getElementById(CONFIG.main.id);
    const vertEl = svg.getElementById(CONFIG.vertical.id);

    // 1. Pääkaari
    await animatePath(mainEl, CONFIG.main.duration, CONFIG.easing);

    // 2. Tauko
    await new Promise(r => setTimeout(r, CONFIG.pauseBetween));

    // 3. Pystyviiva
    await animatePath(vertEl, CONFIG.vertical.duration, CONFIG.easing);

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

      // Vaihda LPE-polut yksinkertaisiin original-d polkuihin
      [CONFIG.main.id, CONFIG.vertical.id].forEach(id => {
        const el = svg.getElementById(id);
        if (el) useOriginalPath(el);
      });

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
