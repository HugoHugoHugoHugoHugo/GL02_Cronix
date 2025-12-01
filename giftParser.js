// giftParser.js

import fs from "fs";

export function parseGiftFile(path) {
  const raw = fs.readFileSync(path, "utf8");

  // Nettoyage minimal
  const cleaned = raw
    .replace(/\r/g, "")
    .replace(/\/\/.*$/gm, "")   // supprime les commentaires //...
    .trim();

  // Découpage par question ::titre::
  const blocks = cleaned.split(/\n\s*::/g);

  const questions = [];

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;

    // Remise en forme : rajouter "::" si disparu après split
    if (!block.startsWith("::")) block = "::" + block;

    // Extraction du titre
    const titleMatch = block.match(/^::([^:]+)::/);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const body = block.slice(titleMatch[0].length).trim();

    // Recherche de tous les blocs { ... }
    const answers = [...body.matchAll(/\{([\s\S]*?)\}/g)].map(m => m[1].trim());

    // Enoncé sans les réponses
    const text = body.replace(/\{[\s\S]*?\}/g, "").trim();

    questions.push({
      title,
      text,
      answers,   // tableau de blocs bruts
      raw: block,
      file: path
    });
  }

  return questions;
}
