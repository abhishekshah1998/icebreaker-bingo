import { REQUIRED_ENTRIES, cleanText, encodeGame, normalizeEntries } from "./core.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  form: $("#adminForm"), eventName: $("#eventName"), entryList: $("#entryList"), entryCount: $("#entryCount"),
  addButton: $("#addButton"), sampleButton: $("#sampleButton"), error: $("#adminError"), result: $("#linkResult"),
  playerLink: $("#playerLink"), copyButton: $("#copyButton"), openPlayerButton: $("#openPlayerButton"), toast: $("#toast")
};

const DRAFT_KEY = "icebreaker-bingo:admin-draft:v2";
const demoPrompts = [
  "Has lived in another country", "Can speak three or more languages", "Has met someone famous", "Is an only child",
  "Has run a marathon", "Plays a musical instrument", "Has a hidden talent", "Has been skydiving", "Prefers tea over coffee",
  "Has a pet with a human name", "Loves karaoke", "Has visited five or more countries", "Can cook a signature dish",
  "Shares your birth month", "Has started a business", "Has an unusual collection", "Has been on television", "Is left-handed",
  "Has changed careers", "Woke up before 6am today", "Has a tattoo", "Knows a magic trick",
  "Has read more than 20 books this year", "Has the same favorite movie genre as you"
];
const demoNames = ["Aarav", "Amara", "Ben", "Camila", "Daniel", "Elena", "Fatima", "Grace", "Hugo", "Inez", "Jonah", "Kai", "Leah", "Mateo", "Nora", "Omar", "Priya", "Quinn", "Ravi", "Sofia", "Theo", "Uma", "Victor", "Zoe"];
let toastTimer;
let saveTimer;

function randomSeed() {
  return globalThis.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 2 ** 32);
}
function showToast(message) {
  elements.toast.textContent = message; elements.toast.classList.add("show"); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}
function collectEntries() {
  return [...elements.entryList.querySelectorAll(".entry-row")].map((row) => ({
    name: row.querySelector(".name-input").value,
    prompt: row.querySelector(".prompt-input").value
  }));
}
function updateCount() {
  const complete = normalizeEntries(collectEntries()).length;
  elements.entryCount.textContent = `${complete} complete · ${REQUIRED_ENTRIES} required`;
  elements.entryCount.classList.toggle("complete", complete >= REQUIRED_ENTRIES);
}
function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify({ title: elements.eventName.value, entries: collectEntries() }));
}
function queueDraftSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveDraft, 250); }

function createEntryRow(entry = {}, index = elements.entryList.children.length) {
  const row = document.createElement("div"); row.className = "entry-row";
  const number = document.createElement("span"); number.className = "row-number"; number.textContent = String(index + 1).padStart(2, "0");
  const name = document.createElement("input"); name.className = "name-input"; name.type = "text"; name.maxLength = 60;
  name.placeholder = "Guest name"; name.value = entry.name || ""; name.setAttribute("aria-label", `Guest ${index + 1} name`);
  const prompt = document.createElement("input"); prompt.className = "prompt-input"; prompt.type = "text"; prompt.maxLength = 140;
  prompt.placeholder = "A unique fact or conversation starter"; prompt.value = entry.prompt || ""; prompt.setAttribute("aria-label", `Guest ${index + 1} prompt`);
  const remove = document.createElement("button"); remove.className = "remove-row"; remove.type = "button"; remove.textContent = "×"; remove.setAttribute("aria-label", `Remove guest ${index + 1}`);
  remove.addEventListener("click", () => { row.remove(); renumberRows(); updateCount(); queueDraftSave(); elements.result.hidden = true; });
  [name, prompt].forEach((input) => input.addEventListener("input", () => { updateCount(); queueDraftSave(); elements.result.hidden = true; input.closest(".entry-row").classList.remove("invalid"); }));
  row.append(number, name, prompt, remove); return row;
}
function renumberRows() {
  [...elements.entryList.children].forEach((row, index) => {
    row.querySelector(".row-number").textContent = String(index + 1).padStart(2, "0");
    row.querySelector(".name-input").setAttribute("aria-label", `Guest ${index + 1} name`);
    row.querySelector(".prompt-input").setAttribute("aria-label", `Guest ${index + 1} prompt`);
  });
}
function renderEntries(entries) {
  elements.entryList.replaceChildren();
  const rows = entries.length ? entries : Array.from({ length: REQUIRED_ENTRIES }, () => ({}));
  rows.forEach((entry, index) => elements.entryList.append(createEntryRow(entry, index)));
  updateCount();
}
function loadDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY));
    if (draft?.title) elements.eventName.value = draft.title;
    renderEntries(Array.isArray(draft?.entries) ? draft.entries : []);
  } catch { renderEntries([]); }
}
function buildPlayerUrl(config) {
  const playerUrl = new URL("./", location.href);
  playerUrl.searchParams.set("game", encodeGame(config));
  return playerUrl.href;
}
async function copyPlayerLink() {
  try { await navigator.clipboard.writeText(elements.playerLink.value); }
  catch { elements.playerLink.select(); document.execCommand("copy"); }
  showToast("Player link copied");
}

elements.addButton.addEventListener("click", () => {
  elements.entryList.append(createEntryRow()); renumberRows(); updateCount(); queueDraftSave();
  elements.entryList.lastElementChild.querySelector(".name-input").focus();
});
elements.sampleButton.addEventListener("click", () => {
  const hasContent = collectEntries().some(({ name, prompt }) => name.trim() || prompt.trim());
  if (hasContent && !confirm("Replace your current draft with demo guests?")) return;
  renderEntries(demoNames.map((name, index) => ({ name, prompt: demoPrompts[index] })));
  queueDraftSave(); elements.result.hidden = true; showToast("Demo guests loaded");
});
elements.eventName.addEventListener("input", () => { queueDraftSave(); elements.result.hidden = true; });
elements.copyButton.addEventListener("click", copyPlayerLink);
elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  const rawEntries = collectEntries();
  document.querySelectorAll(".entry-row").forEach((row) => row.classList.remove("invalid"));
  rawEntries.forEach((entry, index) => {
    if ((!entry.name.trim() && entry.prompt.trim()) || (entry.name.trim() && !entry.prompt.trim())) elements.entryList.children[index].classList.add("invalid");
  });
  const entries = normalizeEntries(rawEntries);
  if (entries.length < REQUIRED_ENTRIES) {
    elements.error.textContent = `Add ${REQUIRED_ENTRIES - entries.length} more complete, uniquely prompted guest${REQUIRED_ENTRIES - entries.length === 1 ? "" : "s"}.`;
    elements.entryList.querySelector(".invalid input, input:placeholder-shown")?.focus(); return;
  }
  elements.error.textContent = "";
  const config = { title: cleanText(elements.eventName.value, 60) || "Icebreaker Bingo", entries, seed: randomSeed() };
  const url = buildPlayerUrl(config);
  elements.playerLink.value = url; elements.openPlayerButton.href = url; elements.result.hidden = false;
  saveDraft(); elements.result.scrollIntoView({ behavior: "smooth", block: "center" }); showToast("Player game created");
});

loadDraft();
