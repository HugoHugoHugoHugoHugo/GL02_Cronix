import assert from "assert";
import { profileFromFiles } from "../profiler.js";

console.log("🧪 Test : profiler.js");

const profile = profileFromFiles(["./tests/samples"]);

assert.ok(profile.total_questions > 0, "Le profil doit comptabiliser des questions");
assert.ok(profile.counts.multiple >= 0);
assert.ok(profile.counts.courte >= 0);

const sum = Object.values(profile.counts).reduce((a, b) => a + b, 0);

assert.strictEqual(sum, profile.total_questions, "Somme des counts = total_questions");

console.log("  ✓ Profiler → OK\n");
