// simulateExam.js

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
    .replace(/'/g, "'")
    .trim();
}

function cleanHtml(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(b|i|strong|em|blockquote|div)[^>]*>/gi, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function askChoice(prompt, max) {
  while (true) {
    const x = await askOnce(prompt);
    const n = Number(x);
    if (Number.isInteger(n) && n >= 1 && n <= max) return n - 1;
    console.log(`Entrée invalide – entrez un numéro entre 1 et ${max}.`);
  }
}

/**
 * Extrait tous les blocs {1:MC:...} ou {1:SA:...} d'un texte
 */
function extractAnswerBlocks(text) {
  const blocks = [];
  const regex = /\{([^}]+)\}/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    blocks.push({
      fullMatch: match[0],
      content: match[1],
      index: match.index
    });
  }
  
  return blocks;
}

/**
 * Décompose une question avec plusieurs blancs en sous-questions
 */
function splitMultipleGaps(question) {
  const blocks = extractAnswerBlocks(question.text);
  
  if (blocks.length <= 1) {
    return [question]; // Une seule question
  }
  
  // Créer une sous-question pour chaque blanc
  const subQuestions = [];
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    
    // Extraire le contexte autour du blanc
    const textBefore = question.text.substring(0, block.index);
    const textAfter = question.text.substring(block.index + block.fullMatch.length);
    
    // Trouver la phrase qui contient ce blanc
    const sentences = question.text.split(/[.!?]+/);
    let relevantSentence = "";
    
    for (const sentence of sentences) {
      if (sentence.includes(block.fullMatch)) {
        relevantSentence = sentence.trim();
        break;
      }
    }
    
    subQuestions.push({
      ...question,
      title: `${question.title} - Gap ${i + 1}`,
      text: relevantSentence || question.text,
      answerBlock: block,
      gapNumber: i + 1,
      totalGaps: blocks.length
    });
  }
  
  return subQuestions;
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

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                        DÉBUT DU TEST                           ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // Afficher les consignes
  const instructions = questions.filter(q => q.type === "INSTRUCTION");
  let realQuestions = questions.filter(q => q.type !== "INSTRUCTION");

  if (instructions.length > 0) {
    console.log("📋 CONSIGNES :\n");
    for (const instr of instructions) {
      console.log(`${cleanHtml(instr.text)}\n`);
    }
    console.log("─".repeat(70) + "\n");
  }

  // Décomposer les questions avec plusieurs blancs
  const expandedQuestions = [];
  for (const q of realQuestions) {
    const subQuestions = splitMultipleGaps(q);
    expandedQuestions.push(...subQuestions);
  }

  if (expandedQuestions.length === 0) {
    console.log("Aucune question à répondre trouvée.");
    return;
  }

  const answers = [];
  let questionNumber = 1;

  for (const q of expandedQuestions) {
    console.log(`\n╭${"─".repeat(68)}╮`);
    console.log(`│ Question ${questionNumber}/${expandedQuestions.length}`.padEnd(69) + "│");
    console.log(`│ ${q.title}`.padEnd(69) + "│");
    console.log(`╰${"─".repeat(68)}╯\n`);

    let userAnswer = "";
    let correctAnswers = [];

    // Si c'est une sous-question avec un bloc spécifique
    if (q.answerBlock) {
      const block = q.answerBlock;
      const choicesBlock = block.content;

      if (q.type === "multiple") {
        // QCM
        let choices = [];
        let correctChoice = "";

        // Format {1:MC:~=correct~wrong~wrong}
        if (choicesBlock.includes("1:MC:")) {
          const content = choicesBlock.substring(choicesBlock.indexOf("1:MC:") + 5);
          const parts = content.split("~").filter(p => p.trim());
          
          for (const part of parts) {
            if (part.startsWith("=")) {
              correctChoice = part.substring(1).trim();
              choices.push(correctChoice);
            } else {
              choices.push(part.trim());
            }
          }
        }
        // Format standard {~wrong~=correct~wrong}
        else {
          const parts = choicesBlock.split(/[~=]/).filter(p => p.trim());
          choices = parts;
          const correctMatch = choicesBlock.match(/=([^~}]+)/);
          correctChoice = correctMatch ? correctMatch[1].trim() : "";
        }

        // Afficher le texte avec le blanc marqué
        const questionText = cleanHtml(q.text.replace(block.fullMatch, "______"));
        console.log(questionText + "\n");

        // Afficher les choix
        console.log("Choix disponibles :");
        choices.forEach((choice, i) => {
          console.log(`  ${i + 1}. ${choice}`);
        });

        const idx = await askChoice(`\n➤ Votre réponse (1-${choices.length}) : `, choices.length);
        userAnswer = choices[idx];
        correctAnswers = [correctChoice];
      }
      else if (q.type === "courte" || q.type === "mot_manquant") {
        // Question à réponse courte
        const questionText = cleanHtml(q.text.replace(block.fullMatch, "______"));
        console.log(questionText + "\n");

        // Format {1:SA:=answer}
        if (choicesBlock.includes("1:SA:")) {
          const content = choicesBlock.substring(choicesBlock.indexOf("1:SA:") + 5);
          const answerParts = content.split("~").filter(a => a.trim());
          
          for (const ans of answerParts) {
            if (ans.startsWith("=")) {
              correctAnswers.push(ans.substring(1).trim());
            }
          }
        }
        // Format standard {=answer}
        else {
          const parts = choicesBlock.split(/[=~]/).filter(p => p.trim());
          correctAnswers.push(...parts);
        }

        userAnswer = await askOnce("➤ Votre réponse : ");
      }
    }
    // Question simple (pas de sous-question)
    else {
      const blocks = extractAnswerBlocks(q.text);
      
      if (blocks.length === 0) {
        console.log("Question sans réponse détectée, passage à la suivante.");
        continue;
      }

      const block = blocks[0];
      const choicesBlock = block.content;

      if (q.type === "vrai_faux") {
        const questionText = cleanHtml(q.text.replace(block.fullMatch, ""));
        console.log(questionText + "\n");
        
        console.log("Répondez par :");
        console.log("  1. Vrai");
        console.log("  2. Faux");
        
        const idx = await askChoice("\n➤ Votre réponse (1-2) : ", 2);
        userAnswer = idx === 0 ? "true" : "false";
        correctAnswers = q.answers || [];
      }
      else if (q.type === "numerique") {
        const questionText = cleanHtml(q.text.replace(block.fullMatch, "______"));
        console.log(questionText + "\n");
        
        userAnswer = await askOnce("➤ Votre réponse (numérique) : ");
        correctAnswers = q.answers || [];
      }
      else {
        const questionText = cleanHtml(q.text.replace(block.fullMatch, "______"));
        console.log(questionText + "\n");
        
        userAnswer = await askOnce("➤ Votre réponse : ");
        correctAnswers = q.answers || [];
      }
    }

    answers.push({
      questionNumber,
      questionTitle: q.title,
      questionType: q.type,
      userAnswer,
      correctAnswers,
      timestamp: new Date().toISOString()
    });

    console.log("✓ Réponse enregistrée.");
    questionNumber++;
  }

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                        TEST TERMINÉ                            ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  // -------------- ÉVALUATION (non affichée à l'étudiant) ------------------
  let correctCount = 0;

  for (const a of answers) {
    const userNorm = normalizeAnswer(a.userAnswer);

    if (!a.correctAnswers || a.correctAnswers.length === 0) {
      continue;
    }

    // Vérifier si la réponse correspond à l'une des réponses acceptées
    for (const exp of a.correctAnswers) {
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
    studentId: studentId || "anonyme",
    file: path.basename(filePath),
    timestamp: new Date().toISOString(),
    totalQuestions: answers.length,
    correctCount,
    percent,
    answers
  };
}
