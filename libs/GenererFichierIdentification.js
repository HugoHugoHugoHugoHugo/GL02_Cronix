const fs = require('fs');
const path = require('path');
const readline = require('readline');

const DOSSIER_VCARD = path.join(__dirname, '..', 'Vcard_files');

/**
 * Poser une question à l’utilisateur.
 * @param {readline.Interface} interfaceLecture
 * @param {string} texte
 * @returns {Promise<string>}
 */
const poserQuestion = (interfaceLecture, texte) => {
  return new Promise((resolve) => {
    interfaceLecture.question(texte, (reponse) => resolve(reponse.trim()));
  });
};

/**
 * Vérifier si un email est valide.
 * @param {string} email
 * @returns {boolean}
 */
const emailValide = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * 3.1 RechercherEnseignant()
 * Dans le sujet, il n’y a pas de base officielle fournie.
 * Donc on récupère les infos via saisie utilisateur.
 * @param {readline.Interface} interfaceLecture
 * @returns {Promise<Array<Object>>} listeEnseignants
 */
const RechercherEnseignant = async (interfaceLecture) => {
  const nom = await poserQuestion(interfaceLecture, "Nom de l'enseignant : ");
  const prenom = await poserQuestion(interfaceLecture, "Prénom de l'enseignant : ");

  // On renvoie une liste pour rester conforme à la spec
  return [{ idEnseignant: 1, nom, prenom }];
};

/**
 * 3.2 ChoisirEnseignant(idEnseignant) : Enseignant
 * Sélectionner l’enseignant dans la liste trouvée.
 * @param {Array<Object>} listeEnseignants
 * @param {number} idEnseignant
 * @returns {Object|undefined}
 */
const ChoisirEnseignant = (listeEnseignants, idEnseignant) => {
  return listeEnseignants.find(e => e.idEnseignant === idEnseignant);
};

/**
 * 3.3 GenererFichierIdentification(Enseignant) : fichier Vcard
 * Générer le fichier vCard dans Vcard_files/.
 * @param {Object} Enseignant
 * @returns {string} cheminFichier
 */
const GenererFichierIdentification = (Enseignant) => {
  if (!fs.existsSync(DOSSIER_VCARD)) {
    fs.mkdirSync(DOSSIER_VCARD, { recursive: true });
  }

  const nomFichier = `${Enseignant.nom}_${Enseignant.prenom}.vcf`;
  const cheminFichier = path.join(DOSSIER_VCARD, nomFichier);

  const contenuVcard = [
    "BEGIN:VCARD",
    "VERSION:4.0",
    `FN:${Enseignant.prenom} ${Enseignant.nom}`,
    `N:${Enseignant.nom};${Enseignant.prenom};;;`,
    `EMAIL:${Enseignant.email}`,
    Enseignant.etablissements?.length ? `ORG:${Enseignant.etablissements.join(";")}` : null,
    Enseignant.matieres?.length ? `TITLE:${Enseignant.matieres.join(", ")}` : null,
    Enseignant.telephone ? `TEL;TYPE=cell:${Enseignant.telephone}` : null,
    "END:VCARD"
  ].filter(Boolean).join("\n");

  fs.writeFileSync(cheminFichier, contenuVcard, 'utf-8');
  return cheminFichier;
};

/**
 * Petit exécutable CLI pour tester SP3 seul (optionnel).
 */
async function executerSP3() {
  const interfaceLecture = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  try {
    console.log("\n=== SP3 : Génération vCard enseignant ===\n");

    const listeEnseignants = await RechercherEnseignant(interfaceLecture);

    console.log("\nEnseignant(s) trouvé(s) :");
    listeEnseignants.forEach(e =>
      console.log(`- [${e.idEnseignant}] ${e.prenom} ${e.nom}`)
    );

    let idTexte = await poserQuestion(interfaceLecture, "\nId de l'enseignant choisi : ");
    let idEnseignant = parseInt(idTexte, 10) || 1;

    let Enseignant = ChoisirEnseignant(listeEnseignants, idEnseignant);

    let email = await poserQuestion(interfaceLecture, "Email : ");
    while (!emailValide(email)) {
      console.log("Email invalide.");
      email = await poserQuestion(interfaceLecture, "Email : ");
    }

    const telephone = await poserQuestion(interfaceLecture, "Téléphone (optionnel) : ");
    const matieresTexte = await poserQuestion(interfaceLecture, "Matières (séparées par virgules) : ");
    const etabsTexte = await poserQuestion(interfaceLecture, "Établissements (séparés par virgules) : ");

    Enseignant = {
      ...Enseignant,
      email,
      telephone,
      matieres: matieresTexte.split(',').map(s => s.trim()).filter(Boolean),
      etablissements: etabsTexte.split(',').map(s => s.trim()).filter(Boolean),
    };

    const cheminCree = GenererFichierIdentification(Enseignant);
    console.log(`\n✅ vCard générée : ${cheminCree}\n`);
  } catch (erreur) {
    console.error("Erreur SP3 :", erreur);
  } finally {
    interfaceLecture.close();
  }
}

module.exports = {
  RechercherEnseignant,
  ChoisirEnseignant,
  GenererFichierIdentification,
  executerSP3
};
