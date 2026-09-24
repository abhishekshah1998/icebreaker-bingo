import test from "node:test";
import assert from "node:assert/strict";
import { createBoard, decodeGame, encodeGame, isCorrectMatch, normalizeEntries, uniqueNames, winningLines } from "../core.js";

const entries = Array.from({ length: 24 }, (_, index) => ({ name: `Guest ${index + 1}`, prompt: `Prompt ${index + 1}` }));

test("normalizes complete pairs and removes duplicate prompts", () => {
  assert.deepEqual(normalizeEntries([
    { name: " Alex  ", prompt: " Plays guitar " },
    { name: "", prompt: "Missing name" },
    { name: "Sam", prompt: "plays GUITAR" }
  ]), [{ name: "Alex", prompt: "Plays guitar" }]);
});

test("creates a deterministic board with a free center", () => {
  const first = createBoard(entries, 12345);
  assert.deepEqual(first, createBoard(entries, 12345));
  assert.equal(first.length, 25);
  assert.equal(first[12].free, true);
  assert.equal(new Set(first.filter((entry) => !entry.free).map((entry) => entry.prompt)).size, 24);
});

test("rejects an incomplete game", () => assert.throws(() => createBoard(entries.slice(0, 23), 1), /24 complete/));
test("matches configured names without case sensitivity", () => {
  assert.equal(isCorrectMatch({ name: "Priya Shah" }, "priya shah"), true);
  assert.equal(isCorrectMatch({ name: "Priya Shah" }, "Priya S."), false);
});
test("returns a sorted, de-duplicated player name list", () => {
  assert.deepEqual(uniqueNames([{ name: "Zoe", prompt: "A" }, { name: "alex", prompt: "B" }, { name: "Alex", prompt: "C" }]), ["Alex", "Zoe"]);
});
test("finds a completed diagonal using the free center", () => {
  const claims = Array(25).fill("");
  [0, 6, 18, 24].forEach((index) => { claims[index] = "Matched"; });
  assert.deepEqual(winningLines(claims), [[0, 6, 12, 18, 24]]);
});
test("round-trips event data through a player link token", () => {
  const config = { title: "A & K's soirée 🎉", entries, seed: 9876 };
  assert.deepEqual(decodeGame(encodeGame(config)), config);
});
