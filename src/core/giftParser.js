// giftParser.js
import fs from "fs";

export function parseGiftFile(path) {
  const raw = fs.readFileSync(path, "utf8");
  const cleaned = raw
    .replace(/\r/g, "")
    .replace(/\/\/.*$/gm, "")  // Supprimer commentaires
    .trim();

  // Découpage par "::titre::"
  const blocks = cleaned.split(/\n\s*::/g);
  const questions = [];

  for (let block of blocks) {
    block = block.trim();
    if (!block) continue;
    if (!block.startsWith("::")) block = "::" + block;

    // Extraction titre
    const titleMatch = block.match(/^::([^:]+)::/);
    if (!titleMatch) continue;

    const title = titleMatch[1].trim();
    const body = block.slice(titleMatch[0].length).trim();

    // 1. INSTRUCTION

    if (!body.includes("{")) {
      questions.push({
        type: "INSTRUCTION",
        title,
        text: body,
        answers: []
      });
      continue;
    }

    // 2. Extraire tous les blocs {…}

    const rawBlocks = [...body.matchAll(/\{([\s\S]*?)\}/g)];
    if (rawBlocks.length === 0) {
      continue;
    }

    let type = null;
    const answers = [];

    for (const match of rawBlocks) {
      const rawBlock = match[1].trim();

      if (rawBlock.includes("\n") && rawBlock.match(/^[~=]/m)) {
        type = "multiple";
        const lines = rawBlock
          .split(/\n+/)
          .map(l => l.trim())
          .filter(l => l.length > 0);

        const correctAnswers = [];
        const allChoices = [];

        for (const line of lines) {
          // La bonne réponse commence par = (peut être suivi de ~)
          if (line.startsWith("=") || line.startsWith("~=")) {
            const answer = line.replace(/^~?=/, "").trim();
            correctAnswers.push(answer);
            allChoices.push(answer);
          } else if (line.startsWith("~")) {
            const answer = line.substring(1).trim();
            allChoices.push(answer);
          }
        }
        
        // Stocker toutes les réponses pour l'affichage
        answers.push(...allChoices);
        
        // Marquer les bonnes réponses en premier pour la correction
        answers.correctAnswers = correctAnswers;
        
        continue;
      }

      // FORMAT {1:MC:...}
      if (rawBlock.startsWith("1:MC:")) {
        type = "multiple";
        const content = rawBlock.substring(5);
        const parts = content.split("~").filter(x => x.trim());
        for (const part of parts) {
          answers.push(part.replace(/^=/, "").trim());
        }
        continue;
      }

      // FORMAT {1:SA:...}
      if (rawBlock.startsWith("1:SA:")) {
        type = "courte";
        const content = rawBlock.substring(5);
        const parts = content.split("~").filter(x => x.trim());
        for (const p of parts) {
          answers.push(p.replace(/^=/, "").trim());
        }
        continue;
      }

      // Format: {=answer1 =answer2#feedback}
      if (/^=.*=/.test(rawBlock) && !rawBlock.includes("~")) {
        type = "courte";
        // Séparer par = et # pour extraire les réponses
        const withoutFeedback = rawBlock.split("#")[0];
        const parts = withoutFeedback
          .split("=")
          .map(x => x.trim())
          .filter(Boolean);
        answers.push(...parts);
        continue;
      }

      // QCM standard {~bad~=good~bad}
      if (rawBlock.includes("~") && (rawBlock.includes("=") || rawBlock.match(/^~/))) {
        type = "multiple";
        const parts = [...rawBlock.matchAll(/(~|=)\s*([^~=}]+)/g)];
        for (const p of parts) {
          answers.push(p[2].trim());
        }
        continue;
      }

      // True/False
      if (["true", "false", "t", "f"].includes(rawBlock.toLowerCase())) {
        type = "vrai_faux";
        answers.push(rawBlock);
        continue;
      }

      // Numérique
      if (/^\d+([.,]\d+)?(\.\.\d+([.,]\d+)?)?$/.test(rawBlock)) {
        type = "numerique";
        answers.push(rawBlock);
        continue;
      }

      // Single answer avec = (sans ~)
      if (rawBlock.includes("=") && !rawBlock.includes("~")) {
        type = "courte";
        const withoutFeedback = rawBlock.split("#")[0];
        const parts = withoutFeedback
          .split(/[=|]/)
          .map(x => x.trim())
          .filter(Boolean);
        answers.push(...parts);
        continue;
      }

      // Fallback: réponse simple
      if (!type) type = "courte";
      answers.push(rawBlock);
    }

    questions.push({
      title,
      type: type || "courte",
      text: body,
      answers
    });
  }

  return questions;
}
