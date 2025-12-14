// questionClassifier.js
// Détection du type de question GIFT

export function classifyQuestion(q) {
  // Si type déjà défini par le parser
  if (q.type && q.type !== "inconnu") return q.type;

  const answers = q.answers;

  // Si aucune réponse : question ouverte
  if (!answers || answers.length === 0) return "ouverte";

  // vrai/faux
  if (answers.length === 1 &&
      (answers[0].toLowerCase() === "true" || 
       answers[0].toLowerCase() === "false" ||
       answers[0] === "T" || 
       answers[0] === "F")) {
    return "vrai_faux";
  }

  // Numérique (ex : "12", "4.5", "10..20")
  const numericRegex = /^\d+([.,]\d+)?(\.\.\d+([.,]\d+)?)?$/;
  if (answers.every(a => numericRegex.test(a))) return "numerique";

  // Plusieurs réponses correctes type QCM / transformation / courte multi réponses
  if (answers.length > 1) return "multiple";

  // Une seule réponse textuelle courte
  if (answers.length === 1) return "courte";

  return "inconnu";
}
