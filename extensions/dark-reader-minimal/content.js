// Runs at document_start. libs/darkreader.js loaded just before exposes
// window.DarkReader in the content-script realm.

const PREDARK_ID = "__predark_dark_reader_minimal__";
const SAMPLE_ATTR = "data-drm-sample";
const THEME = {
  brightness: 100,
  contrast: 95,
  sepia: 0,
  mode: 1,
  darkSchemeBackgroundColor: "#202225",
  darkSchemeTextColor: "#dcd7d0"
};
const PREDARK_BG = THEME.darkSchemeBackgroundColor;
const PREDARK_FG = THEME.darkSchemeTextColor;

const sysDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

// Predark CSS is gated on the absence of the sample attribute, so we can
// turn it off briefly (synchronously, no paint) when sampling natural bg.
function injectPreStyle() {
  if (document.getElementById(PREDARK_ID)) return;
  const root = document.documentElement;
  if (!root) return;
  const pre = document.createElement("style");
  pre.id = PREDARK_ID;
  pre.textContent =
    `html:not([${SAMPLE_ATTR}]), html:not([${SAMPLE_ATTR}]) body {` +
    ` background: ${PREDARK_BG} !important;` +
    ` color: ${PREDARK_FG} !important; }`;
  (document.head || root).appendChild(pre);
}

function removePreStyle() {
  const pre = document.getElementById(PREDARK_ID);
  if (pre && pre.parentNode) pre.parentNode.removeChild(pre);
}

injectPreStyle();

let darkOn = false;
let initialDecisionMade = false;
let autoSkipThisLoad = false;

function rgbaLuminance(rgba) {
  const m = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  const r = +m[1], g = +m[2], b = +m[3];
  const a = m[4] !== undefined ? +m[4] : 1;
  if (a < 0.5) return null;
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Sample the page's NATURAL background (with predark momentarily disabled
// via the attribute). Must be called after DOMContentLoaded so author CSS
// is parsed.
function isPageNaturallyDark() {
  const html = document.documentElement;
  if (!html) return false;
  html.setAttribute(SAMPLE_ATTR, "");
  try {
    const samples = [];
    if (document.body) samples.push(getComputedStyle(document.body).backgroundColor);
    samples.push(getComputedStyle(html).backgroundColor);
    for (const bg of samples) {
      const L = rgbaLuminance(bg);
      if (L === null) continue;
      if (L < 0.25) return true;
      if (L > 0.5) return false; // clearly bright; don't keep sampling
    }
  } finally {
    html.removeAttribute(SAMPLE_ATTR);
  }
  return false;
}

async function makeInitialDecision() {
  if (initialDecisionMade) return;
  if (document.readyState === "loading") {
    await new Promise((r) => document.addEventListener("DOMContentLoaded", r, { once: true }));
  }
  autoSkipThisLoad = isPageNaturallyDark();
  initialDecisionMade = true;
  applyState();
}

async function applyState() {
  if (!initialDecisionMade) return;
  const data = await browser.storage.local.get([
    "globalEnabled", "disabledSites", "followSystem"
  ]);
  const followSystem = data.followSystem !== false;
  const manualGlobal = data.globalEnabled !== false;
  const effectiveGlobal = followSystem ? sysDarkQuery.matches : manualGlobal;
  const disabledSites = data.disabledSites || {};
  const host = location.hostname;
  const userWantsOn = effectiveGlobal && !!host && !disabledSites[host];
  const shouldBeOn = userWantsOn && !autoSkipThisLoad;

  if (shouldBeOn && !darkOn) {
    try { DarkReader.enable(THEME); }
    catch (e) { removePreStyle(); return; }
    darkOn = true;
    requestAnimationFrame(() => requestAnimationFrame(removePreStyle));
  } else if (!shouldBeOn && darkOn) {
    try { DarkReader.disable(); } catch (e) {}
    darkOn = false;
    removePreStyle();
  } else if (!shouldBeOn) {
    removePreStyle();
  }
}

makeInitialDecision();

sysDarkQuery.addEventListener("change", () => applyState());

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (!("globalEnabled" in changes) && !("disabledSites" in changes) && !("followSystem" in changes)) return;
  // If the user explicitly toggles, ignore the auto-skip decision.
  if ("disabledSites" in changes || "globalEnabled" in changes) autoSkipThisLoad = false;
  applyState();
});

browser.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;
  if (msg.type === "set-dark") {
    autoSkipThisLoad = false; // explicit user action overrides auto-detect
    applyState();
  }
  if (msg.type === "ping") sendResponse({ ok: true });
});
