// CreerHistogramme.js
// Calcul d'un profil à partir d'un fichier .gift

import fs from "fs";
import { parseGiftFile } from "../core/giftParser.js";
import { classifyQuestion } from "../core/questionClassifier.js";


// Normalisation classique

function normalizeType(t) {
  const type = (t || "").toString().trim().toUpperCase();

  if (type === "MC" || type.includes("MCQ") || type.includes("QCM") || type.includes("MULTI")) return "QCM";
  if (type === "SA" || type.includes("SHORT") || type.includes("OPEN") || type.includes("QRO") || type.includes("ESSAY")) return "QRO";
  if (type === "TF" || type.includes("TRUEFALSE") || type.includes("TRUE") || type.includes("FALSE") || type.includes("VF")) return "V/F";
  if (type.includes("CORRESP") || type.includes("MATCH")) return "Corresp";
  if (type === "NUM" || type.includes("NUMERICAL") || type.includes("NUMERIC")) return "Num";
  if (type.includes("CLOZE") || type.includes("FILL") || type.includes("GAP") || type.includes("TROU")) return "Trous";

  return null;
}

// Fallback : split GIFT

function splitGiftQuestions(content) {
  //nettoyage
  const txt = content.replace(/\uFEFF/g, "").trim();

  const rawBlocks = txt.split(/\n\s*\n+/);

  // Garder blocs significatifs
  return rawBlocks
    .map(b => b.trim())
    .filter(b => b.length > 0);
}

function detectTypeFromGiftBlock(block) {
  const b = block.toUpperCase();

  // NUM : {# ... }
  if (/\{#/.test(b)) return "Num";

  // V/F : {T} ou {F} ou TRUE/FALSE
  if (/\{\s*(T|F|TRUE|FALSE)\s*\}/.test(b)) return "V/F";

  // MATCHING / CORRESP : présence de "->"
  if (/->/.test(b)) return "Corresp";

  // CLOZE / TROUS : plusieurs champs {=...} dans une phrase, ou {~...}

  const braceAnswers = (block.match(/\{[^}]*\}/g) || []);
  if (braceAnswers.length >= 2) return "Trous";

  // QCM : dans une accolade, présence de ~ (choix multiples)
  if (/\{[^}]*~[^}]*\}/.test(b)) return "QCM";

  // QRO : une accolade avec juste =réponse et pas de ~
  if (/\{[^}]*=[^}]*\}/.test(b)) return "QRO";

  // Sinon, on met QRO par défaut (au moins ça compte)
  return "QRO";
}


// MAIN

export function CreerHistogramme(pathGift) {
  if (!pathGift) return null;
  if (!fs.existsSync(pathGift)) {
    console.error(`Fichier introuvable : ${pathGift}`);
    return null;
  }

  const content = fs.readFileSync(pathGift, "utf-8");

  const profil = {
    QCM: 0,
    QRO: 0,
    "V/F": 0,
    Corresp: 0,
    Num: 0,
    Trous: 0
  };


  let questions = null;

  // parseGiftFile peut attendre soit un chemin soit du contenu
  try {
    const content = fs.readFileSync(pathGift, "utf-8");
    questions = parseGiftFile(content); 
  } catch {
    try {
      questions = parseGiftFile(content);
    } catch {
      questions = null;
    }
  }

  // si parse renvoie un objet {questions:[...]}
  if (questions && !Array.isArray(questions) && Array.isArray(questions.questions)) {
    questions = questions.questions;
  }

  if (Array.isArray(questions) && questions.length > 0) {
    let added = 0;

    for (const q of questions) {
      let t = null;
      try {
        t = classifyQuestion(q);
      } catch {
        t = null;
      }

      const key = normalizeType(t);

      if (key && profil[key] !== undefined) {
        profil[key] += 1;
        added++;
      }
    }

    // Si on a réussi à classer au moins 1 question => on retourne
    if (added > 0) return profil;
    // Sinon on tombe en fallback
  }

  const blocks = splitGiftQuestions(content);

  for (const block of blocks) {
    const key = detectTypeFromGiftBlock(block);
    if (profil[key] !== undefined) profil[key] += 1;
  }

  return profil;
}
