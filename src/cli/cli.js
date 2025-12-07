// src/cli/cli.js

import fs from "fs";
import path from "path";
import readline from "readline";

// Config centralisée
import { 
  PROJECT_ROOT,
  REVIEW_DIR,
  RESULTS_DIR,
  DATA_DIR,
  PROFILS_DIR,
  EXPORT_PROFILAGE_DIR,
  VCARDS_DIR
} from "../config/config.js";

// Fonctions du projet
import { createCanvas } from "canvas";
import { CreerHistogramme } from "../output/CreerHistogramme.js";
import AfficherProfil from "../output/AfficherProfil.js";
import * as sp3 from "../output/GenererFichierIdentification.js";
import { profileFromFiles } from "../core/profiler.js";
import { compareProfiles, printComparison } from "../core/comparator.js";
import { simulateGiftTest } from "../core/simulateExam.js";

// ========================= INITIALISATION =========================

/**
 * Crée les dossiers nécessaires s'ils n'existent pas
 */

function ensureDirectories() {
  const dirs = [
    REVIEW_DIR, 
    RESULTS_DIR, 
    DATA_DIR, 
    PROFILS_DIR, 
    EXPORT_PROFILAGE_DIR,
    VCARDS_DIR
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`📁 Dossier créé : ${dir}`);
    }
  }
}

// Utilitaire question CLI
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

/**
 * Résout un chemin de fichier de manière "intelligente"
 */

/**
 * Résout un chemin de fichier de manière intelligente
 */
function resolvePath(input) {
  if (!input) return null;
  
  // Si chemin absolu
  if (path.isAbsolute(input)) {
    return input;
  }
  
  // Si c'est juste "data" ou "data/" → dossier DATA_DIR
  if (input === "data" || input === "data/") {
    return DATA_DIR;
  }
  
  // Si c'est juste "review" ou "review/" → dossier REVIEW_DIR
  if (input === "review" || input === "review/") {
    return REVIEW_DIR;
  }
  
  // Si juste un nom de fichier .gift → dans review/
  if (!input.includes("/") && !input.includes("\\") && input.endsWith(".gift")) {
    return path.join(REVIEW_DIR, input);
  }
  
  // Si juste un nom de fichier .json → cherche d'abord dans profils/, puis results/
  if (!input.includes("/") && !input.includes("\\") && input.endsWith(".json")) {
    const profilPath = path.join(PROFILS_DIR, input);
    if (fs.existsSync(profilPath)) {
      return profilPath;
    }
    return path.join(RESULTS_DIR, input);
  }
  
  // Sinon, relatif au PROJECT_ROOT
  return path.join(PROJECT_ROOT, input);
}

// ========================= COLORS =========================

const COLORS = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

function colorize(text, color) {
  return COLORS[color] + text + COLORS.reset;
}


// ========================= HISTOGRAMME ASCII =========================

function printAsciiHistogram(percentages, useColor = false) {
  console.log("\n📊 HISTOGRAMME DES TYPES DE QUESTIONS\n");

  // Si c'est un objet avec des valeurs mais pas des pourcentages,
  // calculer les pourcentages
  let data = percentages;
  const firstValue = Object.values(percentages)[0];
  
  // Si les valeurs sont des nombres entiers (counts), convertir en pourcentages
  if (typeof firstValue === "number" && firstValue > 1) {
    const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
    data = {};
    for (const [key, val] of Object.entries(percentages)) {
      data[key] = total > 0 ? Number(((val / total) * 100).toFixed(1)) : 0;
    }
  }

  const sorted = Object.entries(data)
    .filter(([t, pct]) => pct > 0) // Ne montrer que les types présents
    .sort((a, b) => b[1] - a[1]);
  
  if (sorted.length === 0) {
    console.log("   Aucune question trouvée.\n");
    return;
  }
  
  const maxLen = Math.max(...sorted.map(([t]) => t.length));
  const colorSeq = ["cyan", "green", "yellow", "magenta", "blue", "red"];
  let ci = 0;

  for (const [type, pct] of sorted) {
    const bar = "█".repeat(Math.round(pct));
    const typeName = type.replace(/_/g, " ");
    const pad = typeName.padEnd(maxLen);

    const finalBar = useColor
      ? colorize(bar, colorSeq[ci++ % colorSeq.length])
      : bar;

    console.log(`   ${pad} │ ${finalBar} ${pct}%`);
  }

  console.log("");
}


// ========================= EXPORT CSV =========================

function exportCsv(profile, file) {
  const rows = ["type,count,percentage"];

  for (const t in profile.counts) {
    rows.push(`${t},${profile.counts[t]},${profile.percentages[t]}`);
  }

  fs.writeFileSync(file, rows.join("\n"));
  console.log(`CSV exporté → ${file}`);
}


// ========================= EXPORT PNG =========================

function exportPng(profile, file) {
  const width = 900, height = 500;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "black";
  ctx.font = "26px Arial";
  ctx.fillText("Profil des questions", 20, 40);

  const sorted = Object.entries(profile.percentages).sort((a, b) => b[1] - a[1]);
  const barWidth = 60, gap = 40, startX = 80, baseY = height - 80;

  sorted.forEach(([type, pct], i) => {
    const h = pct * 3;

    ctx.fillStyle = `hsl(${(i * 60) % 360}, 60%, 65%)`;
    const x = startX + i * (barWidth + gap);
    const y = baseY - h;

    ctx.fillRect(x, y, barWidth, h);

    ctx.fillStyle = "black";
    ctx.fillText(pct + "%", x + 5, y - 10);
    ctx.save();
    ctx.translate(x + 20, baseY + 20);
    ctx.rotate(-Math.PI / 3);
    ctx.fillText(type, 0, 0);
    ctx.restore();
  });

  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  console.log(`PNG exporté → ${file}`);
}



// =====================================================================
//                            MAIN CLI
// =====================================================================

async function runMenu() {
  // Créer les dossiers au démarrage s'ils n'existent pas déjà
  ensureDirectories();
  
  while (true) {
    console.log(`
===========================================
           MENU PRINCIPAL - GL02
===========================================
1. Générer un histogramme
2. Générer une vCard enseignant
3. Profilage d'une banque de questions
4. Comparaison de profils
5. Simuler un examen
0. Quitter
===========================================
`);
    const choix = await ask("Votre choix : ");

    // QUITTER
    if (choix === "0") {
      console.log("Au revoir !");
      process.exit(0);
    }

// ------------------------------------------------------------------
// 1. HISTOGRAMME
// ------------------------------------------------------------------

  if (choix === "1") {
    console.log("\n📊 GÉNÉRATION D'HISTOGRAMME\n");
    console.log("Cette fonctionnalité analyse un fichier .gift et génère un histogramme");
    console.log("des types de questions avec export PNG et CSV.\n");
    
    let continueHisto = true;
    
    while (continueHisto) {
      console.log("💡 Exemples de fichiers :");
      console.log("  - test1.gift (cherche dans review/)");
      console.log("  - review/test1.gift\n");
      
      const file = await ask("Nom du fichier .gift : ");
      
      if (!file) {
        console.log("❌ Aucun fichier spécifié.");
        const retry = await ask("Réessayer (taper 1) ou revenir au menu (taper 2) : ");
        if (retry === "2") {
          continueHisto = false;
        }
        continue;
      }
      
      const filePath = resolvePath(file);

      if (!fs.existsSync(filePath)) {
        console.log(`\n❌ Le fichier n'existe pas : ${filePath}`);
        const retry = await ask("Veuillez réessayer (taper 1) ou revenir au menu principal (taper 2) : ");
        
        if (retry === "2") {
          continueHisto = false;
          continue;
        } else {
          continue;
        }
      }

      console.log(`✅ Analyse de : ${filePath}\n`);

      try {
        // Générer le profil
        const profil = CreerHistogramme(filePath);
        
        if (!profil) {
          console.log("❌ Erreur : impossible de générer le profil.");
          continue;
        }

        console.log("\n═══════════════════════════════════════════════════════");
        console.log("                    PROFIL GÉNÉRÉ");
        console.log("═══════════════════════════════════════════════════════");
        console.log(JSON.stringify(profil, null, 2));
        console.log("═══════════════════════════════════════════════════════\n");

        // Afficher l'histogramme ASCII
        console.log("📊 HISTOGRAMME DES TYPES DE QUESTIONS\n");
        AfficherProfil(profil);

        // Calculer les pourcentages si pas déjà fait
        let percentages = profil;
        if (profil.QCM !== undefined) {
          // Format ancien (QCM, QRO, etc.)
          const total = Object.values(profil).reduce((sum, val) => sum + val, 0);
          percentages = {};
          for (const [key, val] of Object.entries(profil)) {
            percentages[key] = total > 0 ? Number(((val / total) * 100).toFixed(1)) : 0;
          }
        }

        // Afficher histogramme coloré
        printAsciiHistogram(percentages, true);

        // Proposer les exports
        console.log("\n📁 OPTIONS D'EXPORT :");
        console.log("  1. Exporter en PNG");
        console.log("  2. Exporter en CSV");
        console.log("  3. Exporter PNG + CSV");
        console.log("  4. Ne rien exporter\n");
        
        const exportChoice = await ask("Votre choix : ");
        
        if (exportChoice !== "4") {
          const baseName = path.basename(filePath, ".gift");
          const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
          const defaultName = `histo_${baseName}_${timestamp}`;
          
          const nameInput = await ask(`Nom de base pour les fichiers [${defaultName}] : `);
          const name = nameInput || defaultName;
          
          console.log("");
          
          // Convertir le profil au format attendu par les fonctions d'export
          const profilForExport = {
            total_questions: Object.values(profil).reduce((sum, val) => sum + val, 0),
            counts: profil,
            percentages: percentages,
            generated_at: new Date().toISOString()
          };
          
          // PNG
          if (exportChoice === "1" || exportChoice === "3") {
            const pngPath = path.join(EXPORT_PROFILAGE_DIR, `${name}.png`);
            exportPng(profilForExport, pngPath);
          }
          
          // CSV
          if (exportChoice === "2" || exportChoice === "3") {
            const csvPath = path.join(EXPORT_PROFILAGE_DIR, `${name}.csv`);
            exportCsv(profilForExport, csvPath);
          }
          
          console.log("\n✨ Export terminé !");
        }
        
        continueHisto = false;
        
      } catch (error) {
        console.error(`\n❌ Erreur lors de l'analyse : ${error.message}`);
        console.error(error.stack);
        
        const retry = await ask("\nRéessayer avec un autre fichier ? (o/n) : ");
        if (retry.toLowerCase() !== "o") {
          continueHisto = false;
        }
      }
    }
    
    await ask("\nAppuyez sur Entrée pour revenir au menu...");
    continue;
  }

    // ------------------------------------------------------------------
    // 2. vCard enseignant
    // ------------------------------------------------------------------

    if (choix === "2") {
      console.log("\nGénération vCard enseignant (SP3) ...");
      if (typeof sp3 === "function") {
        await sp3();
      } else if (sp3 && typeof sp3.executerSP3 === "function") {
        await sp3.executerSP3();
      } else {
        console.log("SP3 non disponible.");
      }
           
      continue;
    }
// ------------------------------------------------------------------
// 3. PROFILAGE COMPLET
// ------------------------------------------------------------------

  if (choix === "3") {
    console.log("\n📊 PROFILAGE D'UNE BANQUE DE QUESTIONS\n");
    console.log("Cette fonctionnalité analyse tous les fichiers .gift d'un dossier");
    console.log("et génère un profil statistique complet de la banque.\n");
    
    console.log("💡 Options disponibles :");
    console.log("  1. Profiler le dossier data/ (par défaut)");
    console.log("  2. Profiler un autre dossier");
    console.log("  0. Retour au menu\n");
    
    const profilChoice = await ask("Votre choix : ");
    
    if (profilChoice === "0") {
      continue;
    }
    
    let targetDir;
    
    if (profilChoice === "1" || profilChoice === "") {
      targetDir = DATA_DIR;
      console.log(`\n✅ Profilage du dossier : ${targetDir}`);
    } else if (profilChoice === "2") {
      console.log("\n💡 Exemples de chemins valides :");
      console.log("  - data/");
      console.log("  - review/");
      console.log("  - /chemin/absolu/vers/dossier/\n");
      
      const customPath = await ask("Chemin du dossier : ");
      targetDir = resolvePath(customPath);
    } else {
      console.log("❌ Choix invalide.");
      continue;
    }
    
    if (!fs.existsSync(targetDir)) {
      console.log(`\n❌ Le dossier n'existe pas : ${targetDir}`);
      await ask("Appuyez sur Entrée pour revenir au menu...");
      continue;
    }
    
    const stat = fs.statSync(targetDir);
    if (!stat.isDirectory()) {
      console.log(`\n❌ Le chemin spécifié n'est pas un dossier : ${targetDir}`);
      await ask("Appuyez sur Entrée pour revenir au menu...");
      continue;
    }
    
    const giftFiles = fs.readdirSync(targetDir).filter(f => f.endsWith(".gift"));
    
    if (giftFiles.length === 0) {
      console.log(`\n⚠️  Aucun fichier .gift trouvé dans : ${targetDir}`);
      await ask("Appuyez sur Entrée pour revenir au menu...");
      continue;
    }
    
    console.log(`\n📁 ${giftFiles.length} fichier(s) .gift trouvé(s) :`);
    giftFiles.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
    console.log("");
    
    const confirm = await ask("Lancer l'analyse ? (o/n) : ");
    if (confirm.toLowerCase() !== "o") {
      continue;
    }
    
    console.log("\n🔍 Analyse en cours...\n");
    
    try {
      const profil = profileFromFiles([targetDir]);
      
      console.log("✅ Analyse terminée !\n");
      console.log("═══════════════════════════════════════════════════════");
      console.log("                    PROFIL GÉNÉRÉ");
      console.log("═══════════════════════════════════════════════════════");
      console.log(JSON.stringify(profil, null, 2));
      console.log("═══════════════════════════════════════════════════════\n");

      if (profil.percentages) {
        printAsciiHistogram(profil.percentages, true);
      }
      
      console.log("\n📈 RÉSUMÉ");
      console.log("─────────────────────────────────────────────────────");
      console.log(`Total de questions analysées : ${profil.total_questions}`);
      console.log(`Date de génération : ${new Date(profil.generated_at).toLocaleString('fr-FR')}`);
      console.log("─────────────────────────────────────────────────────\n");

      // OPTIONS D'EXPORT SIMPLIFIÉES
      console.log("📁 OPTIONS D'EXPORT :");
      console.log("  1. Sauvegarder uniquement le profil JSON");
      console.log("  2. Exporter uniquement CSV et PNG");
      console.log("  3. Tout exporter (JSON + CSV + PNG)");
      console.log("  4. Ne rien exporter\n");
      
      const exportChoice = await ask("Votre choix : ");
      
      if (exportChoice !== "4") {
        // Nom par défaut basé sur le dossier et la date
        const folderName = path.basename(targetDir);
        const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const defaultName = `profil_${folderName}_${timestamp}`;
        
        const nameInput = await ask(`Nom de base pour les fichiers [${defaultName}] : `);
        const name = nameInput || defaultName;
        
        console.log("");
        
        // PROFIL JSON → profils/ (automatique)
        if (exportChoice === "1" || exportChoice === "3") {
          const jsonPath = path.join(PROFILS_DIR, `${name}.json`);
          fs.writeFileSync(jsonPath, JSON.stringify(profil, null, 2));
          console.log(`✅ Profil JSON → ${jsonPath}`);
        }
        
        // CSV → exports_profilage_png_csv/ (automatique)
        if (exportChoice === "2" || exportChoice === "3") {
          const csvPath = path.join(EXPORT_PROFILAGE_DIR, `${name}.csv`);
          exportCsv(profil, csvPath);
        }
        
        // PNG → exports_profilage_png_csv/ (automatique)
        if (exportChoice === "2" || exportChoice === "3") {
          const pngPath = path.join(EXPORT_PROFILAGE_DIR, `${name}.png`);
          exportPng(profil, pngPath);
        }
        
        console.log("\n✨ Export terminé !");
      }
      
    } catch (error) {
      console.error(`\n❌ Erreur lors de l'analyse : ${error.message}`);
      console.error(error.stack);
    }
    
    await ask("\nAppuyez sur Entrée pour revenir au menu...");
    continue;
  }

// ------------------------------------------------------------------
// 4. COMPARAISON DE PROFILS
// ------------------------------------------------------------------

  if (choix === "4") {
    let continueCompare = true;
    
    while (continueCompare) {
      console.log("\n💡 Exemples de chemins valides :");
      console.log("  - profil1.json (cherche dans profils/)");
      console.log("  - profils/profil1.json");
      console.log("  - /chemin/absolu/vers/profil.json\n");
      
      const p1 = await ask("Profil cible (.json) : ");
      const f1 = resolvePath(p1);

      if (!fs.existsSync(f1)) {
        console.log(`\n❌ Le fichier rentré n'existe pas dans le dossier profils.`);
        const retry = await ask("Veuillez réessayer (taper 1) ou revenir au menu principal (taper 2) : ");
        
        if (retry === "2") {
          continueCompare = false;
          continue;
        } else {
          continue;
        }
      }
      
      const p2 = await ask("Profil référence (.json) : ");
      const f2 = resolvePath(p2);

      if (!fs.existsSync(f2)) {
        console.log(`\n❌ Le fichier rentré n'existe pas dans le dossier profils.`);
        const retry = await ask("Veuillez réessayer (taper 1) ou revenir au menu principal (taper 2) : ");
        
        if (retry === "2") {
          continueCompare = false;
          continue;
        } else {
          continue;
        }
      }

      console.log(`\n✅ Comparaison de :`);
      console.log(`   Cible      : ${f1}`);
      console.log(`   Référence  : ${f2}\n`);

      try {
        const diff = compareProfiles(f1, f2);
        printComparison(diff);
        continueCompare = false;
      } catch (error) {
        console.error(`❌ Erreur lors de la comparaison : ${error.message}`);
        const retry = await ask("Réessayer ? (o/n) : ");
        if (retry.toLowerCase() !== "o") {
          continueCompare = false;
        }
      }
    }
    
    continue;
  }

// ------------------------------------------------------------------
// 5. SIMULATEUR D'EXAMEN
// ------------------------------------------------------------------
  if (choix === "5") {
    console.log("\n📝 SIMULATEUR D'EXAMEN\n");
    console.log("Cette fonctionnalité permet de passer un test GIFT de manière interactive.");
    console.log("Le rapport avec le score sera sauvegardé mais ne sera pas affiché à l'étudiant.\n");
    
    let continueExam = true;
    
    while (continueExam) {
      console.log("💡 Exemples de fichiers :");
      console.log("  - test1.gift (cherche dans review/)");
      console.log("  - test2.gift\n");
      
      const file = await ask("Nom du fichier .gift : ");
      
      if (!file) {
        console.log("❌ Aucun fichier spécifié.");
        continue;
      }
      
      const filePath = resolvePath(file);

      if (!fs.existsSync(filePath)) {
        console.log(`\n❌ Le fichier n'existe pas : ${filePath}`);
        const retry = await ask("Veuillez réessayer (taper 1) ou revenir au menu principal (taper 2) : ");
        
        if (retry === "2") {
          continueExam = false;
          continue;
        } else {
          continue;
        }
      }

      try {
        const rapport = await simulateGiftTest(filePath);

        if (!rapport) {
          console.log("❌ Impossible de générer le rapport.");
          continue;
        }

        // Sauvegarder le rapport dans /results
        const timestamp = Date.now();
        const studentName = rapport.studentId || "anonyme";
        const baseName = path.basename(filePath, ".gift");
        const fileName = `exam_${baseName}_${studentName}_${timestamp}.json`;
        const outPath = path.join(RESULTS_DIR, fileName);
        
        fs.writeFileSync(outPath, JSON.stringify(rapport, null, 2), "utf8");

        console.log("╔════════════════════════════════════════════════════════════════╗");
        console.log("║              MERCI D'AVOIR PARTICIPÉ AU TEST !                 ║");
        console.log("╚════════════════════════════════════════════════════════════════╝\n");
        console.log(`📄 Votre examen a été enregistré.`);
        console.log(`📁 Fichier : ${fileName}\n`);
        
        // Statistiques (visibles uniquement dans le CLI pour l'enseignant)
        console.log("─".repeat(70));
        console.log("📊 STATISTIQUES (réservées à l'enseignant) :\n");
        console.log(`   Étudiant           : ${rapport.studentId}`);
        console.log(`   Fichier            : ${rapport.file}`);
        console.log(`   Date               : ${new Date(rapport.timestamp).toLocaleString('fr-FR')}`);
        console.log(`   Questions totales  : ${rapport.totalQuestions}`);
        console.log(`   Réponses correctes : ${rapport.correctCount}/${rapport.totalQuestions}`);
        console.log(`   Score              : ${rapport.percent}%`);
        console.log("─".repeat(70) + "\n");
        
        continueExam = false;
        
      } catch (error) {
        console.error(`\n❌ Erreur lors de la simulation : ${error.message}`);
        console.error(error.stack);
        
        const retry = await ask("\nRéessayer avec un autre fichier ? (o/n) : ");
        if (retry.toLowerCase() !== "o") {
          continueExam = false;
        }
      }
    }
    
    await ask("\nAppuyez sur Entrée pour revenir au menu...");
    continue;
  }
}
}
// LANCEMENT
runMenu();

