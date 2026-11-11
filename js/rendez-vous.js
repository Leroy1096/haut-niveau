/* ==========================================================================
   Page « Rendez-vous » : formulaire de réservation.
   - Validation complète côté client ET contraintes/trigger côté serveur (SQL).
   - Anti-spam : champ piège (honeypot) + délai minimal avant envoi.
   - Créneau déjà pris : la contrainte d'unicité SQL renvoie un message clair.
   ========================================================================== */

import { SALON, isSupabaseConfigured } from "./config.js?v=14";
import { getSupabase } from "./supabaseClient.js";
import { loadServices, loadCoiffeurs, el, formatPrixRange, formatDuree } from "./data.js";
import { cleanText, cleanPhone, isValidPhone, isValidName } from "./validate.js";
const MIN_FILL_MS = 3000; // un humain met au moins 3 s à remplir le formulaire
let formLoadedAt = Date.now();
let services = [];
let coiffeurs = [];

/* ---------- Helpers UI ---------- */
function setError(input, message) {
  const field = input.closest(".field");
  if (!field) return;
  field.classList.toggle("invalid", Boolean(message));
  const err = field.querySelector(".field-error");
  if (err) err.textContent = message || "";
  if (message) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

function showAlert(type, message) {
  const zone = document.getElementById("formAlert");
  if (!zone) return;
  zone.hidden = false;
  zone.className = `alert alert-${type}`;
  zone.replaceChildren(document.createTextNode(""));
  const text = document.createElement("div");
  text.textContent = message;
  zone.append(text);
  zone.scrollIntoView({ behavior: "smooth", block: "center" });
  zone.setAttribute("tabindex", "-1");
  zone.focus({ preventScroll: true });
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.classList.toggle("loading", loading);
  if (loading) {
    btn.dataset.label = btn.textContent;
    btn.replaceChildren(el("span", { class: "spinner", "aria-hidden": "true" }), document.createTextNode(" Envoi en cours…"));
  } else if (btn.dataset.label) {
    btn.textContent = btn.dataset.label;
  }
}

/* ---------- Remplissage des listes ---------- */
function minutesDe(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }

/* Créneaux selon le jour choisi : lun–sam 7h30–20h30 (fermeture 21h),
   dimanche 14h–19h30 (fermé le matin, fermeture 20h). */
function creneauxDisponibles(dateStr = "") {
  const jour = dateStr ? new Date(`${dateStr}T12:00:00`).getDay() : null;
  const fenetre = jour === 0 ? SALON.creneaux.dimanche : SALON.creneaux.semaine;
  const pas = SALON.creneaux.pas;
  const slots = [];
  for (let t = minutesDe(fenetre.debut); t <= minutesDe(fenetre.fin); t += pas) {
    slots.push(`${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`);
  }
  return slots;
}

async function initForm() {
  const serviceSel = document.getElementById("service");
  const coiffeurSel = document.getElementById("coiffeur");
  const heureSel = document.getElementById("heure");
  const dateInput = document.getElementById("date");
  formLoadedAt = Date.now();

  // Dates : min aujourd'hui, max +60 jours (fuseau local — évite le décalage UTC)
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const today = new Date();
  const max = new Date();
  max.setDate(max.getDate() + 60);
  dateInput.min = fmt(today);
  dateInput.max = fmt(max);

  [services, coiffeurs] = await Promise.all([loadServices(), loadCoiffeurs()]);

  serviceSel.replaceChildren(el("option", { value: "", text: "— Choisissez un service —" }));
  for (const s of services) {
    serviceSel.append(el("option", {
      value: s.id,
      text: `${s.nom} · ${formatPrixRange(s.prix, s.prix_max)} · ${formatDuree(s.duree_min)}`,
    }));
  }
  // Pré-sélection depuis services.html (?service=<id>)
  const wanted = new URLSearchParams(location.search).get("service");
  if (wanted && services.some((s) => String(s.id) === wanted)) serviceSel.value = wanted;

  coiffeurSel.replaceChildren(el("option", { value: "", text: "Sans préférence (premier disponible)" }));
  for (const c of coiffeurs) {
    coiffeurSel.append(el("option", { value: c.id, text: `${c.nom} — ${c.specialites}` }));
  }

  // Le dimanche n'ouvre qu'à 14h : la liste des heures dépend de la date choisie
  const remplirHeures = () => {
    const valeur = heureSel.value;
    heureSel.replaceChildren(el("option", { value: "", text: "— Choisissez l'heure —" }));
    for (const slot of creneauxDisponibles(dateInput.value)) {
      heureSel.append(el("option", { value: slot, text: slot.replace(":", " h ") }));
    }
    if (valeur && [...heureSel.options].some((o) => o.value === valeur)) heureSel.value = valeur;
  };
  remplirHeures();

  dateInput.addEventListener("change", () => {
    setError(dateInput, "");
    remplirHeures();
  });
}

/* ---------- Validation ---------- */
function validate(form) {
  let ok = true;
  const nom = form.nom;
  const tel = form.telephone;
  const service = form.service;
  const date = form.date;
  const heure = form.heure;
  const message = form.message;

  if (!isValidName(nom.value)) { setError(nom, "Merci d'indiquer votre nom (2 caractères minimum)."); ok = false; } else setError(nom, "");
  if (!isValidPhone(tel.value)) { setError(tel, "Numéro invalide (ex. : +225 07 07 07 07 07)."); ok = false; } else setError(tel, "");
  if (!service.value) { setError(service, "Merci de choisir un service."); ok = false; } else setError(service, "");

  if (!date.value) { setError(date, "Merci de choisir une date."); ok = false; }
  else {
    const d = new Date(`${date.value}T12:00:00`);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    if (d < now) { setError(date, "La date ne peut pas être passée."); ok = false; }
    else setError(date, "");
  }

  if (!heure.value) { setError(heure, "Merci de choisir une heure."); ok = false; }
  else if (!creneauxDisponibles(date.value).includes(heure.value)) { setError(heure, "Hors des horaires d'ouverture (le dimanche : à partir de 14h00)."); ok = false; }
  else setError(heure, "");
  if (message.value.length > 500) { setError(message, "Message trop long (500 caractères maximum)."); ok = false; } else setError(message, "");

  return ok;
}

/* ---------- Succès ---------- */
function showSuccess(recap) {
  const form = document.getElementById("bookingForm");
  const panel = document.getElementById("successPanel");
  const recapZone = document.getElementById("recapZone");
  form.hidden = true;
  recapZone.replaceChildren(
    el("dt", { text: "Service" }), el("dd", { text: recap.service }),
    el("dt", { text: "Coiffeur·se" }), el("dd", { text: recap.coiffeur }),
    el("dt", { text: "Date" }), el("dd", { text: recap.date }),
    el("dt", { text: "Heure" }), el("dd", { text: recap.heure }),
    el("dt", { text: "Nom" }), el("dd", { text: recap.nom })
  );
  panel.hidden = false;
  panel.scrollIntoView({ behavior: "smooth", block: "center" });
  panel.focus?.();
}

/* ---------- Envoi ---------- */
async function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById("submitBtn");
  document.getElementById("formAlert").hidden = true;

  // Anti-spam : honeypot rempli → bot ; envoi trop rapide → bot
  if (form.entreprise.value) { showSuccess({ service: "—", coiffeur: "—", date: "—", heure: "—", nom: form.nom.value }); form.reset(); return; }
  if (Date.now() - formLoadedAt < MIN_FILL_MS) { showAlert("error", "Envoi trop rapide : merci de vérifier le formulaire puis de réessayer."); return; }
  // Anti-spam : une demande par minute par navigateur (le serveur impose des limites plus strictes et durables)
  try {
    const dernier = parseInt(localStorage.getItem("rdv_dernier_envoi") || "0", 10);
    if (Date.now() - dernier < 60000) {
      showAlert("error", "Vous venez déjà d'envoyer une demande. Patientez une minute avant d'en renvoyer une autre, ou appelez-nous directement.");
      return;
    }
  } catch { /* navigation privée : la limitation serveur reste active */ }
  if (!validate(form)) { showAlert("error", "Certains champs sont à corriger (voir les messages en rouge)."); return; }

  // Nettoyage avant envoi (miroir du trigger nettoyage côté serveur)
  const payload = {
    client_nom: cleanText(form.nom.value, 80),
    client_telephone: cleanPhone(form.telephone.value),
    service_id: form.service.value,
    coiffeur_id: form.coiffeur.value || null,
    date_rdv: form.date.value,
    heure_rdv: form.heure.value,
    message: cleanText(form.message.value, 500) || null,
  };

  const serviceObj = services.find((s) => String(s.id) === payload.service_id);
  const coiffeurObj = coiffeurs.find((c) => String(c.id) === payload.coiffeur_id);
  const recap = {
    service: serviceObj ? serviceObj.nom : "—",
    coiffeur: coiffeurObj ? coiffeurObj.nom : "Sans préférence",
    date: new Date(`${payload.date_rdv}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    heure: payload.heure_rdv.replace(":", " h "),
    nom: payload.client_nom,
  };

  setLoading(btn, true);
  const sb = await getSupabase();

  if (!sb) {
    // Mode démonstration : aucune donnée n'est enregistrée
    await new Promise((r) => setTimeout(r, 900));
    setLoading(btn, false);
    showSuccess(recap);
    document.getElementById("demoNote").hidden = isSupabaseConfigured();
    return;
  }

  // Requête paramétrée via le client Supabase (jamais de SQL concaténé)
  const { error } = await sb.from("rendez_vous").insert(payload);
  setLoading(btn, false);

  if (!error) {
    try { localStorage.setItem("rdv_dernier_envoi", String(Date.now())); } catch { /* silencieux */ }
    form.reset();
    showSuccess(recap);
    document.getElementById("demoNote").hidden = true;
    return;
  }

  // Messages d'erreur explicites selon le code retourné par PostgreSQL
  if (error.code === "P0001") {
    // Exceptions de nos triggers SQL (nettoyage/validation serveur) : messages sûrs et en français
    showAlert("error", error.message || "Données rejetées par la validation côté serveur.");
  } else if (error.code === "23505") {
    showAlert("error", "Ce créneau vient d'être pris pour ce coiffeur. Choisissez une autre heure ou un autre coiffeur, ou contactez-nous sur WhatsApp.");
    setError(form.heure, "Créneau indisponible, merci d'en choisir un autre.");
  } else if (error.code === "23514" || /passée|passe/i.test(error.message || "")) {
    showAlert("error", "Ce rendez-vous n'est pas valide (date ou horaire). Merci de vérifier votre choix.");
  } else if (error.code === "42501") {
    showAlert("error", "L'enregistrement en ligne est momentanément indisponible. Appelez-nous ou écrivez-nous sur WhatsApp : nous vous répondons vite !");
  } else {
    showAlert("error", "Une erreur est survenue pendant l'envoi. Réessayez dans un instant ou contactez-nous par téléphone.");
    console.error(error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("bookingForm");
  if (!form) return;
  initForm();
  form.addEventListener("submit", onSubmit);
});
