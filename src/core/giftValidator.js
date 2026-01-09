import fs from "fs";

/**
 * Vérifie la structure d'un fichier GIFT avant son parsing.
 * @param {string} filePath - Chemin du fichier
 * @returns {Object} { isValid: boolean, errors: string[] }
 */
export function validateGiftFile(filePath) {
  const errors = [];

  try {
    if (!fs.existsSync(filePath)) {
      return { isValid: false, errors: [`Fichier introuvable : ${filePath}`] };
    }

    const rawContent = fs.readFileSync(filePath, "utf8");

    // 1. Vérification fichier vide
    if (!rawContent.trim()) {
      return { isValid: false, errors: ["Le fichier est vide."] };
    }

    // Nettoyage des commentaires pour l'analyse (comme dans giftParser.js)
    const cleaned = rawContent
      .replace(/\r/g, "")
      .replace(/\/\/.*$/gm, "");

    // 2. Vérification globale des accolades
    const totalOpen = (cleaned.match(/\{/g) || []).length;
    const totalClose = (cleaned.match(/\}/g) || []).length;

    if (totalOpen !== totalClose) {
      errors.push(`Déséquilibre global d'accolades : ${totalOpen} ouvrantes vs ${totalClose} fermantes.`);
    }

    // 3. Analyse par bloc (Question)
    // On découpe par double saut de ligne pour isoler les questions visuellement
    const blocks = cleaned.split(/\n\s*\n/).filter(b => b.trim());

    blocks.forEach((block, index) => {
      const i = index + 1;
      const text = block.trim();

      // Vérification du titre ::Titre:: (Crucial pour votre parser actuel)
      const titleMatch = text.match(/^::.*?::/);
      if (!titleMatch) {
        errors.push(`Question ${i} (début: "${text.substring(0, 20)}...") : Titre manquant ou incorrect. Le format attendu est ::Titre::. Cette question risque d'être ignorée.`);
      }

      // Vérification des accolades locales
      const localOpen = (text.match(/\{/g) || []).length;
      const localClose = (text.match(/\}/g) || []).length;
      if (localOpen !== localClose) {
        errors.push(`Question ${i} : Accolades déséquilibrées (${localOpen} vs ${localClose}).`);
      }
    });

  } catch (e) {
    errors.push(`Erreur système : ${e.message}`);
  }

  return { isValid: errors.length === 0, errors };
}