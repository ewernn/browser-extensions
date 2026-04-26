const $ = (id) => document.getElementById(id);

let host = null;
let activeTabId = null;
let activeTabUrl = null;
let isPrivileged = false;

// In-memory snapshot of the latest known storage state. Mutated optimistically
// on user clicks; reconciled by storage.onChanged.
const state = { globalEnabled: true, disabledSites: {}, followSystem: true };

const sysDarkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function safeHost(url) {
  try { return new URL(url).hostname; } catch (e) { return null; }
}

function effectiveGlobal() {
  if (state.followSystem !== false) return sysDarkQuery.matches;
  return state.globalEnabled !== false;
}

function effectiveSiteEnabled() {
  return effectiveGlobal() && !!host && !state.disabledSites[host];
}

async function init() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab && tab.id;
  activeTabUrl = tab && tab.url;
  host = safeHost(activeTabUrl);
  isPrivileged = !/^https?:/.test(activeTabUrl || "");
  const data = await browser.storage.local.get(["globalEnabled", "disabledSites", "followSystem"]);
  Object.assign(state, {
    globalEnabled: data.globalEnabled !== false,
    disabledSites: data.disabledSites || {},
    followSystem: data.followSystem !== false
  });
  render();
}

function render() {
  const followSystem = state.followSystem !== false;
  const effGlobal = effectiveGlobal();

  $("host").textContent = host || (isPrivileged ? "(restricted page)" : "(no site)");

  const gt = $("globalToggle");
  gt.checked = effGlobal;
  // Always interactable; clicking it switches off followSystem automatically.
  gt.disabled = false;
  gt.title = followSystem
    ? `Following system (${effGlobal ? "dark" : "light"}) — click to override`
    : "Toggle global dark mode";

  $("followToggle").checked = followSystem;

  const siteOn = effectiveSiteEnabled();
  const btn = $("siteToggle");
  btn.classList.toggle("on", siteOn);
  btn.textContent = siteOn ? "ON" : "OFF";
  btn.disabled = isPrivileged || !host || !effGlobal;
  $("bigLabel").textContent = !host
    ? "no site"
    : !effGlobal
      ? (followSystem ? "system is light" : "globally off")
      : siteOn
        ? "click to disable"
        : "click to enable";

  const list = $("list");
  list.innerHTML = "";
  const hosts = Object.keys(state.disabledSites).sort();
  if (hosts.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty";
    empty.textContent = "no sites disabled";
    list.appendChild(empty);
  } else {
    for (const h of hosts) {
      const li = document.createElement("li");
      const span = document.createElement("span");
      span.textContent = h;
      const x = document.createElement("button");
      x.className = "remove";
      x.type = "button";
      x.textContent = "×";
      x.title = `Re-enable ${h}`;
      x.addEventListener("click", (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        removeFromDisabled(h);
      });
      li.appendChild(span);
      li.appendChild(x);
      list.appendChild(li);
    }
  }
  $("count").textContent = `${hosts.length} disabled`;
}

// Inject scripts if needed, fire-and-forget. Doesn't block UI.
async function ensureInjected() {
  if (activeTabId == null || isPrivileged) return false;
  try {
    await browser.tabs.sendMessage(activeTabId, { type: "ping" });
    return true;
  } catch (e) {
    try {
      await browser.tabs.executeScript(activeTabId, { file: "/libs/darkreader.js", runAt: "document_start" });
      await browser.tabs.executeScript(activeTabId, { file: "/content.js", runAt: "document_start" });
      return true;
    } catch (e2) {
      return false;
    }
  }
}

function nudgeTab(enabled) {
  if (activeTabId == null || isPrivileged) return;
  // Try sendMessage immediately; on failure, inject and retry. All async,
  // never blocks the UI.
  browser.tabs.sendMessage(activeTabId, { type: "set-dark", enabled }).catch(async () => {
    const ok = await ensureInjected();
    if (!ok) {
      showNotice("Reload the page to apply.");
      return;
    }
    browser.tabs.sendMessage(activeTabId, { type: "set-dark", enabled }).catch(() => {
      showNotice("Reload the page to apply.");
    });
  });
}

function showNotice(msg) {
  $("notice").innerHTML = "";
  if (!msg) return;
  $("notice").textContent = msg;
  if (activeTabId != null) {
    const a = document.createElement("a");
    a.textContent = " Reload now";
    a.onclick = () => browser.tabs.reload(activeTabId).then(() => window.close());
    $("notice").appendChild(a);
  }
}

$("siteToggle").addEventListener("click", () => {
  if (!host) return;
  const isCurrentlyDisabled = !!state.disabledSites[host];
  if (isCurrentlyDisabled) delete state.disabledSites[host];
  else state.disabledSites[host] = true;
  // Optimistic render — instant visual feedback.
  render();
  const eff = effectiveSiteEnabled();
  // Persist + apply, in parallel, no awaits blocking the click.
  browser.storage.local.set({ disabledSites: state.disabledSites });
  nudgeTab(eff);
});

$("globalToggle").addEventListener("change", (e) => {
  // Manual global toggle implies the user is overriding system-follow.
  state.followSystem = false;
  state.globalEnabled = e.target.checked;
  render();
  browser.storage.local.set({
    followSystem: false,
    globalEnabled: state.globalEnabled
  });
  nudgeTab(effectiveSiteEnabled());
});

$("followToggle").addEventListener("change", (e) => {
  state.followSystem = e.target.checked;
  render();
  browser.storage.local.set({ followSystem: state.followSystem });
  nudgeTab(effectiveSiteEnabled());
});

$("reset").addEventListener("click", () => {
  state.disabledSites = {};
  render();
  browser.storage.local.set({ disabledSites: {} });
  nudgeTab(effectiveSiteEnabled());
});

function removeFromDisabled(h) {
  delete state.disabledSites[h];
  render();
  browser.storage.local.set({ disabledSites: state.disabledSites });
  if (h === host) nudgeTab(effectiveSiteEnabled());
}

// Reconcile if state changes from another window/the keyboard shortcut.
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  let touched = false;
  if ("globalEnabled" in changes) { state.globalEnabled = changes.globalEnabled.newValue !== false; touched = true; }
  if ("disabledSites" in changes) { state.disabledSites = changes.disabledSites.newValue || {}; touched = true; }
  if ("followSystem" in changes) { state.followSystem = changes.followSystem.newValue !== false; touched = true; }
  if (touched) render();
});

sysDarkQuery.addEventListener("change", render);

init();
