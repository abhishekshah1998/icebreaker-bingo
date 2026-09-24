export const BOARD_SIZE = 5;

export const PROMPT_PACKS = {
  social: [
    "Has lived in another country", "Can speak three or more languages", "Has met someone famous", "Is an only child",
    "Has run a marathon", "Plays a musical instrument", "Has a hidden talent", "Has been skydiving", "Prefers tea over coffee",
    "Has a pet with a human name", "Loves karaoke", "Has visited five or more countries", "Can cook a signature dish",
    "Shares your birth month", "Has started a business", "Has an unusual collection", "Has been on television", "Is left-handed",
    "Has changed careers", "Woke up before 6am today", "Has a tattoo", "Knows a magic trick",
    "Has read more than 20 books this year", "Has the same favorite movie genre as you"
  ],
  work: [
    "Joined the team this year", "Works in a different time zone", "Has switched career paths", "Has presented to 100+ people",
    "Uses an unusual productivity trick", "Has worked from another country", "Can explain their job without jargon",
    "Has built something from scratch", "Prefers meetings before noon", "Has a desk snack right now", "Learned a new skill this month",
    "Has mentored someone", "Has been at the company 5+ years", "Uses dark mode for everything", "Has shipped a product",
    "Has met a teammate in another country", "Has a surprising first job", "Keeps inbox zero", "Has a work playlist",
    "Can recommend a great podcast", "Has automated a repetitive task", "Has worked in three industries",
    "Has a non-work creative hobby", "Can name the last company value"
  ],
  wedding: [
    "Knew one of the newlyweds in school", "Traveled 500+ miles to be here", "Has been married 10+ years",
    "Is related to the couple", "Was at the proposal", "Shares a hobby with one newlywed", "Has a great first-date story",
    "Is wearing something borrowed", "Has danced with a newlywed before", "Can give excellent marriage advice",
    "Has known the couple for 5+ years", "Met the couple at work", "Cried during the ceremony", "Is attending their first wedding",
    "Has caught a bouquet", "Knows the couple's favorite restaurant", "Can name the couple's first trip",
    "Has the same anniversary month", "Helped plan today's celebration", "Has a photo with the couple",
    "Is ready for the dance floor", "Can tell a funny story about a newlywed", "Has traveled with the couple", "Made a new friend today"
  ]
};

export function normalizePrompts(value) {
  const lines = Array.isArray(value) ? value : String(value).split(/\r?\n/);
  const seen = new Set();
  return lines.map((line) => String(line).trim()).filter((line) => {
    const key = line.toLocaleLowerCase();
    if (!line || seen.has(key)) return false;
    seen.add(key);
    return true;
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

export function createBoard(prompts, seed) {
  const normalized = normalizePrompts(prompts);
  if (normalized.length < 24) throw new Error("A bingo card needs at least 24 unique prompts.");
  const shuffled = shuffleSeeded(normalized, seed).slice(0, 24);
  shuffled.splice(12, 0, "FREE");
  return shuffled;
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
  const json = JSON.stringify({ v: 1, title: config.title, prompts: normalizePrompts(config.prompts), seed: config.seed });
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeGame(token) {
  const padded = token.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(token.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const parsed = JSON.parse(new TextDecoder().decode(bytes));
  const prompts = normalizePrompts(parsed.prompts);
  if (parsed.v !== 1 || typeof parsed.title !== "string" || prompts.length < 24 || !Number.isFinite(parsed.seed)) throw new Error("This game link is invalid.");
  return { title: parsed.title.slice(0, 60), prompts, seed: Math.trunc(parsed.seed) };
}
