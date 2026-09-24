import { PROMPT_PACKS, createBoard, decodeGame, encodeGame, normalizePrompts, winningLines } from "./core.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  setupView: $("#setupView"), gameView: $("#gameView"), setupForm: $("#setupForm"), eventName: $("#eventName"),
  prompts: $("#prompts"), promptCount: $("#promptCount"), setupError: $("#setupError"), gameTitle: $("#gameTitle"),
  board: $("#bingoBoard"), matchCount: $("#matchCount"), progressBar: $("#progressBar"), shareButton: $("#shareButton"),
  backButton: $("#backButton"), newCardButton: $("#newCardButton"), resetButton: $("#resetButton"),
  printButton: $("#printButton"), moreButton: $("#moreButton"), gameMenu: $("#gameMenu"), nameDialog: $("#nameDialog"),
  nameForm: $("#nameForm"), dialogPrompt: $("#dialogPrompt"), personName: $("#personName"),
  clearSquareButton: $("#clearSquareButton"), liveRegion: $("#liveRegion"), howDialog: $("#howDialog"),
  howButton: $("#howButton"), winOverlay: $("#winOverlay"), keepPlayingButton: $("#keepPlayingButton"), toast: $("#toast")
};

let config = null;
let board = [];
let claims = Array(25).fill("");
let activeSquare = null;
let previouslyWon = false;
let toastTimer = null;

function randomSeed() {
  return globalThis.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 2 ** 32);
}

function storageKey() { return `icebreaker-bingo:v3:${encodeGame(config)}`; }

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

function updatePromptCount() {
  const count = normalizePrompts(elements.prompts.value).length;
  elements.promptCount.textContent = `${Math.min(count, 24)} / 24${count > 24 ? ` +${count - 24}` : ""}`;
  elements.promptCount.classList.toggle("invalid", count < 24);
}

function setPack(name) {
  elements.prompts.value = PROMPT_PACKS[name].join("\n");
  updatePromptCount();
}

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()));
    claims = Array.isArray(saved?.claims) && saved.claims.length === 25 ? saved.claims.map((name) => String(name).slice(0, 40)) : Array(25).fill("");
  } catch { claims = Array(25).fill(""); }
}

function saveProgress() { localStorage.setItem(storageKey(), JSON.stringify({ claims })); }

function updateProgress() {
  const count = claims.filter(Boolean).length;
  elements.matchCount.textContent = String(count);
  elements.progressBar.style.width = `${(count / 24) * 100}%`;
  const lines = winningLines(claims);
  document.querySelectorAll(".square").forEach((square) => square.classList.remove("winning"));
  lines.flat().forEach((index) => document.querySelector(`[data-index="${index}"]`)?.classList.add("winning"));
  if (lines.length && !previouslyWon) {
    elements.liveRegion.textContent = "Bingo! You found five people in a row.";
    elements.winOverlay.hidden = false;
  }
  previouslyWon = lines.length > 0;
}

function squareLabel(prompt, index) {
  if (index === 12) return "Free square";
  return claims[index] ? `${prompt}. Claimed by ${claims[index]}. Tap to edit.` : `${prompt}. Tap to add a name.`;
}

function renderBoard() {
  elements.board.replaceChildren();
  board.forEach((prompt, index) => {
    const square = document.createElement("button");
    square.type = "button";
    square.className = "square";
    square.dataset.index = String(index);
    square.setAttribute("role", "gridcell");
    square.setAttribute("aria-label", squareLabel(prompt, index));
    if (index === 12) {
      square.classList.add("free");
      square.innerHTML = "<strong>FREE</strong><span>You showed up ✦</span>";
      square.disabled = true;
    } else {
      const promptText = document.createElement("span");
      promptText.textContent = prompt;
      square.append(promptText);
      if (claims[index]) {
        square.classList.add("claimed");
        const person = document.createElement("span");
        person.className = "person";
        person.textContent = claims[index];
        const check = document.createElement("span");
        check.className = "check";
        check.setAttribute("aria-hidden", "true");
        check.textContent = "✓";
        square.append(person, check);
      }
      square.addEventListener("click", () => openNameDialog(index));
    }
    elements.board.append(square);
  });
  updateProgress();
}

function openNameDialog(index) {
  activeSquare = index;
  elements.dialogPrompt.textContent = board[index];
  elements.personName.value = claims[index] || "";
  elements.clearSquareButton.hidden = !claims[index];
  elements.nameDialog.showModal();
  setTimeout(() => elements.personName.focus(), 0);
}

function startGame(nextConfig, pushHistory = true) {
  config = nextConfig;
  board = createBoard(config.prompts, config.seed);
  const token = encodeGame(config);
  if (pushHistory) history.pushState({}, "", `${location.pathname}?game=${token}`);
  loadProgress();
  previouslyWon = winningLines(claims).length > 0;
  elements.gameTitle.textContent = config.title;
  elements.setupView.hidden = true;
  elements.gameView.hidden = false;
  document.title = `${config.title} · Icebreaker Bingo`;
  renderBoard();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showSetup() {
  if (config) {
    elements.eventName.value = config.title;
    elements.prompts.value = config.prompts.join("\n");
    updatePromptCount();
  }
  elements.gameView.hidden = true;
  elements.setupView.hidden = false;
  elements.gameMenu.hidden = true;
  elements.moreButton.setAttribute("aria-expanded", "false");
  document.title = "Icebreaker Bingo";
  history.pushState({}, "", location.pathname);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(location.href);
  } catch {
    const temporary = document.createElement("textarea");
    temporary.value = location.href;
    document.body.append(temporary);
    temporary.select(); document.execCommand("copy"); temporary.remove();
  }
  showToast("Game link copied");
}

elements.setupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = elements.eventName.value.trim() || "Icebreaker Bingo";
  const prompts = normalizePrompts(elements.prompts.value);
  if (prompts.length < 24) {
    const missing = 24 - prompts.length;
    elements.setupError.textContent = `Add ${missing} more unique prompt${missing === 1 ? "" : "s"} to create a card.`;
    elements.prompts.focus(); return;
  }
  elements.setupError.textContent = "";
  startGame({ title, prompts, seed: randomSeed() });
});

elements.prompts.addEventListener("input", updatePromptCount);
document.querySelectorAll("[data-pack]").forEach((button) => button.addEventListener("click", () => setPack(button.dataset.pack)));
elements.shareButton.addEventListener("click", copyLink);
elements.backButton.addEventListener("click", showSetup);
elements.printButton.addEventListener("click", () => window.print());
elements.howButton.addEventListener("click", () => elements.howDialog.showModal());
elements.keepPlayingButton.addEventListener("click", () => { elements.winOverlay.hidden = true; });

elements.moreButton.addEventListener("click", () => {
  const willOpen = elements.gameMenu.hidden;
  elements.gameMenu.hidden = !willOpen;
  elements.moreButton.setAttribute("aria-expanded", String(willOpen));
});

elements.newCardButton.addEventListener("click", () => {
  config = { ...config, seed: randomSeed() };
  board = createBoard(config.prompts, config.seed);
  claims = Array(25).fill("");
  history.replaceState({}, "", `${location.pathname}?game=${encodeGame(config)}`);
  saveProgress(); previouslyWon = false; elements.gameMenu.hidden = true;
  renderBoard(); showToast("Fresh card ready");
});

elements.resetButton.addEventListener("click", () => {
  if (!claims.some(Boolean) || confirm("Clear every claimed square on this card?")) {
    claims = Array(25).fill(""); saveProgress(); previouslyWon = false; elements.gameMenu.hidden = true;
    renderBoard(); showToast("Progress cleared");
  }
});

elements.nameForm.addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const person = elements.personName.value.trim().slice(0, 40);
  if (!person) { elements.personName.focus(); return; }
  claims[activeSquare] = person;
  saveProgress(); elements.nameDialog.close(); renderBoard(); showToast("Square claimed");
});

elements.clearSquareButton.addEventListener("click", () => {
  claims[activeSquare] = "";
  saveProgress(); elements.nameDialog.close(); renderBoard(); showToast("Square cleared");
});

window.addEventListener("popstate", () => location.reload());
document.addEventListener("click", (event) => {
  if (!elements.gameMenu.hidden && !event.target.closest(".toolbar-actions")) {
    elements.gameMenu.hidden = true;
    elements.moreButton.setAttribute("aria-expanded", "false");
  }
});

function init() {
  setPack("social");
  const token = new URLSearchParams(location.search).get("game");
  if (!token) return;
  try { startGame(decodeGame(token), false); }
  catch {
    history.replaceState({}, "", location.pathname);
    elements.setupError.textContent = "That game link could not be opened. Create a fresh one below.";
  }
}

init();
