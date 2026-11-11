/* ==========================================================================
   Page « Contact » : formulaire de message.
   Mêmes protections que la réservation : validation double, honeypot, délai.
   ========================================================================== */

import { isSupabaseConfigured } from "./config.js?v=16";
import { getSupabase } from "./supabaseClient.js";
import { el } from "./data.js";
import { cleanText, cleanPhone, cleanEmail, isValidPhone, isValidEmail, isValidName } from "./validate.js";

let loadedAt = Date.now();

function setError(input, message) {
  const field = input.closest(".field");
  if (!field) return;
  field.classList.toggle("invalid", Boolean(message));
  const err = field.querySelector(".field-error");
  if (err) err.textContent = message || "";
}

function setLoading(btn, loading) {
  btn.disabled = loading;
  if (loading) {
    btn.dataset.label = btn.textContent;
    btn.replaceChildren(el("span", { class: "spinner", "aria-hidden": "true" }), document.createTextNode(" Envoi en cours…"));
  } else if (btn.dataset.label) btn.textContent = btn.dataset.label;
}

function showResult(type, message) {
  const zone = document.getElementById("contactAlert");
  zone.hidden = false;
  zone.className = `alert alert-${type}`;
  zone.textContent = message;
  zone.scrollIntoView({ behavior: "smooth", block: "center" });
}

async function onSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const btn = document.getElementById("contactBtn");
  document.getElementById("contactAlert").hidden = true;

  if (form.entreprise.value) { showResult("success", "Votre message a bien été envoyé."); form.reset(); return; }
  if (Date.now() - loadedAt < 2000) { showResult("error", "Envoi trop rapide, merci de réessayer."); return; }
  // Anti-spam : un message par minute par navigateur (le serveur impose des limites plus strictes)
  try {
    const dernier = parseInt(localStorage.getItem("msg_dernier_envoi") || "0", 10);
    if (Date.now() - dernier < 60000) { showResult("error", "Vous venez déjà d'envoyer un message. Patientez une minute, ou appelez-nous directement."); return; }
  } catch { /* navigation privée : la limitation serveur reste active */ }

  let ok = true;
  // Nettoyage puis validation (miroir du nettoyage serveur)
  const nom = cleanText(form.nom.value, 80);
  const tel = cleanPhone(form.telephone.value);
  const email = cleanEmail(form.email.value);
  const message = cleanText(form.message.value, 1000);

  if (!isValidName(nom)) { setError(form.nom, "Merci d'indiquer votre nom."); ok = false; } else setError(form.nom, "");
  if (tel && !isValidPhone(tel)) { setError(form.telephone, "Numéro invalide."); ok = false; } else setError(form.telephone, "");
  if (email && !isValidEmail(email)) { setError(form.email, "Adresse e-mail invalide."); ok = false; } else setError(form.email, "");
  if (!tel && !email) { setError(form.email, "Laissez au moins un téléphone ou un e-mail pour vous répondre."); ok = false; }
  if (message.length < 5) { setError(form.message, "Votre message est un peu court (5 caractères minimum)."); ok = false; }
  else if (message.length > 1000) { setError(form.message, "Message trop long (1000 caractères maximum)."); ok = false; }
  else setError(form.message, "");

  if (!ok) { showResult("error", "Certains champs sont à corriger (messages en rouge)."); return; }

  setLoading(btn, true);
  const sb = await getSupabase();

  if (!sb) {
    await new Promise((r) => setTimeout(r, 700));
    setLoading(btn, false);
    form.reset();
    showResult("success", isSupabaseConfigured()
      ? "Votre message a bien été envoyé. Nous vous répondons sous 24 h ouvrées."
      : "Mode démonstration : votre message n'a pas été enregistré (base non configurée).");
    return;
  }

  const { error } = await sb.from("messages_contact").insert({
    nom,
    telephone: tel || null,
    email: email || null,
    message,
  });
  setLoading(btn, false);

  if (error) {
    showResult("error", "L'envoi a échoué. Réessayez dans un instant ou appelez-nous directement.");
    console.error(error);
  } else {
    try { localStorage.setItem("msg_dernier_envoi", String(Date.now())); } catch { /* silencieux */ }
    const waBtn = document.getElementById("waResumeBtn");
    if (waBtn) {
      const lignes = ["Bonjour ! Je vous ai envoyé un message depuis le site Haut Niveau :", `• Nom : ${nom}`];
      if (tel) lignes.push(`• Téléphone : ${tel}`);
      if (email) lignes.push(`• E-mail : ${email}`);
      lignes.push("", message);
      waBtn.href = "https://wa.me/2250140810415?text=" + encodeURIComponent(lignes.join("\n"));
      waBtn.hidden = false;
    }
    form.reset();
    showResult("success", "Merci ! Votre message a bien été envoyé. Nous vous répondons sous 24 h ouvrées.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("contactForm");
  if (!form) return;
  loadedAt = Date.now();
  form.addEventListener("submit", onSubmit);
});
