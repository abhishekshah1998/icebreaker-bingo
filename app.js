import { createBoard, decodeGame, encodeGame, isCorrectMatch, uniqueNames, winningLines } from "./core.js";

const $ = (selector) => document.querySelector(selector);
const elements = {
  welcome: $("#playerWelcome"), gameView: $("#gameView"), gameTitle: $("#gameTitle"), board: $("#bingoBoard"),
  matchCount: $("#matchCount"), progressBar: $("#progressBar"), shareButton: $("#shareButton"), printButton: $("#printButton"),
  moreButton: $("#moreButton"), gameMenu: $("#gameMenu"), newCardButton: $("#newCardButton"), resetButton: $("#resetButton"),
  matchDialog: $("#matchDialog"), matchForm: $("#matchForm"), dialogPrompt: $("#dialogPrompt"), guestName: $("#guestName"),
  matchError: $("#matchError"), clearSquareButton: $("#clearSquareButton"), liveRegion: $("#liveRegion"),
  winOverlay: $("#winOverlay"), keepPlayingButton: $("#keepPlayingButton"), toast: $("#toast")
};

let config;
let board = [];
let claims = Array(25).fill("");
let activeSquare = null;
let previouslyWon = false;
let toastTimer;

function randomSeed() {
  return globalThis.crypto?.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.floor(Math.random() * 2 ** 32);
}
function storageKey() { return `icebreaker-bingo:player:v2:${encodeGame(config)}`; }
function showToast(message) {
  elements.toast.textContent = message; elements.toast.classList.add("show"); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 2200);
}
function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey()));
    claims = Array.isArray(saved?.claims) && saved.claims.length === 25 ? saved.claims.map((name) => String(name).slice(0, 60)) : Array(25).fill("");
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
    elements.liveRegion.textContent = "Bingo! You matched five guests in a row.";
    elements.winOverlay.hidden = false;
  }
  previouslyWon = lines.length > 0;
}

function renderBoard() {
  elements.board.replaceChildren();
  board.forEach((entry, index) => {
    const square = document.createElement("button");
    square.type = "button"; square.className = "square"; square.dataset.index = String(index); square.setAttribute("role", "gridcell");
    if (entry.free) {
      square.classList.add("free"); square.innerHTML = "<strong>FREE</strong><span>You showed up ✦</span>"; square.disabled = true;
      square.setAttribute("aria-label", "Free square");
    } else {
      const label = claims[index] ? `${entry.prompt}. Matched with ${claims[index]}. Tap to edit.` : `${entry.prompt}. Tap to match a guest.`;
      square.setAttribute("aria-label", label);
      const prompt = document.createElement("span"); prompt.textContent = entry.prompt; square.append(prompt);
      if (claims[index]) {
        square.classList.add("claimed");
        const person = document.createElement("span"); person.className = "person"; person.textContent = claims[index];
        const check = document.createElement("span"); check.className = "check"; check.setAttribute("aria-hidden", "true"); check.textContent = "✓";
        square.append(person, check);
      }
      square.addEventListener("click", () => openMatchDialog(index));
    }
    elements.board.append(square);
  });
  updateProgress();
}

function fillGuestNames() {
  const placeholder = document.createElement("option"); placeholder.value = ""; placeholder.textContent = "Choose a name";
  elements.guestName.replaceChildren(placeholder);
  uniqueNames(config.entries).forEach((name) => {
    const option = document.createElement("option"); option.value = name; option.textContent = name; elements.guestName.append(option);
  });
}

function openMatchDialog(index) {
  activeSquare = index;
  elements.dialogPrompt.textContent = board[index].prompt;
  elements.guestName.value = claims[index] || "";
  elements.matchError.textContent = "";
  elements.clearSquareButton.hidden = !claims[index];
  elements.matchDialog.showModal();
  setTimeout(() => elements.guestName.focus(), 0);
}

function startGame(nextConfig) {
  config = nextConfig; board = createBoard(config.entries, config.seed); loadProgress(); fillGuestNames();
  previouslyWon = winningLines(claims).length > 0;
  elements.gameTitle.textContent = config.title; elements.welcome.hidden = true; elements.gameView.hidden = false;
  document.title = `${config.title} · Player Bingo`; renderBoard();
}

async function copyLink() {
  try { await navigator.clipboard.writeText(location.href); }
  catch {
    const temporary = document.createElement("textarea"); temporary.value = location.href; document.body.append(temporary);
    temporary.select(); document.execCommand("copy"); temporary.remove();
  }
  showToast("Player link copied");
}

elements.matchForm.addEventListener("submit", (event) => {
  if (event.submitter?.value !== "save") return;
  event.preventDefault();
  const selected = elements.guestName.value;
  if (!selected) { elements.matchError.textContent = "Choose a guest first."; return; }
  if (!isCorrectMatch(board[activeSquare], selected)) {
    elements.matchError.textContent = "Not quite—keep mingling and try again.";
    elements.matchDialog.classList.remove("shake"); requestAnimationFrame(() => elements.matchDialog.classList.add("shake")); return;
  }
  claims[activeSquare] = board[activeSquare].name; saveProgress(); elements.matchDialog.close(); renderBoard(); showToast("It’s a match");
});
elements.clearSquareButton.addEventListener("click", () => {
  claims[activeSquare] = ""; saveProgress(); elements.matchDialog.close(); renderBoard(); showToast("Square cleared");
});
elements.shareButton.addEventListener("click", copyLink);
elements.printButton.addEventListener("click", () => window.print());
elements.keepPlayingButton.addEventListener("click", () => { elements.winOverlay.hidden = true; });
elements.moreButton.addEventListener("click", () => {
  const open = elements.gameMenu.hidden; elements.gameMenu.hidden = !open; elements.moreButton.setAttribute("aria-expanded", String(open));
});
elements.newCardButton.addEventListener("click", () => {
  config = { ...config, seed: randomSeed() }; board = createBoard(config.entries, config.seed); claims = Array(25).fill("");
  history.replaceState({}, "", `${location.pathname}?game=${encodeGame(config)}`); saveProgress(); previouslyWon = false;
  elements.gameMenu.hidden = true; renderBoard(); showToast("Fresh card ready");
});
elements.resetButton.addEventListener("click", () => {
  if (!claims.some(Boolean) || confirm("Clear every matched square on this card?")) {
    claims = Array(25).fill(""); saveProgress(); previouslyWon = false; elements.gameMenu.hidden = true; renderBoard(); showToast("Progress cleared");
  }
});
document.addEventListener("click", (event) => {
  if (!elements.gameMenu.hidden && !event.target.closest(".toolbar-actions")) { elements.gameMenu.hidden = true; elements.moreButton.setAttribute("aria-expanded", "false"); }
});

const token = new URLSearchParams(location.search).get("game");
if (token) {
  try { startGame(decodeGame(token)); }
  catch { $("#welcomeTitle").textContent = "This player link doesn’t work."; $("#playerWelcome p:last-of-type").textContent = "Ask your host to generate a fresh link from the host studio."; }
}
