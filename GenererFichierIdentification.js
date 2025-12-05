// GenererFichierIdentification.js
// SP3 : Génération d'une vCard enseignant via console

import fs from "fs";
import readline from "readline";

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => rl.question(question, ans => {
    rl.close();
    resolve(ans.trim());
  }));
}

export async function executerSP3() {
  console.log("\n=== SP3 : Génération vCard enseignant ===\n");

  const nom = await ask("Nom de l'enseignant : ");
  const prenom = await ask("Prénom de l'enseignant : ");

  // Liste simple (si vous avez une base après, remplacer ici)
  console.log("\nEnseignant(s) trouvé(s) :");
  console.log(`- [1] ${prenom} ${nom}\n`);

  const id = await ask("Id de l'enseignant choisi : ");
  if (id !== "1") {
    console.log("Id inconnu, arrêt.");
    return;
  }

  const email = await ask("Email : ");
  const tel = await ask("Téléphone (optionnel) : ");
  const matieres = await ask("Matières (séparées par virgules) : ");
  const etablissements = await ask("Établissements (séparés par virgules) : ");

  const safeNom = nom.replace(/\s+/g, "_");
  const safePrenom = prenom.replace(/\s+/g, "_");
  const fileName = `vcard_${safePrenom}_${safeNom}.vcf`;

  const vcard =
`BEGIN:VCARD
VERSION:3.0
N:${nom};${prenom}
FN:${prenom} ${nom}
EMAIL:${email}
TEL:${tel}
NOTE:Matières: ${matieres} | Établissements: ${etablissements}
END:VCARD
`;

  fs.writeFileSync(fileName, vcard, "utf-8");
  console.log(`\nvCard générée → ${fileName}\n`);
}
