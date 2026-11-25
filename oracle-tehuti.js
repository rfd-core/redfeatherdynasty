/**
 * Oracle of Tehuti — Metu Neter 70-Card Daily Reader Engine
 * Red Feather Dynasty (rfd-core/redfeatherdynasty)
 * Aligns user's birth date with the 11 Paut Neteru Significators (0-10)
 * and draws a deterministic daily 2-card Combined Metutu spread from the 70-card deck.
 */
(function () {
  const STORAGE_KEY = "rfd_oracle_birthdate";
  let deckData = null;

  // Deterministic 32-bit FNV-1a hash for daily reproducible card draws
  function hashSeed(str) {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  // Reduce YYYY-MM-DD birth date to Paut Neteru Sphere (0 = Amen [11], 1-10 = Ausar..Geb)
  function calculateNatalSphere(birthDateStr) {
    const digits = birthDateStr.replace(/\D/g, "");
    if (digits.length !== 8) return 4; // Default to Sphere 4 (Maat) if invalid

    let sum = 0;
    for (const ch of digits) sum += parseInt(ch, 10);

    while (sum > 11) {
      sum = String(sum)
        .split("")
        .reduce((acc, d) => acc + parseInt(d, 10), 0);
    }
    return sum === 11 ? 0 : sum;
  }

  function getTodayISO() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function classifySuit(suitStr) {
    if (suitStr.includes("Success")) return "Success";
    if (suitStr.includes("Failure")) return "Failure";
    return "Timing";
  }

  async function loadDeck() {
    if (deckData) return deckData;
    const res = await fetch("./oracle-deck.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("Unable to load oracle-deck.json");
    deckData = await res.json();
    return deckData;
  }

  function computeDailyReading(deck, birthDateStr, targetDateStr = getTodayISO()) {
    const natalSphere = calculateNatalSphere(birthDateStr);
    const significator =
      deck.significators_paut_neteru.find((s) => s.sphere === natalSphere) ||
      deck.significators_paut_neteru[0];

    const totalCards = deck.metutu_70.length; // 70
    const idx1 = hashSeed(`${birthDateStr}|${targetDateStr}|METUT_1`) % totalCards;
    let idx2 = hashSeed(`${birthDateStr}|${targetDateStr}|METUT_2`) % totalCards;
    if (idx2 === idx1) {
      idx2 = (idx1 + 7) % totalCards;
    }

    const metut1 = deck.metutu_70[idx1];
    const metut2 = deck.metutu_70[idx2];

    const comboKey = `${classifySuit(metut1.suit)} + ${classifySuit(metut2.suit)}`;
    const synthesis =
      deck.combination_rules[comboKey] ||
      "Align both active Metutu with your Natal Significator Hekau before acting.";

    const sphereResonance =
      metut1.sphere === natalSphere || metut2.sphere === natalSphere
        ? `Direct Natal Resonance: Today's draw activates your primary ${significator.neter} (Sphere ${natalSphere}) faculty.`
        : `Cross-Sphere Calibration: Channel ${metut1.neter} (Sphere ${metut1.sphere}) and ${metut2.neter} (Sphere ${metut2.sphere}) through your ${significator.neter} baseline.`;

    return {
      date: targetDateStr,
      birthDate: birthDateStr,
      significator,
      metut1,
      metut2,
      comboKey,
      synthesis,
      sphereResonance
    };
  }

  function renderReading(container, reading) {
    const { significator, metut1, metut2, synthesis, sphereResonance, date } = reading;

    container.innerHTML = `
      <div class="oracle-results-grid" style="margin-top:1.25rem; display:grid; gap:1rem; grid-template-columns:repeat(auto-fit, minmax(250px, 1fr)); text-align:left;">
        <div style="border:1px solid rgba(212,175,55,0.45); background:rgba(13,6,20,0.92); padding:1.1rem; border-radius:8px;">
          <div style="font-size:0.72rem; letter-spacing:0.12em; color:#d4af37; text-transform:uppercase;">I. Natal Significator · Sphere ${significator.sphere}</div>
          <h4 style="margin:0.35rem 0; color:#fff; font-size:1.1rem;">${significator.neter} — ${significator.title}</h4>
          <p style="font-size:0.85rem; color:#d8cde6; margin:0.4rem 0;"><strong>Faculty:</strong> ${significator.faculty}</p>
          <p style="font-size:0.85rem; color:#cfc3df; margin:0.4rem 0;">${significator.natal_baseline}</p>
          <blockquote style="margin:0.6rem 0 0; padding-left:0.65rem; border-left:2px solid #d4af37; font-style:italic; color:#f3d98b; font-size:0.84rem;">
            "${significator.hekau}"
          </blockquote>
        </div>

        <div style="border:1px solid rgba(212,175,55,0.45); background:rgba(13,6,20,0.92); padding:1.1rem; border-radius:8px;">
          <div style="font-size:0.72rem; letter-spacing:0.12em; color:#d4af37; text-transform:uppercase;">II. Primary Daily Metut · ${metut1.code}</div>
          <h4 style="margin:0.35rem 0; color:#fff; font-size:1.1rem;">${metut1.name} (${metut1.neter})</h4>
          <div style="font-size:0.75rem; color:#e5c158; margin-bottom:0.4rem;">Suit: ${metut1.suit}</div>
          <p style="font-size:0.85rem; color:#cfc3df; margin:0.4rem 0;"><strong>Condition:</strong> ${metut1.condition}</p>
          <p style="font-size:0.85rem; color:#f3d98b; margin:0.4rem 0;"><strong>Directive:</strong> ${metut1.directive}</p>
        </div>

        <div style="border:1px solid rgba(212,175,55,0.45); background:rgba(13,6,20,0.92); padding:1.1rem; border-radius:8px;">
          <div style="font-size:0.72rem; letter-spacing:0.12em; color:#d4af37; text-transform:uppercase;">III. Modifying Metut · ${metut2.code}</div>
          <h4 style="margin:0.35rem 0; color:#fff; font-size:1.1rem;">${metut2.name} (${metut2.neter})</h4>
          <div style="font-size:0.75rem; color:#e5c158; margin-bottom:0.4rem;">Suit: ${metut2.suit}</div>
          <p style="font-size:0.85rem; color:#cfc3df; margin:0.4rem 0;"><strong>Condition:</strong> ${metut2.condition}</p>
          <p style="font-size:0.85rem; color:#f3d98b; margin:0.4rem 0;"><strong>Directive:</strong> ${metut2.directive}</p>
        </div>
      </div>

      <div style="margin-top:1rem; border:1px solid rgba(212,175,55,0.65); background:linear-gradient(135deg, rgba(34,15,53,0.95), rgba(13,6,20,0.98)); padding:1.1rem; border-radius:8px; text-align:left;">
        <div style="font-size:0.75rem; letter-spacing:0.12em; color:#d4af37; text-transform:uppercase;">IV. Combined Metutu Synthesis · ${date}</div>
        <p style="margin:0.45rem 0; color:#fff; font-size:0.92rem;"><strong>${synthesis}</strong></p>
        <p style="margin:0.35rem 0 0; color:#d8cde6; font-size:0.84rem;">${sphereResonance}</p>
      </div>
    `;
  }

  async function initOracleOfTehuti() {
    const birthInput = document.getElementById("oracleBirthdate");
    const drawBtn = document.getElementById("oracleDrawBtn");
    const outputEl = document.getElementById("oracleReadingOutput");

    if (!birthInput || !drawBtn || !outputEl) return;

    const savedBirthdate = localStorage.getItem(STORAGE_KEY);
    if (savedBirthdate) {
      birthInput.value = savedBirthdate;
    }

    async function executeDraw() {
      const birthVal = birthInput.value.trim();
      if (!birthVal) {
        outputEl.innerHTML = `<p style="color:#f3d98b; margin-top:0.75rem;">Enter your birth date to anchor your Natal Paut Neteru Significator.</p>`;
        return;
      }

      try {
        localStorage.setItem(STORAGE_KEY, birthVal);
        const deck = await loadDeck();
        const reading = computeDailyReading(deck, birthVal);
        renderReading(outputEl, reading);
      } catch (err) {
        outputEl.innerHTML = `<p style="color:#ff8a8a; margin-top:0.75rem;">Oracle alignment error: ${err.message}</p>`;
      }
    }

    drawBtn.addEventListener("click", executeDraw);

    if (savedBirthdate) {
      executeDraw();
    }
  }

  document.addEventListener("DOMContentLoaded", initOracleOfTehuti);
  window.OracleOfTehuti = { init: initOracleOfTehuti, computeDailyReading };
})();
