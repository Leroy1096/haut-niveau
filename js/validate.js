/* ==========================================================================
   Validation + nettoyage des champs — CÔTÉ CLIENT.
   Miroir exact du nettoyage effectué côté serveur par les triggers SQL
   (clean_text / clean_phone / clean_lien dans sql/schema.sql) : une donnée
   arrive dans la base toujours nettoyée, quel que soit le canal d'entrée.
   ========================================================================== */

/** Traite les caractères de contrôle (C0 : 0-31, DEL : 127, C1 : 128-159),
 *  typiquement introduits par un copier-coller ou un robot.
 *  Avec remplacement " " : ils deviennent un espace (comme le trigger SQL) ;
 *  avec "" : ils sont supprimés. */
function stripControl(s, replacement = "") {
  let out = "";
  for (const ch of String(s)) {
    const c = ch.codePointAt(0);
    if (c >= 32 && c !== 127 && !(c >= 128 && c <= 159)) out += ch;
    else out += replacement;
  }
  return out;
}

/** Texte libre : sans caractères de contrôle, espaces compressés,
 *  bordures nettoyées, tronqué à maxLen. */
export function cleanText(value, maxLen = 500) {
  return stripControl(value ?? "", " ")  // contrôle (saut de ligne…) → espace
    .replace(/\s+/g, " ")                // espaces multiples → 1 espace
    .trim()
    .slice(0, maxLen);
}

/** Téléphone : supprime espaces/points/tirets/parenthèses et tout caractère
 *  non numérique ; conserve un éventuel « + » en tête de numéro. */
export function cleanPhone(value) {
  const raw = stripControl(value ?? "").trim();
  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/\D/g, "");
  return (hasPlus ? "+" : "") + digits;
}

/** E-mail : sans contrôle, bordures retirées, minuscules, tronqué. */
export function cleanEmail(value, maxLen = 120) {
  return stripControl(value ?? "").trim().toLowerCase().slice(0, maxLen);
}

/** URL / chemin d'image : aucun espace ni caractère de contrôle, tronquée. */
export function cleanUrl(value, maxLen = 500) {
  return stripControl(value ?? "").replace(/\s+/g, "").slice(0, maxLen);
}

/* ---------- Validations (toujours APRÈS nettoyage) ---------- */
const PHONE_RE = /^\+?\d{8,15}$/;   // 8 à 15 chiffres, « + » optionnel (E.164)
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function isValidPhone(value) { return PHONE_RE.test(cleanPhone(value)); }
export function isValidEmail(value) { return EMAIL_RE.test(cleanEmail(value)); }
export function isValidName(value)  { return cleanText(value, 80).length >= 2; }
