// simulateExam.js

import readline from "readline";
import fs from "fs";
import path from "path";
import { parseGiftFile } from "./giftParser.js";

function rlPrompt(q) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(q, ans => {
    rl.close();
    res(ans.trim());
  }));
}

function cleanHtml(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(b|i|u|strong|em|div|blockquote)[^>]*>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeAns(s) {
  return s.toLowerCase()
    .replace(/[.,;:!?]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// extraction de tous les {...}
function extractBlocks(t) {
  const out = [];
  const re = /\{([\s\S]*?)\}/g;
  let m;
  while ((m = re.exec(t)) !== null) {
    out.push({ full: m[0], content: m[1], index: m.index });
  }
  return out;
}

// remplacer tous les blocs par des blancs
function replaceBlocksWithBlanks(text) {
  return text.replace(/\{[\s\S]*?\}/g, "______");
}

// décomposition des multi gaps
function expandMultiGap(q) {
  const blocks = extractBlocks(q.text);
  if (blocks.length <= 1) return [q];

  const subs = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    const before = q.text.slice(0, b.index);
    const after  = q.text.slice(b.index + b.full.length);

    const sent = q.text.split(/[.!?]/).find(s => s.includes(b.full)) || q.text;

    subs.push({
      ...q,
      title: `${q.title} – Gap ${i + 1}`,
      text: sent,
      block: b,
      gap: i + 1,
      total: blocks.length
    });
  }
  return subs;
}

export async function simulateGiftTest(filePath) {
  const questions = parseGiftFile(filePath);

  const instructions = questions.filter(q => q.type === "INSTRUCTION");
  let real = questions.filter(q => q.type !== "INSTRUCTION");

  const studentId = await rlPrompt("Identifiant étudiant : ");

  console.log("\n=== DÉBUT DU TEST ===\n");

  if (instructions.length > 0) {
    console.log("📋 CONSIGNES :\n");
    for (const i of instructions) {
      // Nettoyer les instructions aussi
      const cleanedInstructions = cleanHtml(replaceBlocksWithBlanks(i.text));
      console.log(cleanedInstructions + "\n");
    }
    console.log("──────────────────────────────────────────────\n");
  }

  const expanded = [];
  for (const q of real) expanded.push(...expandMultiGap(q));

  const answers = [];
  let index = 1;

  for (const q of expanded) {
    console.log(`\n---- Question ${index}/${expanded.length} ----`);
    console.log(q.title);

    let user = "";
    let correct = [];
    let block = q.block || extractBlocks(q.text)[0];

    // Nettoyer le texte avant affichage
    let displayText = replaceBlocksWithBlanks(q.text);
    
    // Ensuite, si c'est un multi-gap, on doit montrer le contexte complet
    // mais avec un seul blanc à remplir (celui de la question actuelle)
    // Les autres blancs restent des ______
    
    const questionText = cleanHtml(displayText);
    console.log("\n" + questionText + "\n");

    const raw = block.content.trim();

    if (q.type === "multiple") {

      // MCQ multi-ligne
      if (raw.includes("\n") && raw.match(/^[~=]/m)) {
        const lines = raw.split(/\n+/).map(l => l.trim()).filter(Boolean);

        const choices = [];
        const correctAnswers = [];
        
        for (const line of lines) {
          // La bonne réponse peut être ~= ou juste =
          if (line.startsWith("=") || line.startsWith("~=")) {
            const answer = line.replace(/^~?=/, "").trim();
            choices.push(answer);
            correctAnswers.push(answer);
          } else if (line.startsWith("~")) {
            const answer = line.substring(1).trim();
            choices.push(answer);
          }
        }

        choices.forEach((c, i) => console.log(` ${i + 1}. ${c}`));

        const pick = Number(await rlPrompt(`Votre choix (1-${choices.length}) : `));
        user = choices[pick - 1] || "";
        correct = correctAnswers;
      }

      // MCQ compact (~wrong =correct)
      else {
        const parts = [...raw.matchAll(/(~|=)\s*([^~=}]+)/g)].map(x => x[2].trim());
        let correctMatch = raw.match(/=\s*([^~=}]+)/);
        correct = correctMatch ? [correctMatch[1].trim()] : [parts[0]];

        parts.forEach((c, i) => console.log(` ${i + 1}. ${c}`));
        const pick = Number(await rlPrompt(`Votre choix (1-${parts.length}) : `));
        user = parts[pick - 1] || "";
      }
    }

    else if (q.type === "courte" || q.type === "mot_manquant") {

      // 1:SA:
      if (raw.startsWith("1:SA:")) {
        const cont = raw.substring(5);
        const all = cont
          .split("~")
          .map(x => x.trim())
          .filter(Boolean)
          .map(x => x.replace(/^=/, "").trim());
        correct.push(...all);
      }
      else {
        const parts = raw.split(/[=~]/).map(x => x.trim()).filter(Boolean);
        correct.push(...parts);
      }

      user = await rlPrompt("Votre réponse : ");
    }

    else if (q.type === "vrai_faux") {
      console.log("1. Vrai\n2. Faux");
      const pick = Number(await rlPrompt("Votre choix (1-2) : "));
      user = pick === 1 ? "true" : "false";
      correct = q.answers;
    }

    else {
      user = await rlPrompt("Votre réponse : ");
      correct = q.answers;
    }

    answers.push({
      question: q.title,
      user,
      correct
    });

    index++;
  }

  // Correction (non affichée pour les étudiants)
  let good = 0;
  for (const a of answers) {
    const u = normalizeAns(a.user);
    for (const c of a.correct) {
      if (normalizeAns(c) === u) {
        good++;
        break;
      }
    }
  }

  const percent = +(good / answers.length * 100).toFixed(1);

  return {
    studentId: studentId || "anonyme",
    file: path.basename(filePath),
    timestamp: new Date().toISOString(),
    totalQuestions: answers.length,
    correctCount: good,
    percent,
    answers
  };
}
