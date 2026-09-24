export const BOARD_SIZE = 5;
export const REQUIRED_ENTRIES = 24;

export function cleanText(value, maxLength = 120) {
  return String(value ?? "").trim().replace(/\s+/g, " ").slice(0, maxLength);
}

export function normalizeEntries(entries) {
  if (!Array.isArray(entries)) return [];
  const seenPrompts = new Set();
  return entries.flatMap((entry) => {
    const name = cleanText(entry?.name, 60);
    const prompt = cleanText(entry?.prompt, 140);
    const promptKey = prompt.toLocaleLowerCase();
    if (!name || !prompt || seenPrompts.has(promptKey)) return [];
    seenPrompts.add(promptKey);
    return [{ name, prompt }];
  });
}

export function mulberry32(seed) {
  let value = seed | 0;
  return function random() {
    value = (value + 0x6d2b79f5) | 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleSeeded(items, seed) {
  const shuffled = [...items];
  const random = mulberry32(seed);
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

export function createBoard(entries, seed) {
  const normalized = normalizeEntries(entries);
  if (normalized.length < REQUIRED_ENTRIES) throw new Error(`A bingo card needs at least ${REQUIRED_ENTRIES} complete name and prompt pairs.`);
  const board = shuffleSeeded(normalized, seed).slice(0, REQUIRED_ENTRIES);
  board.splice(12, 0, { name: "", prompt: "FREE", free: true });
  return board;
}

export function uniqueNames(entries) {
  const names = new Map();
  normalizeEntries(entries).forEach(({ name }) => names.set(name.toLocaleLowerCase(), name));
  return [...names.values()].sort((first, second) => first.localeCompare(second));
}

export function isCorrectMatch(entry, selectedName) {
  return cleanText(entry?.name, 60).localeCompare(cleanText(selectedName, 60), undefined, { sensitivity: "accent" }) === 0;
}

export function winningLines(claims) {
  if (!Array.isArray(claims) || claims.length !== 25) return [];
  const indexes = [];
  for (let row = 0; row < BOARD_SIZE; row += 1) indexes.push([...Array(BOARD_SIZE)].map((_, col) => row * BOARD_SIZE + col));
  for (let col = 0; col < BOARD_SIZE; col += 1) indexes.push([...Array(BOARD_SIZE)].map((_, row) => row * BOARD_SIZE + col));
  indexes.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  return indexes.filter((line) => line.every((index) => index === 12 || Boolean(claims[index])));
}

export function encodeGame(config) {
  const payload = {
    v: 2,
    t: cleanText(config.title, 60) || "Icebreaker Bingo",
    e: normalizeEntries(config.entries).map(({ name, prompt }) => ({ n: name, p: prompt })),
    s: Math.trunc(config.seed)
  };
  if (payload.e.length < REQUIRED_ENTRIES || !Number.isFinite(payload.s)) throw new Error("Game configuration is incomplete.");
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeGame(token) {
  const padded = String(token).replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  const entries = normalizeEntries(parsed.e?.map(({ n, p }) => ({ name: n, prompt: p })));
  if (parsed.v !== 2 || entries.length < REQUIRED_ENTRIES || !Number.isFinite(parsed.s)) throw new Error("This player link is invalid or incomplete.");
  return { title: cleanText(parsed.t, 60) || "Icebreaker Bingo", entries, seed: Math.trunc(parsed.s) };
}
