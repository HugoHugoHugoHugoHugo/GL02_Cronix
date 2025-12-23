// src/auth/authManager.js
import fs from "fs";
import path from "path";
import { AUTH_DIR } from "../config/config.js";

import bcrypt from 'bcrypt';

const TEACHERS_FILE = path.join(AUTH_DIR, "teachers.txt");
const MANAGER_FILE = path.join(AUTH_DIR, "manager.txt");

//Initialise les fichiers d'authentification s'ils n'existent pas déjà (au cas où)

export function initAuthFiles() {
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Créer fichier enseignants par défaut
  if (!fs.existsSync(TEACHERS_FILE)) {

    const salt = bcrypt.genSaltSync(10);
    const hash1 = bcrypt.hashSync("password123", salt);
    const hash2 = bcrypt.hashSync("secure456", salt);


    const defaultTeachers = `ID:prof1@utt.fr
mdp:${hash1}

ID:prof2@utt.fr
mdp:${hash2}
`;
    fs.writeFileSync(TEACHERS_FILE, defaultTeachers, "utf8");
    console.log(`📁 Fichier créé : ${TEACHERS_FILE}`);
  }

  // Créer fichier gestionnaire par défaut
  if (!fs.existsSync(MANAGER_FILE)) {

    const salt = bcrypt.genSaltSync(10);
    const hash3 = bcrypt.hashSync("0102", salt);


    const defaultManager = `mdp:${hash3}\n`;
    fs.writeFileSync(MANAGER_FILE, defaultManager, "utf8");
    console.log(`📁 Fichier créé : ${MANAGER_FILE}`);
  }
}

//Vérifie si un identifiant enseignant existe

export function checkTeacherId(id) {
  if (!fs.existsSync(TEACHERS_FILE)) {
    return null;
  }

  const content = fs.readFileSync(TEACHERS_FILE, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith("ID:")) {
      const teacherId = line.substring(3).trim();
      if (teacherId === id) {
        return { lineNumber: i, id: teacherId };
      }
    }
  }

  return null;
}

//Vérifie le mot de passe d'un enseignant

export async function checkTeacherPassword(id, password) {
  const teacherInfo = checkTeacherId(id);
  
  if (!teacherInfo) {
    return false;
  }

  const content = fs.readFileSync(TEACHERS_FILE, "utf8");
  const lines = content.split("\n");

  // Le mot de passe est sur la ligne suivante
  const passwordLine = lines[teacherInfo.lineNumber + 1];
  
  if (!passwordLine || !passwordLine.startsWith("mdp:")) {
    return false;
  }

  const storedPassword = passwordLine.substring(4).trim();
  return await bcrypt.compare(password, storedPassword);
}

//Vérifie le mot de passe gestionnaire

export async function checkManagerPassword(password) {
  if (!fs.existsSync(MANAGER_FILE)) {
    return false;
  }

  const content = fs.readFileSync(MANAGER_FILE, "utf8").trim();
  
  if (!content.startsWith("mdp:")) {
    return false;
  }

  const storedPassword = content.substring(4).trim();
  return await bcrypt.compare(password, storedPassword);
}

//Crée un nouveau compte enseignant 
 
export function createTeacherAccount(id, password) {
  // On vient vérifier si le compte existe déjà
  if (checkTeacherId(id)) {
    return false; // Compte déjà existant
  }

  // Ajouter le nouveau compte
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);

  const newAccount = `\nID:${id}\nmdp:${hash}\n`;

  fs.appendFileSync(TEACHERS_FILE, newAccount, "utf8");
  
  return true;
}

// Liste tous les enseignants

export function listTeachers() {
  if (!fs.existsSync(TEACHERS_FILE)) {
    return [];
  }

  const content = fs.readFileSync(TEACHERS_FILE, "utf8");
  const lines = content.split("\n");
  const teachers = [];

  for (const line of lines) {
    if (line.trim().startsWith("ID:")) {
      teachers.push(line.substring(3).trim());
    }
  }

  return teachers;
}