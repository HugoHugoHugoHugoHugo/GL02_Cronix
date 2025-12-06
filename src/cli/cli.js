// src/cli/cli.js

import fs from "fs";
import path from "path";
import readline from "readline";

// Config centralisée
import { REVIEW_DIR, RESULTS_DIR, DATA_DIR } from "../config/config.js";

// Fonctions du projet
import { createCanvas } from "canvas";
import { CreerHistogramme } from "../output/CreerHistogramme.js";
import AfficherProfil from "../output/AfficherProfil.js";
import * as sp3 from "../output/GenererFichierIdentification.js";
import { profileFromFiles } from "../core/profiler.js";
import { compareProfiles, printComparison } from "../core/comparator.js";
import { simulateGiftTest } from "../core/simulateExam.js";

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
  console.log("\nHistogramme des types de questions :\n");

  const sorted = Object.entries(percentages).sort((a, b) => b[1] - a[1]);
  const maxLen = Math.max(...sorted.map(([t]) => t.length));

  const colorSeq = ["cyan", "green", "yellow", "magenta", "blue", "red"];
  let ci = 0;

  for (const [type, pct] of sorted) {
    const bar = "█".repeat(Math.round(pct));
    const pad = type.padEnd(maxLen);

    const finalBar = useColor
      ? colorize(bar, colorSeq[ci++ % colorSeq.length])
      : bar;

    console.log(`${pad} | ${finalBar} ${pct}%`);
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
  while (true) {
    console.log(`
===========================================
           MENU PRINCIPAL - GL02
===========================================
1. Générer un histogramme (SP6.2 + SP8.3)
2. Générer une vCard enseignant (SP3)
3. Profilage
4. Comparaison de profils
5. Simuler un examen (SP7)
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
      const file = await ask("Nom du fichier .gift (dans review/) : ");
      const filePath = path.join(REVIEW_DIR, file);

      const profil = CreerHistogramme(filePath);
      if (!profil) {
        console.log("Erreur : fichier introuvable.");
      } else {
        console.log("\n=== Histogramme des types de questions ===");
        console.log(profil);
        console.log("");
        AfficherProfil(profil);
      }
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
      process.exit(0);
    }
    
    // ------------------------------------------------------------------
    // 3. PROFILAGE COMPLET
    // ------------------------------------------------------------------
    
    if (choix === "3") {
      const p = await ask("Chemin du fichier : ");
      const abs = resolvePath(p);

      const profil = profileFromFiles([abs]);

      console.log("\nProfil généré :");
      console.log(profil);

      console.log("\nHistogramme des types de questions :");
      console.log(profil.percentages);

      continue;
    }

    // ------------------------------------------------------------------
    // 4. COMPARAISON DE PROFILS
    // ------------------------------------------------------------------
    
    if (choix === "4") {
      const f1 = resolvePath(await ask("Profil cible (.json) : "));
      const f2 = resolvePath(await ask("Profil référence (.json) : "));

      const diff = compareProfiles(f1, f2);
      printComparison(diff);
      continue;
    }

    // ------------------------------------------------------------------
    // 5. SIMULATEUR D’EXAMEN
    // ------------------------------------------------------------------
    if (choix === "5") {
      const file = await ask("Nom du fichier .gift (dans review/) : ");
      const filePath = path.join(REVIEW_DIR, file);

      const rapport = await simulateGiftTest(filePath);

      // État sauvegardé dans /results
      const outPath = path.join(
        RESULTS_DIR,
        `rapport_${Date.now()}.json`
      );
      fs.writeFileSync(outPath, JSON.stringify(rapport, null, 2), "utf8");

      console.log("Examen terminé. Rapport enregistré dans /results/");
      continue;
    }

    console.log("Choix invalide.");
    }
  }

// LANCEMENT
runMenu();
