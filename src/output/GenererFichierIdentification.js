// GenererFichierIdentification.js
// SP3 : Génération d'une vCard enseignant via console

import fs from "fs";
import path from "path";
import readline from "readline";
import { VCARDS_DIR } from "../config/config.js";

function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve =>
    rl.question(question, ans => {
      rl.close();
      resolve(ans.trim());
    })
  );
}

function isValidEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return regex.test(email);
}

async function askEmail() {
  while (true) {
    const email = await ask("Email : ");
    if (isValidEmail(email)) return email;
    console.log("Email invalide. Exemple attendu : nom.prenom@domaine.com");
  }
}

export async function executerSP3() {
  console.log("\n=== SP3 : Génération vCard enseignant ===\n");

  const nom = await ask("Nom de l'enseignant : ");
  const prenom = await ask("Prénom de l'enseignant : ");

  console.log("\nEnseignant(s) trouvé(s) :");
  console.log(`- [1] ${prenom} ${nom}\n`);

  const id = await ask("Id de l'enseignant choisi : ");
  if (id !== "1") {
    console.log("Id inconnu, arrêt.");
    return;
  }

  const email = await askEmail();
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

  if (!fs.existsSync(VCARDS_DIR)) {
    fs.mkdirSync(VCARDS_DIR, { recursive: true });
  }

  const outPath = path.join(VCARDS_DIR, fileName);
  fs.writeFileSync(outPath, vcard, "utf-8");

  console.log(`\n✅ vCard générée → ${outPath}\n`);
}
