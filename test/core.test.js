import test from "node:test";
import assert from "node:assert/strict";
import { PROMPT_PACKS, createBoard, decodeGame, encodeGame, normalizePrompts, winningLines } from "../core.js";

test("normalizes blank and duplicate prompts", () => assert.deepEqual(normalizePrompts(" One \n\none\nTwo "), ["One", "Two"]));
test("creates a deterministic 5 by 5 board with a free center", () => {
  const first = createBoard(PROMPT_PACKS.social, 12345);
  assert.deepEqual(first, createBoard(PROMPT_PACKS.social, 12345));
  assert.equal(first.length, 25); assert.equal(first[12], "FREE"); assert.equal(new Set(first).size, 25);
});
test("rejects a prompt set that is too short", () => assert.throws(() => createBoard(["One", "Two"], 1), /24 unique prompts/));
test("finds rows, columns, and diagonal wins", () => {
  const row = Array(25).fill(""); [0, 1, 2, 3, 4].forEach((index) => { row[index] = "Person"; });
  assert.deepEqual(winningLines(row), [[0, 1, 2, 3, 4]]);
  const diagonal = Array(25).fill(""); [0, 6, 18, 24].forEach((index) => { diagonal[index] = "Person"; });
  assert.deepEqual(winningLines(diagonal), [[0, 6, 12, 18, 24]]);
});
test("round-trips unicode game configuration through a share token", () => {
  const config = { title: "A & K's soirée 🎉", prompts: PROMPT_PACKS.wedding, seed: 9876 };
  assert.deepEqual(decodeGame(encodeGame(config)), config);
});
