// src/config/config.js
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const PROJECT_ROOT = path.resolve(__dirname, "../..");
export const REVIEW_DIR  = path.join(PROJECT_ROOT, "review");
export const RESULTS_DIR = path.join(PROJECT_ROOT, "results");
export const DATA_DIR    = path.join(PROJECT_ROOT, "data");
export const PROFILS_DIR = path.join(PROJECT_ROOT, "profils");
export const EXPORT_PROFILAGE_DIR = path.join(PROJECT_ROOT, "exports_profilage_png_csv");
export const VCARDS_DIR  = path.join(PROJECT_ROOT, "vCards");
export const AUTH_DIR    = path.join(PROJECT_ROOT, "auth");

export default {
  PROJECT_ROOT,
  REVIEW_DIR,
  RESULTS_DIR,
  DATA_DIR,
  PROFILS_DIR,
  EXPORT_PROFILAGE_DIR,
  VCARDS_DIR,
  AUTH_DIR
};
