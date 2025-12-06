import assert from "assert";
import { classifyQuestion } from "../questionClassifier.js";
import { parseGiftFile } from "../giftParser.js";

console.log("🧪 Test : questionClassifier.js");

const multi = parseGiftFile("./tests/samples/sampleMulti.gift")[0];
const sa = parseGiftFile("./tests/samples/sampleSA.gift")[0];

assert.strictEqual(classifyQuestion(multi), "multiple", "Should detect MCQ");
assert.strictEqual(classifyQuestion(sa), "courte", "Should detect short answer");

console.log("  ✓ Classifier → OK\n");
