// profiler.js
// Génère le profil statistique à partir des fichiers GIFT

import fs from "fs";
import path from "path";
import { parseGiftFile } from "./giftParser.js";
import { classifyQuestion } from "./questionClassifier.js";

export function profileFromFiles(inputs) {

  const counts = {
    multiple: 0,
    vrai_faux: 0,
    appariement: 0,
    mot_manquant: 0,
    numerique: 0,
    courte: 0,
    ouverte: 0,
    inconnu: 0
  };

  let total = 0;
  const giftFiles = [];

  // Collecte des fichiers
  for (const input of inputs) {
    const stat = fs.statSync(input);

    if (stat.isDirectory()) {
      const files = fs.readdirSync(input)
        .filter(f => f.endsWith(".gift"))
        .map(f => path.join(input, f));
      giftFiles.push(...files);
    } else if (input.endsWith(".gift")) {
      giftFiles.push(input);
    }
  }

  // Lecture + classification
  for (const file of giftFiles) {
    const questions = parseGiftFile(file);

    for (const q of questions) {
      if (!q.answers || q.answers.length === 0) continue;

      const type = classifyQuestion(q);

      if (!counts[type]) counts[type] = 0;
      counts[type]++;
      total++;
    }
  }

  // Pourcentages
  const percentages = {};
  for (const t in counts) {
    percentages[t] = total > 0 ? Number(((counts[t] / total) * 100).toFixed(1)) : 0;
  }

  return {
    total_questions: total,
    counts,
    percentages,
    generated_at: new Date().toISOString()
  };
}