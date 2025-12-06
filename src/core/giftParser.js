// giftParser.js — Version robuste “context-aware”

import fs from "fs";

export function parseGiftFile(path) {
  const raw = fs.readFileSync(path, "utf8");

  const cleaned = raw
    .replace(/\r/g, "")
    .replace(/\/\/.*$/gm, "")
    .trim();

  // Split all blocks
  const blocks = cleaned.split(/\n\s*::/g);

  const questions = [];
  let currentContext = null;  // type deduced from instructions

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;
    if (!block.startsWith("::")) block = "::" + block;

    // Identify title
    const titleMatch = block.match(/^::([^:]+)::/);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const body = block.slice(titleMatch[0].length).trim();

    // Check if this is an INSTRUCTION
    if (!body.includes("{")) {
      questions.push({
        type: "INSTRUCTION",
        title,
        text: body,
        blocks: []
      });

      // detect context from instruction text
      const low = body.toLowerCase();
      if (low.includes("choose the correct") || low.includes("best answer"))
        currentContext = "MCQ";
      else if (low.includes("complete the sentences") && low.includes("one word"))
        currentContext = "OPEN";
      else if (low.includes("complete the sentences"))
        currentContext = "OPEN";
      else if (low.includes("key word"))
        currentContext = "KWT";
      else
        currentContext = null;

      continue;
    }

    // Extract { ... }
    const rawBlocks = [...body.matchAll(/\{([\s\S]*?)\}/g)].map(m => m[1].trim());

    // Detect question type
    let type = null;

    if (rawBlocks.some(b => b.includes("~"))) {
      type = "MCQ";
    } else {
      // no "~"
      // if multiple "=" → KWT
      if (rawBlocks.some(b => (b.match(/=/g) || []).length > 1)) {
        type = "KWT";
      } else {
        type = "OPEN";
      }
    }

    // if instruction context defined → override
    if (currentContext) type = currentContext;

    // Parse the blocks
    const parsedBlocks = rawBlocks.map(b => {
      if (type === "MCQ") {
        const choices = [...b.matchAll(/(~|=)([^~=}]+)/g)].map(m => ({
          correct: m[1] === "=",
          text: m[2].trim()
        }));
        return { type: "MCQ", choices };
      }

      if (type === "KWT") {
        const answers = b
          .split("=")
          .map(x => x.trim())
          .filter(Boolean);
        return { type: "KWT", answers };
      }

      // OPEN
      const answers = b
        .replace(/#.*$/, "") // remove metadata
        .split(/=|\|/)
        .map(a => a.trim())
        .filter(Boolean);

      return { type: "OPEN", answers };
    });

    // Question text without the {…}
    const textWithPlaceholders = body.replace(/\{[\s\S]*?\}/g, "ANSWER");

    questions.push({
      title,
      type,
      text: body,
      textWithPlaceholders,
      blocks: parsedBlocks
    });
  }

  return questions;
}