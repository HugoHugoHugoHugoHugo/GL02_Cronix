// comparator.js
import fs from "fs";

export function compareProfiles(targetFile, baselineFile) {
  const A = JSON.parse(fs.readFileSync(targetFile, "utf8"));
  const B = JSON.parse(fs.readFileSync(baselineFile, "utf8"));

  const diff = {};

  for (const type in A.counts) {
    diff[type] = {
      baseline: B.percentages[type],
      target: A.percentages[type],
      delta: +(A.percentages[type] - B.percentages[type]).toFixed(1)
    };
  }

  return diff;
}

export function printComparison(diff) {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║          COMPARAISON DE PROFILS - CIBLE vs RÉFÉRENCE          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  const colors = {
    green: "\x1b[32m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
    bold: "\x1b[1m",
    reset: "\x1b[0m"
  };

  // Filtrer et trier
  const relevantTypes = Object.entries(diff)
    .filter(([_, d]) => d.baseline > 0 || d.target > 0)
    .sort((a, b) => (b[1].baseline + b[1].target) - (a[1].baseline + a[1].target));

  if (relevantTypes.length === 0) {
    console.log("⚠️  Aucune donnée à comparer.\n");
    return;
  }

  // En tête du tableau
  console.log(`${"TYPE".padEnd(18)} ${"RÉFÉRENCE".padEnd(15)} ${"CIBLE".padEnd(15)} ${"VARIATION"}`);
  console.log("─".repeat(70));

  for (const [type, d] of relevantTypes) {
    const typeName = type.replace(/_/g, " ");
    const typeCol = colors.cyan + typeName.padEnd(18) + colors.reset;
    
    // Barres proportionnelles (10 caractères max)
    const barRef = "▓".repeat(Math.round((d.baseline / 100) * 10));
    const barTarget = "▓".repeat(Math.round((d.target / 100) * 10));
    
    const refCol = `${colors.gray}${barRef.padEnd(10)}${colors.reset} ${String(d.baseline + "%").padStart(5)}`;
    const targetCol = `${colors.gray}${barTarget.padEnd(10)}${colors.reset} ${String(d.target + "%").padStart(5)}`;
    
    // Delta avec symbole et couleur
    let deltaCol;
    if (d.delta > 0) {
      deltaCol = `${colors.green}↗ +${d.delta}%${colors.reset}`;
    } else if (d.delta < 0) {
      deltaCol = `${colors.red}↘ ${d.delta}%${colors.reset}`;
    } else {
      deltaCol = `${colors.gray}→ ${d.delta}%${colors.reset}`;
    }

    console.log(`${typeCol} ${refCol}   ${targetCol}   ${deltaCol}`);
  }

  console.log("─".repeat(70));

  // Statistiques
  const increases = relevantTypes.filter(([_, d]) => d.delta > 0);
  const decreases = relevantTypes.filter(([_, d]) => d.delta < 0);
  const unchanged = relevantTypes.filter(([_, d]) => d.delta === 0);

  console.log(`\n📊 ${colors.green}${increases.length} hausse(s)${colors.reset} • ${colors.red}${decreases.length} baisse(s)${colors.reset} • ${colors.gray}${unchanged.length} stable(s)${colors.reset}\n`);
}
