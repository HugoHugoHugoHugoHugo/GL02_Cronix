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
  VCARDS_DIR, 
  AUTH_DIR
} from "../config/config.js";

// Auth
import {
  initAuthFiles,
  checkTeacherId,
  checkTeacherPassword,
  checkManagerPassword,
  createTeacherAccount,
  listTeachers
} from "../auth/authManager.js";

// Fonctions du projet
import { createCanvas } from "canvas";
import { CreerHistogramme } from "../output/CreerHistogramme.js";
import * as sp3 from "../output/GenererFichierIdentification.js";
import { profileFromFiles } from "../core/profiler.js";
import { compareProfiles, printComparison } from "../core/comparator.js";
import { simulateGiftTest } from "../core/simulateExam.js";
import {Test} from "../core/Test.js";
import AfficherProfil from "../output/AfficherProfil.js";
import {displayQuestion} from "../core/displayQuestion.js"
import {AfficherQuestions} from "../core/conceptionTest.js"
import {addQuestion} from "../core/conceptionTest.js"
import {chooseQuestion} from "../core/conceptionTest.js"
import {valider} from "../core/conceptionTest.js"

// ========================= INITIALISATION =========================

// Crée les dossiers nécessaires s'ils n'existent pas

function ensureDirectories() {
  const dirs = [
    REVIEW_DIR, 
    RESULTS_DIR, 
    DATA_DIR, 
    PROFILS_DIR, 
    EXPORT_PROFILAGE_DIR,
    VCARDS_DIR,
    AUTH_DIR
  ];
  
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
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

function resolvePath(input) {
  if (!input) return null;
  
  if (path.isAbsolute(input)) {
    return input;
  }
  
  if (input === "data" || input === "data/") {
    return DATA_DIR;
  }
  
  if (input === "review" || input === "review/") {
    return REVIEW_DIR;
  }
  
  if (!input.includes("/") && !input.includes("\\") && input.endsWith(".gift")) {
    return path.join(REVIEW_DIR, input);
  }
  
  if (!input.includes("/") && !input.includes("\\") && input.endsWith(".json")) {
    const profilPath = path.join(PROFILS_DIR, input);
    if (fs.existsSync(profilPath)) {
      return profilPath;
    }
    return path.join(RESULTS_DIR, input);
  }
  
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

  let data = percentages;
  const firstValue = Object.values(percentages)[0];
  
  if (typeof firstValue === "number" && firstValue > 1) {
    const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
    data = {};
    for (const [key, val] of Object.entries(percentages)) {
      data[key] = total > 0 ? Number(((val / total) * 100).toFixed(1)) : 0;
    }
  }

  const sorted = Object.entries(data)
    .filter(([t, pct]) => pct > 0)
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
  console.log(`✅ CSV exporté → ${file}`);
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
  ctx.fillText("Histogramme des types de questions", 20, 40);

  const sorted = Object.entries(profile.percentages)
    .filter(([_, pct]) => pct > 0)
    .sort((a, b) => b[1] - a[1]);
  
  const barWidth = 60, gap = 40, startX = 80, baseY = height - 80;

  sorted.forEach(([type, pct], i) => {
    const h = pct * 3;

    ctx.fillStyle = `hsl(${(i * 60) % 360}, 60%, 65%)`;
    const x = startX + i * (barWidth + gap);
    const y = baseY - h;

    ctx.fillRect(x, y, barWidth, h);

    ctx.fillStyle = "black";
    ctx.font = "16px Arial";
    ctx.fillText(pct + "%", x + 5, y - 10);
    
    ctx.save();
    ctx.translate(x + 20, baseY + 20);
    ctx.rotate(-Math.PI / 3);
    ctx.font = "14px Arial";
    const displayName = type.replace(/_/g, " ");
    ctx.fillText(displayName, 0, 0);
    ctx.restore();
  }
);

  fs.writeFileSync(file, canvas.toBuffer("image/png"));
  console.log(`✅ PNG exporté → ${file}`);
}

// =====================================================================
//                          AUTHENTIFICATION
// =====================================================================

async function authenticate() {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║              SYSTÈME DE GESTION DE TESTS - GL02                ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  while (true) {
    console.log("Êtes-vous un :");
    console.log("  1. Étudiant");
    console.log("  2. Enseignant");
    console.log("  3. Gestionnaire\n");

    const choice = await ask("Tapez 1, 2 ou 3 : ");

    // ═══ ÉTUDIANT ═══
    if (choice === "1") {
      return { role: "student", id: null, authenticated: true };
    }

    // ═══ ENSEIGNANT ═══
    if (choice === "2") {
      while (true) {
        const id = await ask("\nIdentifiant enseignant (0 pour revenir en arrière) : ");
        
        if (id === "0") break;

        const teacherExists = checkTeacherId(id);
        
        if (!teacherExists) {
          console.log("❌ Identifiant inconnu.");
          const retry = await ask("Réessayer (1) ou revenir en arrière (2) ? ");
          if (retry === "2") break;
          continue;
        }

        const password = await ask("Mot de passe : ");
        
        if (checkTeacherPassword(id, password)) {
          console.log(`\n✅ Bienvenue ${id} !\n`);
          return { role: "teacher", id, authenticated: true };
        } else {
          console.log("❌ Mot de passe incorrect.");
          const retry = await ask("Réessayer (1) ou revenir en arrière (2) ? ");
          if (retry === "2") break;
        }
      }
    }

    // ═══ GESTIONNAIRE ═══
    if (choice === "3") {
      while (true) {
        const password = await ask("\nMot de passe gestionnaire (0 pour revenir en arrière) : ");
        
        if (password === "0") break;

        if (checkManagerPassword(password)) {
          console.log("\n✅ Bienvenue Gestionnaire !\n");
          return { role: "manager", id: null, authenticated: true };
        } else {
          console.log("❌ Mot de passe incorrect.");
          const retry = await ask("Réessayer (1) ou revenir en arrière (2) ? ");
          if (retry === "2") break;
        }
      }
    }

    console.log("\n❌ Choix invalide.\n");
  }
}

// =====================================================================
//                            MAIN CLI
// =====================================================================

async function runMenu() {
  ensureDirectories();
  initAuthFiles();

  // Authentification
  const user = await authenticate();

  while (true) {
    // ═══ MENU ÉTUDIANT ═══
    if (user.role === "student") {
      console.log(`
╔═══════════════════════════════════════╗
║        MENU ÉTUDIANT - GL02           ║
╚═══════════════════════════════════════╝
1. Simuler un examen
0. Quitter
═══════════════════════════════════════
`);
      const choix = await ask("Votre choix : ");

      if (choix === "0") {
        console.log("Au revoir !");
        process.exit(0);
      }

      // ------------------------------------------------------------------
      // ÉTUDIANT - OPTION 1 : SIMULER UN EXAMEN
      // ------------------------------------------------------------------
      if (choix === "1") {
        console.log("\n📝 SIMULATEUR D'EXAMEN\n");
        console.log("Passez un test GIFT de manière interactive.\n");
        
        let continueExam = true;
        
        while (continueExam) {
          console.log("💡 Exemples de fichiers (cherche dans review/) :");
          console.log("  - test1.gift");
          console.log("  - test_complet.gift\n");
          
          const file = await ask("Nom du fichier .gift (0 pour revenir au menu) : ");
          
          if (file === "0") {
            continueExam = false;
            continue;
          }
          
          if (!file) {
            console.log("❌ Aucun fichier spécifié.");
            continue;
          }
          
          const filePath = resolvePath(file);

          if (!fs.existsSync(filePath)) {
            console.log(`\n❌ Le fichier n'existe pas : ${filePath}`);
            const retry = await ask("Veuillez réessayer (taper 1) ou revenir au menu (taper 2) : ");
            
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

      console.log("❌ Choix invalide.");
      continue;
    }

    // ═══ MENU ENSEIGNANT ═══
    else if (user.role === "teacher") {
      console.log(`
╔═══════════════════════════════════════╗
║       MENU ENSEIGNANT - GL02          ║
╚═══════════════════════════════════════╝
Connecté en tant que : ${user.id}

1. Concevoir un test
2. Rechercher une question
3. Simuler un examen
0. Se déconnecter
═══════════════════════════════════════
`);
      const choix = await ask("Votre choix : ");

      if (choix === "0") {
        console.log("Déconnexion...");
        process.exit(0);
      }

      // ------------------------------------------------------------------
      // ENSEIGNANT - OPTION 1 : CONCEVOIR UN TEST
      // ------------------------------------------------------------------

      if (choix === "1") {
        console.log("\n📝 CONCEPTION D'UN TEST \n");

        // Initialisation
        let idUser = user.id;
        let nameTest = await ask('Nom du nouveau test : ');
        
        if (!nameTest) {
          console.log("❌ Le nom du test ne peut pas être vide.");
          await ask("\nAppuyez sur Entrée pour revenir au menu...");
          continue;
        }
        
        let testCreated = new Test([], idUser, nameTest);
        
        console.log(`\n✅ Test "${nameTest}" créé. Commençons à ajouter des questions.\n`);
        console.log("📌 Rappel : Maximum 20 questions, toutes différentes.\n");
        
        // Ajouter des questions
        let continuate = true;
        
        while (continuate) {
          let beginning = "";
          let content = "";

          console.log("─".repeat(70));
          console.log("🔍 RECHERCHE DE QUESTION\n");
          
          const result1 = await ask('Rechercher par titre ? (o/n) : ');
          if (result1.toLowerCase() === "o") {
            beginning = await ask('Début du titre : ');
          }

          const result2 = await ask('Rechercher par contenu ? (o/n) : ');
          if (result2.toLowerCase() === "o") {
            content = await ask('Mot-clé dans le contenu : ');
          }

          console.log("\n🔍 Recherche en cours...\n");
          
          let questions = AfficherQuestions(content, beginning);
          
          if (questions.length === 0 || 
              (questions.length === 1 && questions[0].length === 0)) {
            console.log("❌ Aucune question trouvée avec ces critères.");
            
            const retry = await ask("\nNouvelle recherche ? (o/n) : ");
            if (retry.toLowerCase() !== "o") {
              const quit = await ask("Terminer la création du test ? (o/n) : ");
              if (quit.toLowerCase() === "o") {
                continuate = false;
              }
            }
            continue;
          }

          // Sélection de la question
          let saisieCorrecte = false;
          let index;
          
          while (!saisieCorrecte) {
            index = await ask("\nIndice de la question à visualiser (ou 'a' pour annuler) : ");
            
            if (index.toLowerCase() === 'a') {
              break;
            }
            
            if (isNaN(index)) {
              console.log("❌ Vous devez saisir un nombre.");
            } else {
              index = Number(index);
              saisieCorrecte = true;
            }
          }
          
          if (index === 'a' || !saisieCorrecte) {
            continue;
          }

          let question = chooseQuestion(questions, index);
          
          if (question === false) {
            console.log("❌ L'indice ne correspond à aucune question.");
            continue;
          }

          // Afficher la question
          console.log("\n" + "═".repeat(70));
          displayQuestion(question);
          console.log("═".repeat(70) + "\n");

          // Demander confirmation
          const addConfirm = await ask('Ajouter cette question au test ? (o/n) : ');
          
          if (addConfirm.toLowerCase() === "o") {
            // Vérifier si la question existe déjà
            const alreadyExists = testCreated.questions.some(q => q.title === question.title);
            
            if (alreadyExists) {
              console.log("⚠️  Cette question est déjà dans le test !");
            } else if (testCreated.questions.length >= 20) {
              console.log("⚠️  Le test contient déjà 20 questions (maximum atteint) !");
            } else {
              addQuestion(testCreated, index, questions);
              console.log(`✅ Question ajoutée (${testCreated.questions.length}/20)`);
            }
          }

          // Continuer ou terminer
          console.log(`\n📊 État actuel : ${testCreated.questions.length} question(s) dans le test`);
          
          const continueChoice = await ask('\nAjouter une autre question ? (o/n) : ');
          
          if (continueChoice.toLowerCase() !== "o") {
            continuate = false;
          }
        }

        // Validation finale
        console.log("\n" + "═".repeat(70));
        console.log("📝 VALIDATION DU TEST");
        console.log("═".repeat(70) + "\n");
        console.log(`Nom du test : ${testCreated.name}`);
        console.log(`Nombre de questions : ${testCreated.questions.length}`);
        console.log("\nQuestions incluses :");
        
        testCreated.questions.forEach((q, i) => {
          console.log(`  ${i + 1}. ${q.title}`);
        });
        
        console.log("");
        
        const finalConfirm = await ask("Valider et enregistrer le test ? (o/n) : ");
        
        if (finalConfirm.toLowerCase() === "o") {
          if (valider(testCreated, 20) === true) {
            console.log("\n✅ Test créé avec succès !");
            console.log(`📁 Fichier : review/${testCreated.name}.gift`);
          } else {
            console.log("\n❌ Échec de la validation du test.");
          }
        } else {
          console.log("\n⚠️  Test annulé (non enregistré).");
        }

        await ask("\nAppuyez sur Entrée pour revenir au menu...");
        continue;
      }

      // ------------------------------------------------------------------
      // ENSEIGNANT - OPTION 2 : RECHERCHER UNE QUESTION
      // ------------------------------------------------------------------

      if (choix === "2") {
        console.log("\n🔍 RECHERCHE DE QUESTION (SPEC_2)\n");
        
        let continueSearch = true;
        
        while (continueSearch) {
          let beginning = "";
          let content = "";

          console.log("Critères de recherche :\n");
          
          const result1 = await ask('Rechercher par titre ? (o/n) : ');
          if (result1.toLowerCase() === "o") {
            beginning = await ask('Début du titre : ');
          }

          const result2 = await ask('Rechercher par contenu ? (o/n) : ');
          if (result2.toLowerCase() === "o") {
            content = await ask('Mot-clé dans le contenu : ');
          }

          console.log("\n🔍 Recherche en cours...\n");
          
          let questions = AfficherQuestions(content, beginning);
          
          if (questions.length === 0 || 
              (questions.length === 1 && questions[0].length === 0)) {
            console.log("❌ Aucune question trouvée avec ces critères.");
          } else {
            // Demander quelle question visualiser
            const viewIndex = await ask("\nIndice de la question à visualiser (ou 'r' pour retour) : ");
            
            if (viewIndex.toLowerCase() !== 'r') {
              const index = Number(viewIndex);
              
              if (!isNaN(index)) {
                const question = chooseQuestion(questions, index);
                
                if (question !== false) {
                  console.log("\n" + "═".repeat(70));
                  displayQuestion(question);
                  console.log("═".repeat(70) + "\n");
                } else {
                  console.log("❌ Indice invalide.");
                }
              } else {
                console.log("❌ Veuillez entrer un nombre.");
              }
            }
          }
          
          const newSearch = await ask("\nNouvelle recherche ? (o/n) : ");
          if (newSearch.toLowerCase() !== "o") {
            continueSearch = false;
          }
        }
        
        await ask("\nAppuyez sur Entrée pour revenir au menu...");
        continue;
      }

      // ------------------------------------------------------------------
      // ENSEIGNANT - OPTION 3 : SIMULER UN EXAMEN
      // ------------------------------------------------------------------
      if (choix === "3") {
        console.log("\n📝 SIMULATEUR D'EXAMEN (Test avant distribution)\n");
        
        let continueExam = true;
        
        while (continueExam) {
          console.log("💡 Exemples de fichiers :");
          console.log("  - test1.gift (cherche dans review/)");
          
          const file = await ask("Nom du fichier .gift (0 pour revenir au menu) : ");
          
          if (file === "0") {
            continueExam = false;
            continue;
          }
          
          if (!file) {
            console.log("❌ Aucun fichier spécifié.");
            continue;
          }
          
          const filePath = resolvePath(file);

          if (!fs.existsSync(filePath)) {
            console.log(`\n❌ Le fichier n'existe pas : ${filePath}`);
            const retry = await ask("Veuillez réessayer (taper 1) ou revenir au menu (taper 2) : ");
            
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
            const studentName = rapport.studentId || user.id || "enseignant";
            const baseName = path.basename(filePath, ".gift");
            const fileName = `exam_${baseName}_${studentName}_${timestamp}.json`;
            const outPath = path.join(RESULTS_DIR, fileName);
            
            fs.writeFileSync(outPath, JSON.stringify(rapport, null, 2), "utf8");

            console.log("╔════════════════════════════════════════════════════════════════╗");
            console.log("║                    TEST TERMINÉ                                ║");
            console.log("╚════════════════════════════════════════════════════════════════╝\n");
            console.log(`📄 Rapport enregistré : ${fileName}\n`);
            
            // Statistiques (visibles pour l'enseignant)
            console.log("─".repeat(70));
            console.log("📊 RÉSULTATS DE LA SIMULATION :\n");
            console.log(`   Testeur            : ${rapport.studentId}`);
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

      console.log("❌ Choix invalide.");
      continue;
    }
  


    // ═══ MENU GESTIONNAIRE ═══
    else if (user.role === "manager") {
      console.log(`
╔═══════════════════════════════════════╗
║      MENU GESTIONNAIRE - GL02         ║
╚═══════════════════════════════════════╝
1. Générer un histogramme
2. Générer une vCard enseignant
3. Profilage d'une banque
4. Comparaison de profils
5. Simuler un examen
6. Créer un compte enseignant
0. Se déconnecter
═══════════════════════════════════════
`);
      const choix = await ask("Votre choix : ");

      if (choix === "0") {
        console.log("Déconnexion...");
        process.exit(0);
      }

      // ------------------------------------------------------------------
      // GESTIONNAIRE - OPTION 1 : HISTOGRAMME
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
          
          const file = await ask("Nom du fichier .gift (0 pour revenir au menu) : ");
          
          if (file === "0") {
            continueHisto = false;
            continue;
          }
          
          if (!file) {
            console.log("❌ Aucun fichier spécifié.");
            const retry = await ask("Réessayer (1) ou revenir au menu (2) : ");
            if (retry === "2") {
              continueHisto = false;
            }
            continue;
          }
          
          console.log(file.endsWith(".gift"));

          const filePath = resolvePath(file);

          console.log('Trigger1');

          if (!fs.existsSync(filePath)) {
            console.log(`\n❌ Le fichier n'existe pas : ${filePath}`);
            const retry = await ask("Veuillez réessayer (taper 1) ou revenir au menu (taper 2) : ");
            
            if (retry === "2") {
              continueHisto = false;
              continue;
            } else {
              continue;
            }
          }

          console.log(`✅ Analyse de : ${filePath}\n`);

          try {
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

            console.log("📊 HISTOGRAMME DES TYPES DE QUESTIONS\n");
            AfficherProfil(profil);

            let percentages = profil;
            if (profil.QCM !== undefined) {
              const total = Object.values(profil).reduce((sum, val) => sum + val, 0);
              percentages = {};
              for (const [key, val] of Object.entries(profil)) {
                percentages[key] = total > 0 ? Number(((val / total) * 100).toFixed(1)) : 0;
              }
            }

            printAsciiHistogram(percentages, true);

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
              
              const profilForExport = {
                total_questions: Object.values(profil).reduce((sum, val) => sum + val, 0),
                counts: profil,
                percentages: percentages,
                generated_at: new Date().toISOString()
              };
              
              if (exportChoice === "1" || exportChoice === "3") {
                const pngPath = path.join(EXPORT_PROFILAGE_DIR, `${name}.png`);
                exportPng(profilForExport, pngPath);
              }
              
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
      // GESTIONNAIRE - OPTION 2 : vCard
      // ------------------------------------------------------------------
      if (choix === "2") {
        console.log("\n=== GÉNÉRATION vCard ENSEIGNANT ===\n");
        if (typeof sp3 === "function") {
          await sp3();
        } else if (sp3 && typeof sp3.executerSP3 === "function") {
          await sp3.executerSP3();
        } else {
          console.log("SP3 non disponible.");
        }
        await ask("\nAppuyez sur Entrée pour revenir au menu...");
        continue;
      }

      // ------------------------------------------------------------------
      // GESTIONNAIRE - OPTION 3 : PROFILAGE
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

          console.log("📁 OPTIONS D'EXPORT :");
          console.log("  1. Sauvegarder uniquement le profil JSON");
          console.log("  2. Exporter uniquement CSV et PNG");
          console.log("  3. Tout exporter (JSON + CSV + PNG)");
          console.log("  4. Ne rien exporter\n");
          
          const exportChoice = await ask("Votre choix : ");
          
          if (exportChoice !== "4") {
            const folderName = path.basename(targetDir);
            const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const defaultName = `profil_${folderName}_${timestamp}`;
            
            const nameInput = await ask(`Nom de base pour les fichiers [${defaultName}] : `);
            const name = nameInput || defaultName;
            
            console.log("");
            
            if (exportChoice === "1" || exportChoice === "3") {
              const jsonPath = path.join(PROFILS_DIR, `${name}.json`);
              fs.writeFileSync(jsonPath, JSON.stringify(profil, null, 2));
              console.log(`✅ Profil JSON → ${jsonPath}`);
            }
            
            if (exportChoice === "2" || exportChoice === "3") {
              const csvPath = path.join(EXPORT_PROFILAGE_DIR, `${name}.csv`);
              exportCsv(profil, csvPath);
            }
            
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
      // GESTIONNAIRE - OPTION 4 : COMPARAISON
      // ------------------------------------------------------------------
      if (choix === "4") {
        let continueCompare = true;
        
        while (continueCompare) {
          console.log("\n📊 COMPARAISON DE PROFILS\n");
          console.log("💡 Exemples de chemins valides :");
          console.log("  - profil1.json, profil2.json (cherche dans profils/)");
          console.log("  - profils/profil1.json");
          console.log("  - /chemin/absolu/vers/profil.json\n");
          
          const p1 = await ask("Profil cible (.json) (0 pour revenir au menu) : ");
          
          if (p1 === "0") {
            continueCompare = false;
            continue;
          }
          
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
        
        await ask("\nAppuyez sur Entrée pour revenir au menu...");
        continue;
      }

      // ------------------------------------------------------------------
      // GESTIONNAIRE - OPTION 5 : SIMULER EXAMEN
      // ------------------------------------------------------------------
      if (choix === "5") {
        console.log("\n📝 SIMULATEUR D'EXAMEN\n");
        
        let continueExam = true;
        
        while (continueExam) {
          console.log("💡 Exemples de fichiers :");
          console.log("  - test1.gift (cherche dans review/)");
          
          const file = await ask("Nom du fichier .gift (0 pour revenir au menu) : ");
          
          if (file === "0") {
            continueExam = false;
            continue;
          }
          
          if (!file) {
            console.log("❌ Aucun fichier spécifié.");
            continue;
          }
          
          const filePath = resolvePath(file);

          if (!fs.existsSync(filePath)) {
            console.log(`\n❌ Le fichier n'existe pas : ${filePath}`);
            const retry = await ask("Veuillez réessayer (taper 1) ou revenir au menu (taper 2) : ");
            
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

            const timestamp = Date.now();
            const studentName = rapport.studentId || "gestionnaire";
            const baseName = path.basename(filePath, ".gift");
            const fileName = `exam_${baseName}_${studentName}_${timestamp}.json`;
            const outPath = path.join(RESULTS_DIR, fileName);
            
            fs.writeFileSync(outPath, JSON.stringify(rapport, null, 2), "utf8");

            console.log("╔════════════════════════════════════════════════════════════════╗");
            console.log("║                    TEST TERMINÉ                                ║");
            console.log("╚════════════════════════════════════════════════════════════════╝\n");
            console.log(`📄 Rapport enregistré : ${fileName}\n`);
            
            console.log("─".repeat(70));
            console.log("📊 RÉSULTATS DE LA SIMULATION :\n");
            console.log(`   Testeur            : ${rapport.studentId}`);
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

      // ------------------------------------------------------------------
      // GESTIONNAIRE - OPTION 6 : CRÉER COMPTE ENSEIGNANT
      // ------------------------------------------------------------------
      if (choix === "6") {
        console.log("\n📝 CRÉATION D'UN COMPTE ENSEIGNANT\n");
                    
        const newId = await ask("Nouvel identifiant (email) (0 pour annuler) : ");
                    
        if (newId === "0") {
            continue;
        }
                    
        const newPassword = await ask("Mot de passe : ");
                    
        if (createTeacherAccount(newId, newPassword)) {
          console.log(`\n✅ Compte créé avec succès pour ${newId}`);
        } else {
          console.log(`\n❌ Un compte existe déjà pour ${newId}`);
          console.log("Pour des raisons de sécurité, la création est refusée.");
        }
                    
        await ask("\nAppuyez sur Entrée pour revenir au menu...");
        continue;
        }

        console.log("❌ Choix invalide.");
        continue;
                }
    
}
}               

// LANCEMENT
runMenu();
