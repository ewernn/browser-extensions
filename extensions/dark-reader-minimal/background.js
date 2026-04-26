// Background is the single writer for storage and the source of truth for the
// toolbar badge. NEVER load libs/darkreader.js here — its `chrome` shim would
// clobber `browser.runtime` in extension pages.

browser.runtime.onInstalled.addListener(async () => {
  const existing = await browser.storage.local.get([
    "globalEnabled", "disabledSites", "followSystem"
  ]);
  const defaults = {};
  if (existing.globalEnabled === undefined) defaults.globalEnabled = true;
  if (existing.disabledSites === undefined) defaults.disabledSites = {};
  if (existing.followSystem === undefined) defaults.followSystem = true;
  if (Object.keys(defaults).length) await browser.storage.local.set(defaults);
});

browser.browserAction.setBadgeBackgroundColor({ color: "#555" });

function safeHost(url) {
  try { return new URL(url).hostname; } catch (e) { return null; }
}

function effectiveGlobal(globalEnabled, followSystem) {
  if (followSystem !== false) {
    // Background page can read OS preference directly.
    try { return matchMedia("(prefers-color-scheme: dark)").matches; }
    catch (e) { return globalEnabled !== false; }
  }
  return globalEnabled !== false;
}

function siteEnabled(globalEnabled, disabledSites, host, followSystem) {
  return effectiveGlobal(globalEnabled, followSystem) && !!host && !disabledSites[host];
}

async function refreshBadge(tabId) {
  let tab;
  try { tab = await browser.tabs.get(tabId); } catch (e) { return; }
  const { globalEnabled, disabledSites = {}, followSystem } =
    await browser.storage.local.get(["globalEnabled", "disabledSites", "followSystem"]);
  const host = safeHost(tab.url);
  const on = siteEnabled(globalEnabled, disabledSites, host, followSystem);
  try {
    await browser.browserAction.setBadgeText({
      text: on ? "" : "OFF",
      tabId
    });
  } catch (e) { /* tab gone */ }
}

async function refreshAllActiveBadges() {
  const tabs = await browser.tabs.query({ active: true });
  tabs.forEach((t) => refreshBadge(t.id));
}

browser.tabs.onActivated.addListener(({ tabId }) => refreshBadge(tabId));
browser.tabs.onUpdated.addListener((tabId, info) => {
  if (info.status === "complete" || info.url) refreshBadge(tabId);
});
browser.storage.onChanged.addListener(refreshAllActiveBadges);

async function broadcastToHost(host, enabled) {
  // Host-suffix match: example.com toggle hits both example.com and www.example.com.
  // We query all http(s) tabs and filter — match patterns can't do suffix logic.
  const tabs = await browser.tabs.query({ url: ["*://*/*"] });
  const matching = tabs.filter((t) => {
    const h = safeHost(t.url);
    return h === host || (h && h.endsWith("." + host)) || (h && host.endsWith("." + h));
  });
  matching.forEach((t) => {
    browser.tabs
      .sendMessage(t.id, { type: "set-dark", enabled })
      .catch(() => {});
  });
}

async function toggleHost(tab) {
  if (!tab || !tab.id) return;
  const host = safeHost(tab.url);
  if (!host || !/^https?:/.test(tab.url || "")) return;

  const { globalEnabled, disabledSites = {}, followSystem } =
    await browser.storage.local.get(["globalEnabled", "disabledSites", "followSystem"]);
  const wasEnabled = siteEnabled(globalEnabled, disabledSites, host, followSystem);
  const nowEnabled = !wasEnabled;

  if (nowEnabled) delete disabledSites[host];
  else disabledSites[host] = true;

  await browser.storage.local.set({ disabledSites });
  broadcastToHost(host, nowEnabled);
}

browser.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== "toggle-dark") return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  toggleHost(tab);
});
