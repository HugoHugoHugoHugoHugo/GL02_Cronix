import assert from "assert";
import { parseGiftFile } from "../giftParser.js";

console.log("🧪 Test : giftParser.js");

const q = parseGiftFile("./tests/samples/sample1.gift");

assert.strictEqual(Array.isArray(q), true, "Le parser doit retourner une liste");
assert.ok(q.length > 0, "Le parser doit trouver au moins 1 question");

assert.ok(q[0].text.length > 0, "L’énoncé doit être extrait");
assert.ok(q[0].answers.length > 0, "Les réponses doivent être extraites");

console.log("  ✓ Parser → OK\n");
