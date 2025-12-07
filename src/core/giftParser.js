// giftParser.js

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

    // Check if this is an INSTRUCTION (no { } block)
    if (!body.includes("{")) {
      questions.push({
        type: "INSTRUCTION",
        title,
        text: body,
        answers: []
      });

      // detect context from instruction text
      const low = body.toLowerCase();
      if (low.includes("choose the correct") || low.includes("best answer") || low.includes("multiple choice"))
        currentContext = "MCQ";
      else if (low.includes("complete the sentences") && low.includes("one word"))
        currentContext = "OPEN";
      else if (low.includes("complete the sentences") || low.includes("think of the word"))
        currentContext = "OPEN";
      else if (low.includes("key word") || low.includes("word formation"))
        currentContext = "KWT";
      else
        currentContext = null;

      continue;
    }

    // Extract { ... } blocks - INCLUDING {1:MC:...} and {1:SA:...} formats
    const rawBlocks = [...body.matchAll(/\{([^}]*)\}/g)].map(m => m[1].trim());

    if (rawBlocks.length === 0) continue;

    // Detect question type from the blocks
    let type = null;
    const answers = [];

    for (const rawBlock of rawBlocks) {
      // Check for {1:MC:...} format (Multiple Choice)
      if (rawBlock.startsWith("1:MC:")) {
        type = "multiple";
        const content = rawBlock.substring(5); // Remove "1:MC:"
        // Extract choices: ~=correct ~wrong ~wrong
        const choices = content.split("~").filter(c => c.trim());
        answers.push(...choices.map(c => c.replace(/^=/, "").trim()));
      }
      // Check for {1:SA:...} format (Short Answer)
      else if (rawBlock.startsWith("1:SA:")) {
        type = "courte";
        const content = rawBlock.substring(5); // Remove "1:SA:"
        // Extract answers: =answer1~=answer2
        const answerList = content.split("~").filter(c => c.trim());
        answers.push(...answerList.map(a => a.replace(/^=/, "").trim()));
      }
      // Standard GIFT formats
      else if (rawBlock.includes("~")) {
        type = "multiple";
        const choices = [...rawBlock.matchAll(/(~|=)([^~=}]+)/g)].map(m => m[2].trim());
        answers.push(...choices);
      }
      // True/False
      else if (rawBlock.toLowerCase() === "true" || rawBlock.toLowerCase() === "false" ||
               rawBlock === "T" || rawBlock === "F") {
        type = "vrai_faux";
        answers.push(rawBlock);
      }
      // Numeric
      else if (/^\d+([.,]\d+)?(\.\.\d+([.,]\d+)?)?$/.test(rawBlock)) {
        type = "numerique";
        answers.push(rawBlock);
      }
      // Single answer with =
      else if (rawBlock.includes("=")) {
        const parts = rawBlock.split(/=|\|/).map(x => x.trim()).filter(Boolean);
        if (parts.length > 1) {
          type = "mot_manquant";
        } else {
          type = "courte";
        }
        answers.push(...parts);
      }
      // Default: courte
      else {
        if (!type) type = "courte";
        answers.push(rawBlock);
      }
    }

    // Override with context if available
    if (currentContext === "MCQ") type = "multiple";
    else if (currentContext === "OPEN") type = "courte";
    else if (currentContext === "KWT") type = "mot_manquant";

    questions.push({
      title,
      type: type || "inconnu",
      text: body,
      answers: answers.filter(a => a && a.length > 0)
    });
  }

  return questions;
}
