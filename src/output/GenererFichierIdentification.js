import fs from "fs";
import path from "path";
import readline from "readline";

/**
 * Échappe les caractères spéciaux pour les valeurs de propriétés vCard (RFC 6350).
 * Les caractères , ; \ et les sauts de ligne doivent être échappés par un backslash.
 */
function escapeValue(str) {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export async function genererVCard(prefilledId = null) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  try {
    console.log("\n=== GÉNÉRATION DE VCARD ENSEIGNANT (RFC 6350) ===");

    let id;
    if (prefilledId) {
      id = prefilledId;
      console.log(`Identifiant : ${id}`);
    } else {
      const idInput = await ask("Entrez l'identifiant (email) de l'enseignant : ");
      id = idInput.trim();
    }

    // Résolution du chemin vers teachers.txt (supposé être dans auth/teachers.txt par rapport à la racine)
    // Le programme est lancé depuis src/cli, donc on remonte de deux niveaux
    const authPath = path.join(process.cwd(), "../../auth/teachers.txt");

    if (!fs.existsSync(authPath)) {
      console.error(`\n❌ Erreur : Fichier d'authentification introuvable (${authPath}).`);
      rl.close();
      return;
    }

    const authContent = fs.readFileSync(authPath, "utf-8");
    
    // Vérification de l'ID avec une regex robuste (gère les espaces et sauts de ligne)
    // Cherche une ligne commençant par "ID:" suivi de l'email exact
    const regex = new RegExp(`^ID:\\s*${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, "m");

    if (!regex.test(authContent)) {
      console.log(`\n❌ Erreur : L'ID "${id}" est inconnue dans la base.`);
      rl.close();
      return;
    }

    console.log("✅ Identifiant vérifié.");

    let nom = "";
    let prenom = "";
    let tel = "";
    let adresse = "";

    if (prefilledId) {
      const localPart = id.split("@")[0];
      const parts = localPart.split(/[._]/);
      if (parts.length >= 2) {
        prenom = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
        nom = parts[1].charAt(0).toUpperCase() + parts[1].slice(1);
      } else {
        prenom = localPart.charAt(0).toUpperCase() + localPart.slice(1);
      }
      console.log(`\nDonnées extraites : ${prenom} ${nom}`);
    } else {
      nom = await ask("Nom : ");
      prenom = await ask("Prénom : ");
      tel = await ask("Téléphone : ");
      adresse = await ask("Adresse : ");
    }

    // Construction vCard 4.0
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:4.0",
      `FN:${escapeValue(prenom)} ${escapeValue(nom)}`,
      `N:${escapeValue(nom)};${escapeValue(prenom)};;;`,
      `EMAIL;TYPE=work:${escapeValue(id)}`,
      `TEL;TYPE=cell:${escapeValue(tel)}`,
      `ADR;TYPE=work:;;${escapeValue(adresse)};;;;`,
      `ORG:Ministère de l'Éducation de Sealand`,
      `REV:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      "END:VCARD"
    ].join("\r\n");

    const vcardJson = {
      Profil: `${prenom} ${nom}`,
      Noms : { Nom: nom, Prenom: prenom },
      email: id,
      teléphone: tel,
      adresse: adresse,
      organisation: "Ministère de l'Éducation de Sealand"
    };

    console.log("\n=== APERÇU VCARD (JSON) ===");
    console.log(JSON.stringify(vcardJson, null, 2));
    console.log("===========================");

    const outputDir = path.join(process.cwd(), "../../results/vcards");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const fileName = `${prenom}_${nom}.vcf`.replace(/\s+/g, "_");
    const outputPath = path.join(outputDir, fileName);

    fs.writeFileSync(outputPath, vcard, "utf-8");
    console.log(`\n✅ vCard générée : ${outputPath}`);

  } catch (e) {
    console.error("Erreur :", e.message);
  } finally {
    rl.close();
  }
}