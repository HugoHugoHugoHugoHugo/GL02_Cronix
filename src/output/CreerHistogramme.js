// CreerHistogramme.js
// SP6.2 : Calcul d'un profil simple à partir d'un fichier .gift

import fs from "fs";
import { parseGiftFile } from "../core/giftParser.js";
import { classifyQuestion } from "../core/questionClassifier.js";

// Normalisation des types vers les noms demandés
function normalizeType(t) {
  const type = (t || "").toUpperCase();

  if (type.includes("QCM") || type.includes("MCQ")) return "QCM";
  if (type.includes("QRO") || type.includes("OPEN")) return "QRO";
  if (type.includes("VF") || type.includes("V/F") || type.includes("TRUEFALSE")) return "V/F";
  if (type.includes("CORRESP") || type.includes("MATCH")) return "Corresp";
  if (type.includes("NUM") || type.includes("NUMERICAL")) return "Num";
  if (type.includes("TROU") || type.includes("FILL")) return "Trous";

  return null;
}

export function CreerHistogramme(pathGift) {
  if (!pathGift) return null;
  if (!fs.existsSync(pathGift)) {
    console.error(`Fichier introuvable : ${pathGift}`);
    return null;
  }

  // Lecture brute
  const content = fs.readFileSync(pathGift, "utf-8");

  // Parse des questions (adapter le nom si besoin)
  // giftParser.js doit fournir parseGiftFile(content) -> tableau de questions
  const questions = parseGiftFile(content);

  const profil = {
    QCM: 0,
    QRO: 0,
    "V/F": 0,
    Corresp: 0,
    Num: 0,
    Trous: 0
  };

  for (const q of questions) {
    // questionClassifier.js doit fournir classifyQuestion(q) -> string type
    const t = classifyQuestion(q);
    const key = normalizeType(t);
    if (key && profil[key] !== undefined) profil[key] += 1;
  }

  return profil;
}
