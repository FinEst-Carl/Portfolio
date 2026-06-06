/**
 * CP Logo — piirtymisanimaatio
 *
 * Tekniikka: stroke-dasharray = polun koko pituus
 *            stroke-dashoffset animoidaan 0:aan → viiva "piirtyy"
 *
 * Rytmi pääkaarelle: hidas → nopea → hidas → nopea
 * Toteutus: cubic-bezier(0.55, 0, 0.15, 1) + segmentoitu animaatio JS:llä
 */

(function () {
  "use strict";

  const ROOT = document.documentElement;

  /**
   * Mittaa SVG-polun tarkan pituuden.
   * Tärkeää: käytetään getTotalLength() joka huomioi transform-matriisit.
   */
  function measurePath(el) {
    try {
      return el.getTotalLength();
    } catch {
      return null;
    }
  }

  /**
   * Asettaa polun piirtymisvalmiuteen:
   * dasharray = pituus, dashoffset = pituus (piilotettu)
   * CSS-animaatio animoi dashoffset → 0
   */
  function preparePath(el, length) {
    el.style.strokeDasharray = length;
    el.style.strokeDashoffset = length;
    // CSS-muuttuja animaatiota varten
    el.style.setProperty("--path-length", length);
  }

  /**
   * Pääkaaren rytmikäs animaatio:
   * Jaetaan piirtäminen 4 segmenttiin eri nopeuksilla.
   * hidas → nopea → hidas → nopea
   *
   *  Seg 1: 0%–25% polusta,  800ms  (hidas alku, sivellin laskeutuu)
   *  Seg 2: 25%–60% polusta, 700ms  (vauhti kasvaa, pitkä veto)
   *  Seg 3: 60%–80% polusta, 900ms  (hidastuu C:n kaarteessa)
   *  Seg 4: 80%–100% polusta,500ms  (loppukiihdytys, nosto)
   */
  function animateMainStroke(el, totalLength) {
    const segments = [
      { end: 0.25, duration: 800,  ease: "cubic-bezier(0.8, 0.2, 0.4, 1)" },
      { end: 0.60, duration: 650,  ease: "cubic-bezier(0.2, 0.2, 0.1, 1)" },
      { end: 0.80, duration: 900,  ease: "cubic-bezier(0.7, 0.2, 0.4, 1)" },
      { end: 1.00, duration: 480,  ease: "cubic-bezier(0.1, 0.2, 0.05, 1)" },
    ];

    let currentOffset = totalLength; // täysin piilossa aluksi
    let elapsed = 0;

    // Aseta alkutila
    el.style.strokeDasharray  = totalLength;
    el.style.strokeDashoffset = totalLength;
    // Poista CSS-animaatio — JS hoitaa
    el.style.animation = "none";

    let prevEnd = 0;

    segments.forEach((seg, i) => {
      const segLength   = (seg.end - prevEnd) * totalLength;
      const targetOffset = totalLength - seg.end * totalLength;
      const delay        = elapsed;

      setTimeout(() => {
        el.style.transition = `stroke-dashoffset ${seg.duration}ms ${seg.ease}`;
        el.style.strokeDashoffset = targetOffset;
      }, delay);

      elapsed += seg.duration;
      prevEnd = seg.end;
    });

    return elapsed; // kokonaisaika ms
  }

  /**
   * Pystyviivan animaatio — napakka alasvetoveto kalligrafipensselillä.
   * Alkaa kun pääkaari on lähes valmis.
   */
  function animateVerticalStroke(el, totalLength, startDelay) {
    el.style.strokeDasharray  = totalLength;
    el.style.strokeDashoffset = totalLength;
    el.style.animation        = "none";

    setTimeout(() => {
      // Hidas aloitus (sivellin koskettaa paperia), sitten nopea veto alas
      el.style.transition      = `stroke-dashoffset 900ms cubic-bezier(0.65, 0.2, 0.2, 1)`;
      el.style.strokeDashoffset = 0;
    }, startDelay);
  }

  /**
   * Tuunataan polkujen ulkonäköä kalligrafisemmaksi lisäämällä
   * SVG-suodatin joka luo siveltimen luonnollisen epätasaisuuden.
   */
  function applyCalligraphyFilter(svgEl) {
    const defs = svgEl.querySelector("defs");
    if (!defs) return;

    // Luonnollinen sivellinefekti: hyvin hienovarainen turbulenssi
    defs.innerHTML = `
      <filter id="ink-wobble" x="-2%" y="-2%" width="104%" height="104%"
              color-interpolation-filters="linearRGB">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.065 0.04"
          numOctaves="3"
          seed="7"
          result="noise"/>
        <feDisplacementMap
          in="SourceGraphic"
          in2="noise"
          scale="1.8"
          xChannelSelector="R"
          yChannelSelector="G"
          result="displaced"/>
        <feComposite in="displaced" in2="SourceGraphic" operator="atop"/>
      </filter>
    `;

    // Lisää suodatin molempiin polkuihin
    svgEl.querySelectorAll(".logo-stroke").forEach(el => {
      el.setAttribute("filter", "url(#ink-wobble)");
    });
  }

  /**
   * Pääfunktio — ajetaan kun DOM on valmis.
   */
  function init() {
    const svg      = document.getElementById("cp-logo");
    const mainPath = document.getElementById("stroke-main");
    const vertPath = document.getElementById("stroke-vertical");

    if (!svg || !mainPath || !vertPath) {
      console.warn("CP Logo: SVG-elementtejä ei löydy.");
      return;
    }

    // Kalligrafiasuodatin
    applyCalligraphyFilter(svg);

    // Mittaa polkujen pituudet
    const mainLength = measurePath(mainPath);
    const vertLength = measurePath(vertPath);

    if (!mainLength || !vertLength) {
      console.warn("CP Logo: Polkujen pituuksia ei voitu mitata.");
      return;
    }

    // Käynnistä animaatiot
    // Pääkaari alkaa heti
    const mainDuration = animateMainStroke(mainPath, mainLength);

    // Pystyviiva alkaa kun pääkaari on ~85% valmis
    const vertDelay = Math.round(mainDuration * 0.82);
    animateVerticalStroke(vertPath, vertLength, vertDelay);

    // Nimi häivyy sisään animaatioiden jälkeen
    const nameEl = document.querySelector(".logo-name");
    if (nameEl) {
      const nameDelay = mainDuration + 300;
      setTimeout(() => {
        nameEl.style.transition = "opacity 1200ms ease, transform 1200ms ease";
        nameEl.style.opacity    = "1";
        nameEl.style.transform  = "translateY(0)";
      }, nameDelay);
      // Poista CSS-animaatio jotta JS-versio toimii
      nameEl.style.animation = "none";
    }

    // Lisää interaktiivisuus: hover pysäyttää logon
    svg.addEventListener("mouseenter", () => {
      svg.style.filter = "brightness(0.92)";
      svg.style.transition = "filter 400ms ease";
    });
    svg.addEventListener("mouseleave", () => {
      svg.style.filter = "brightness(1)";
    });

    // Klikkaamalla voi toistaa animaation
    svg.addEventListener("click", replay);
    svg.style.cursor = "pointer";
    svg.title        = "Klikkaa toistaaksesi animaation";
  }

  /**
   * Toista animaatio alusta — nollaa tila ja käynnistä uudelleen.
   */
  function replay() {
    const mainPath = document.getElementById("stroke-main");
    const vertPath = document.getElementById("stroke-vertical");
    const nameEl   = document.querySelector(".logo-name");

    if (!mainPath || !vertPath) return;

    // Nollaa
    [mainPath, vertPath].forEach(el => {
      el.style.transition      = "none";
      el.style.strokeDashoffset = el.style.strokeDasharray;
    });

    if (nameEl) {
      nameEl.style.transition = "none";
      nameEl.style.opacity    = "0";
      nameEl.style.transform  = "translateY(6px)";
    }

    // Pieni viive jotta nollaus ehtii renderöityä
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const mainLength = measurePath(mainPath);
        const vertLength = measurePath(vertPath);
        if (!mainLength || !vertLength) return;

        const mainDuration = animateMainStroke(mainPath, mainLength);
        const vertDelay    = Math.round(mainDuration * 0.82);
        animateVerticalStroke(vertPath, vertLength, vertDelay);

        if (nameEl) {
          setTimeout(() => {
            nameEl.style.transition = "opacity 1200ms ease, transform 1200ms ease";
            nameEl.style.opacity    = "1";
            nameEl.style.transform  = "translateY(0)";
          }, mainDuration + 300);
        }
      });
    });
  }

  // Käynnistys
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
