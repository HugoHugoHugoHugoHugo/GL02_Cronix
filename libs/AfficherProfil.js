/**
 * 8.3 AfficherProfil(Profil : Object)
 * Profil attendu : { QCM: n, QRO: n, "V/F": n, Corresp: n, Num: n, Trous: n }
 * @param {Object} Profil
 */
const AfficherProfil = (Profil) => {
  const types = ['QCM', 'QRO', 'V/F', 'Corresp', 'Num', 'Trous'];

  console.log("\n=== Profil ===");
  types.forEach(type => {
    console.log(`${type.padEnd(8)} : ${Profil[type] || 0}`);
  });
  console.log("");
};

module.exports = AfficherProfil;
