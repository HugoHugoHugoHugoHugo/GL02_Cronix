// AfficherProfil.js
// SP8.3 : Affichage console d'un profil simple

export default function AfficherProfil(profil) {
  if (!profil) {
    console.log("Profil vide.");
    return;
  }

  console.log("\n=== Profil ===");
  console.log(`QCM     : ${profil.QCM ?? 0}`);
  console.log(`QRO     : ${profil.QRO ?? 0}`);
  console.log(`V/F     : ${profil["V/F"] ?? 0}`);
  console.log(`Corresp : ${profil.Corresp ?? 0}`);
  console.log(`Num     : ${profil.Num ?? 0}`);
  console.log(`Trous   : ${profil.Trous ?? 0}`);
  console.log("");
}
