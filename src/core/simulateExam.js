// simulateExam.js — version propre
// Ne sauvegarde plus rien (rapports écrits uniquement via CLI)
// Calcule score + pourcentage mais ne les montre pas à l’étudiant.

import readline from "readline";
import fs from "fs";
import path from "path";
import { parseGiftFile } from "./giftParser.js";

function makeRl() {
  return readline.createInterface({ input: process.stdin, output: process.stdout });
}

function askOnce(prompt) {
  const rl = makeRl();
  return new Promise(resolve => {
    rl.question(prompt, ans => {
      rl.close();
      resolve((ans || "").trim());
    });
  });
}

function normalizeAnswer(str = "") {
  return str
    .toLowerCase()
    .replace(/[.,;:!?]/g, "")
    .replace(/\s+/g, " ")
    .replace(/'/g, "’")
    .trim();
}

function numberPlaceholders(text) {
  let c = 0;
  return text.replace(/ANSWER/g, () => `ANSWER${++c}`);
}

async function askChoice(prompt, max) {
  while (true) {
    const x = await askOnce(prompt);
    const n = Number(x);
    if (Number.isInteger(n) && n >= 1 && n <= max) return n - 1;
    console.log(`Entrée invalide — entrez un numéro entre 1 et ${max}.`);
  }
}

export async function simulateGiftTest(filePath) {
  // Parse fichier
  let questions;
  try {
    questions = parseGiftFile(filePath);
  } catch (e) {
    console.error("Erreur parsing :", e);
    return;
  }

  if (!questions || questions.length === 0) {
    console.log("Aucune question trouvée.");
    return;
  }

  // ID étudiant
  const studentId = await askOnce("Identifiant étudiant (optionnel) : ");

  console.log("\n=== Texte du test ===\n");

  // afficher texte avec placeholders
  for (const q of questions) {
    if (q.type === "INSTRUCTION") {
      console.log(`\n[Consigne] ${q.title}\n${q.text}\n`);
      continue;
    }
    const raw = q.textWithPlaceholders ?? q.text ?? "";
    console.log(`\n--- ${q.title} ---\n${numberPlaceholders(raw)}\n`);
  }

  // construction des gaps
  const gaps = [];
  for (const q of questions) {
    if (q.type === "INSTRUCTION") continue;
    if (!Array.isArray(q.blocks)) continue;
    for (let i = 0; i < q.blocks.length; i++) {
      gaps.push({
        parentTitle: q.title,
        block: q.blocks[i],
        type: q.blocks[i].type,
        globalId: gaps.length + 1
      });
    }
  }

  console.log("\n=== Phase de réponses ===\n");

  const answers = [];

  for (const g of gaps) {
    console.log(`Gap ${g.globalId} — "${g.parentTitle}" (type: ${g.type})`);

    let chosenText = null;

    if (g.type === "MCQ") {
      const choices = g.block.choices || [];
      for (let i = 0; i < choices.length; i++) {
        console.log(`  ${i + 1}. ${choices[i].text}`);
      }
      const idx = await askChoice(`Votre choix (1-${choices.length}) : `, choices.length);
      chosenText = choices[idx].text;
      answers.push({
        gapId: g.globalId,
        parentTitle: g.parentTitle,
        type: g.type,
        chosenIndex: idx,
        chosenText,
        expected: (g.block.choices || []).filter(c => c.correct).map(c => c.text)
      });
    }

    else if (g.type === "OPEN") {
      const user = await askOnce("Votre réponse : ");
      chosenText = user;
      answers.push({
        gapId: g.globalId,
        parentTitle: g.parentTitle,
        type: g.type,
        chosenIndex: null,
        chosenText: user,
        expected: g.block.answers || []
      });
    }

    else if (g.type === "KWT") {
      const user = await askOnce("Votre reformulation : ");
      chosenText = user;
      answers.push({
        gapId: g.globalId,
        parentTitle: g.parentTitle,
        type: g.type,
        chosenIndex: null,
        chosenText: user,
        expected: g.block.correct || []
      });
    }

    else {
      const user = await askOnce("Votre réponse : ");
      chosenText = user;
      answers.push({
        gapId: g.globalId,
        parentTitle: g.parentTitle,
        type: g.type,
        chosenIndex: null,
        chosenText: user,
        expected: []
      });
    }

    console.log("Réponse enregistrée.\n");
  }

  console.log("\nTest terminé.\n");

  // -------------- ÉVALUATION (non affichée) ------------------
  let correctCount = 0;

  for (const a of answers) {
    const userNorm = normalizeAnswer(a.chosenText);

    if (!a.expected || a.expected.length === 0) {
      continue;
    }

    for (const exp of a.expected) {
      if (normalizeAnswer(exp) === userNorm) {
        correctCount++;
        break;
      }
    }
  }

  const percent = answers.length > 0
    ? +(correctCount / answers.length * 100).toFixed(1)
    : 0;

  // -------------- RENVOI DU RAPPORT AU CLI -------------------
  return {
    studentId: studentId || null,
    file: path.basename(filePath),
    timestamp: new Date().toISOString(),
    totalGaps: answers.length,
    correctCount,
    percent,
    answers
  };
}