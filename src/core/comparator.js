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
  console.log("\n📊 Comparaison visuelle des deux banques\n");

  const colors = {
    green: "\x1b[32m",
    red: "\x1b[31m",
    reset: "\x1b[0m"
  };

  for (const type in diff) {
    const d = diff[type];

    const sign = d.delta > 0
      ? `${colors.green}+${d.delta}%`
      : d.delta < 0
      ? `${colors.red}${d.delta}%`
      : "0%";

    const barA = "█".repeat(Math.round(d.baseline));
    const barB = "█".repeat(Math.round(d.target));

    console.log(
      `${type.padEnd(15)}  `
      + `A: ${barA} ${d.baseline}%   `
      + `→   B: ${barB} ${d.target}%   `
      + `Δ ${sign}${colors.reset}`
    );
  }
}