// searchQuestion.js
import { parseGiftFile } from "./giftParserForConceptionTest.js";
import fs from "fs";
import path from "path";

export function searchQuestion(content, beginning, input) {
  const giftFiles = [];

  // Collecte des fichiers
  const stat = fs.statSync(input);

  if (stat.isDirectory()) {
    const files = fs.readdirSync(input)
      .filter(f => f.endsWith(".gift"))
      .map(f => path.join(input, f));
    giftFiles.push(...files);
  } else if (input.endsWith(".gift")) {
    giftFiles.push(input);
  }

  // Lecture et tri des questions
  let questions = [];
  
  for (const file of giftFiles) {
    try {
      const allQuestions = parseGiftFile(file);
      
      // Filtrage selon les critères
      if (beginning && beginning !== "" && content && content !== "") {
        // Recherche par titre ET contenu
        const q_temp = allQuestions.filter(q => 
          q.title && q.title.startsWith(beginning) && 
          q.text && q.text.includes(content)
        );
        if (q_temp.length > 0) {
          questions.push(q_temp);
        }
      } else if (beginning && beginning !== "") {
        // Recherche par titre uniquement
        const q_temp = allQuestions.filter(q => 
          q.title && q.title.startsWith(beginning)
        );
        if (q_temp.length > 0) {
          questions.push(q_temp);
        }
      } else if (content && content !== "") {
        // Recherche par contenu uniquement
        const q_temp = allQuestions.filter(q => 
          q.text && q.text.includes(content)
        );
        if (q_temp.length > 0) {
          questions.push(q_temp);
        }
      } else {
        // Aucun critère : retourner toutes les questions
        questions.push(allQuestions);
      }
    } catch (error) {
      console.error(`Erreur lors du parsing de ${file}:`, error.message);
    }
  }

  return questions;
}
