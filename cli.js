// cli.js
// =======================================================
// Fonctions supportées :
// 1. Histogramme (SP6.2 + SP8.3)
// 2. Génération vCard enseignant (SP3)
// 3. Profilage (profile)
// 4. Comparaison de profils (compare)
// 5. Simulation d'examen (SP7)
// =======================================================

import fs from "fs";
import path from "path";
import readline from "readline";
import { createCanvas } from "canvas";

import { CreerHistogramme } from "./CreerHistogramme.js";
import AfficherProfil from "./AfficherProfil.js";
import { executerSP3 } from "./GenererFichierIdentification.js";

import { profileFromFiles } from "./profiler.js";
import { compareProfiles, printComparison } from "./comparator.js";
import { simulateGiftTest } from "./simulateExam.js";

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

async function main() {
  const [, , command, ...args] = process.argv;

  // MENU PRINCIPAL
  if (!command) {
    const choix = await ask(
`Choisissez une action :
1. Générer un histogramme (SP6.2 + SP8.3)
2. Générer une vCard enseignant (SP3)
3. Profilage (commande profile)
4. Comparaison de profils (commande compare)
5. Simuler un examen (SP7)
0. Quitter
Votre choix : `
    );

    if (choix === "1") {
      const exam = await ask("Chemin du fichier .gift : ");
      const profil = CreerHistogramme(exam);
      console.log("\nProfil obtenu :\n", profil);
      console.log("\nAffichage ASCII :");
      AfficherProfil(profil);
      process.exit(0);
    }

    if (choix === "2") {
      await executerSP3();
      process.exit(0);
    }

    if (choix === "3") {
      console.log("\nUtilisez : node cli.js profile <file|dir> [--ansi] [--csv file] [--png file]\n");
      process.exit(0);
    }

    if (choix === "4") {
      console.log("\nUtilisez : node cli.js compare <target.json> <baseline.json>\n");
      process.exit(0);
    }

    if (choix === "5") {
      const file = await ask("Chemin du fichier .gift à simuler : ");
      const report = await simulateGiftTest(file);

      if (!fs.existsSync("results")) fs.mkdirSync("results");

      const out = path.join("results", `result_${path.basename(file)}_${Date.now()}.json`);
      fs.writeFileSync(out, JSON.stringify(report, null, 2));

      console.log(`\nSimulation terminée. Rapport enregistré → ${out}\n`);
      process.exit(0);
    }

    console.log("Au revoir.");
    process.exit(0);
  }


  // ======================== COMMANDES DIRECTES =========================

  if (command === "profile") {
    const paths = args.filter(a => !a.startsWith("--"));
    const flags = args.filter(a => a.startsWith("--"));

    if (paths.length === 0) {
      console.error("Usage: node cli.js profile <path> [--ansi] [--csv f] [--png f]");
      process.exit(1);
    }

    const profile = profileFromFiles(paths);
    const useAnsi = flags.includes("--ansi");

    printAsciiHistogram(profile.percentages, useAnsi);

    fs.writeFileSync("profil.json", JSON.stringify(profile, null, 2));
    console.log("Profil généré → profil.json");

    const csvFlag = flags.find(f => f.startsWith("--csv"));
    if (csvFlag) exportCsv(profile, csvFlag.split("=")[1] || "profil.csv");

    const pngFlag = flags.find(f => f.startsWith("--png"));
    if (pngFlag) exportPng(profile, pngFlag.split("=")[1] || "profil.png");

    return;
  }


  if (command === "compare") {
    if (args.length < 2) {
      console.log("Usage: node cli.js compare <target.json> <baseline.json>");
      process.exit(1);
    }

    const [target, baseline] = args;
    const diff = compareProfiles(target, baseline);

    fs.writeFileSync("comparison.json", JSON.stringify(diff, null, 2));
    printComparison(diff);

    return;
  }


  if (command === "simulate") {
    if (!args[0]) {
      console.log("Usage: node cli.js simulate <file.gift>");
      process.exit(1);
    }

    const file = args[0];
    const report = await simulateGiftTest(file);

    if (!fs.existsSync("results")) fs.mkdirSync("results");
    const out = path.join("results", `result_${path.basename(file)}_${Date.now()}.json`);

    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(`\nSimulation terminée. Rapport enregistré → ${out}\n`);

    return;
  }


  console.log("Commandes disponibles :");
  console.log("  node cli.js profile <paths>");
  console.log("  node cli.js compare <target.json> <baseline.json>");
  console.log("  node cli.js simulate <file.gift>");
  console.log("  node cli.js histogram <gift>");
  console.log("  node cli.js vcard");
}

main();
