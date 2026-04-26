const listEl = document.getElementById("list");
const formEl = document.getElementById("add-form");
const inputEl = document.getElementById("domain");
const statusEl = document.getElementById("status");
const enabledEl = document.getElementById("enabledToggle");

function normalize(raw) {
  let d = raw.trim().toLowerCase();
  if (!d) return null;
  d = d.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0].split(":")[0];
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(d)) return null;
  return d;
}

function ruleForDomain(domain, id) {
  return {
    id,
    priority: 1,
    action: { type: "block" },
    condition: {
      urlFilter: `||${domain}/`,
      resourceTypes: ["main_frame", "sub_frame"],
    },
  };
}

async function getState() {
  const { domains = [], enabled = true } = await chrome.storage.local.get(["domains", "enabled"]);
  return { domains, enabled };
}

async function saveDomains(domains) {
  await chrome.storage.local.set({ domains });
}

async function saveEnabled(enabled) {
  await chrome.storage.local.set({ enabled });
}

async function syncRules(domains, enabled) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((r) => r.id);
  const addRules = enabled ? domains.map((d, i) => ruleForDomain(d, i + 1)) : [];
  await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds, addRules });
}

function render(domains) {
  listEl.innerHTML = "";
  if (domains.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "No sites blocked yet.";
    listEl.appendChild(li);
    return;
  }
  for (const d of domains) {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = d;
    const btn = document.createElement("button");
    btn.className = "remove";
    btn.textContent = "×";
    btn.title = `Unblock ${d}`;
    btn.addEventListener("click", () => remove(d));
    li.appendChild(span);
    li.appendChild(btn);
    listEl.appendChild(li);
  }
}

function flash(msg) {
  statusEl.textContent = msg;
  setTimeout(() => { statusEl.textContent = ""; }, 2000);
}

async function add(raw) {
  const domain = normalize(raw);
  if (!domain) { flash("Invalid domain"); return; }
  const { domains, enabled } = await getState();
  if (domains.includes(domain)) { flash("Already blocked"); return; }
  const next = [...domains, domain].sort();
  await saveDomains(next);
  await syncRules(next, enabled);
  render(next);
  flash(`Blocked ${domain}`);
}

async function remove(domain) {
  const { domains, enabled } = await getState();
  const next = domains.filter((d) => d !== domain);
  await saveDomains(next);
  await syncRules(next, enabled);
  render(next);
  flash(`Unblocked ${domain}`);
}

async function setEnabled(enabled) {
  await saveEnabled(enabled);
  const { domains } = await getState();
  await syncRules(domains, enabled);
  document.body.classList.toggle("disabled", !enabled);
  flash(enabled ? "Blocking ON" : "Blocking OFF");
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const val = inputEl.value;
  inputEl.value = "";
  add(val);
});

enabledEl.addEventListener("change", (e) => setEnabled(e.target.checked));

(async () => {
  const { domains, enabled } = await getState();
  enabledEl.checked = enabled;
  document.body.classList.toggle("disabled", !enabled);
  await syncRules(domains, enabled);
  render(domains);
})();
