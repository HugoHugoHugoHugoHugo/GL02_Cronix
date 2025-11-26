const fs = require('fs');

// Outil : extraire le bloc de réponses { ... }
const extractAnswerBlock = (question) => {
  const match = question.match(/\{([\s\S]*?)\}/);
  return match ? match[1].trim() : '';
};

// Outil : détecter le type de question (types utilisés dans le projet)
const detectQuestionType = (question) => {
  const answerBlock = extractAnswerBlock(question);

  if (answerBlock.includes('~') && answerBlock.includes('=')) return 'QCM';
  if (answerBlock.includes('->')) return 'Corresp';
  if (/^\s*(TRUE|FALSE|T|F)\b/i.test(answerBlock.trim())) return 'V/F';
  if (/^#|=\d+(:|..)/i.test(answerBlock)) return 'Num';
  if (/\{\}/.test(question)) return 'Trous';

  return 'QRO';
};

/**
 * 6.2 CreerHistogramme(Examen : Object) : fichierHistogramme : file
 * Ici, Examen peut être :
 *  - un chemin (string) vers un fichier .gift
 *  - un objet { filePath : string }
 * Sortie : un objet profil (et affichage possible dans un autre module)
 */
const CreerHistogramme = (Examen) => {
  let filePathExam = "";

  if (typeof Examen === "string") filePathExam = Examen;
  else if (Examen && Examen.filePath) filePathExam = Examen.filePath;

  if (!filePathExam || !fs.existsSync(filePathExam)) {
    console.log("Erreur : fichier d'examen introuvable.");
    return null;
  }

  const content = fs.readFileSync(filePathExam, 'utf-8');
  const questionsList = content
    .split("\n\n")
    .map(q => q.trim())
    .filter(Boolean);

  const profil = {
    'QCM': 0,
    'QRO': 0,
    'V/F': 0,
    'Corresp': 0,
    'Num': 0,
    'Trous': 0,
  };

  questionsList.forEach(q => {
    const t = detectQuestionType(q);
    if (profil[t] !== undefined) profil[t]++;
  });

  return profil;
};

module.exports = { CreerHistogramme };
