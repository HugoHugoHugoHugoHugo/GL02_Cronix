// questionClassifier.js
// Détection du type de question GIFT

export function classifyQuestion(q) {
  const answers = q.answers;

  // Si aucune réponse → question ouverte
  if (!answers || answers.length === 0) return "ouverte";

  // Vrai/Faux
  if (answers.length === 1 &&
      (answers[0].toLowerCase() === "true" || answers[0].toLowerCase() === "false")) {
    return "vrai_faux";
  }

  // Numérique (ex : "12", "4.5", "10..20")
  const numericRegex = /^\d+([.,]\d+)?(\.\.\d+([.,]\d+)?)?$/;
  if (answers.every(a => numericRegex.test(a))) return "numerique";

  // Plusieurs réponses correctes → QCM / transformation / courte multi-réponses
  if (answers.length > 1) return "multiple";

  // Une seule réponse textuelle courte
  if (answers.length === 1) return "courte";

  return "inconnu";
}