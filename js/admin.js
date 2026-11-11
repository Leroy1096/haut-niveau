/* ==========================================================================
   Espace professionnel (/admin/) — authentifié via Supabase Auth.
   - La session est un jeton JWT envoyé en en-tête Authorization (pas de
     cookie de session → résistant au CSRF). Aucune clé secrète ici.
   - Les droits sont appliqués côté base par les politiques RLS :
     seul un compte présent dans la table `admin` peut modifier les données.
   ========================================================================== */

import { isSupabaseConfigured } from "./config.js?v=16";
import { getSupabase } from "./supabaseClient.js";
import { el, formatPrixRange, formatDuree, CATEGORIES_GALERIE } from "./data.js";
import { cleanText, cleanUrl, isValidName } from "./validate.js";

const CATEGORIES_SERVICES = ["Homme", "Femme"];
let sb = null;

/* ---------- Petites briques UI ---------- */
function statusBadge(statut) {
  const labels = { en_attente: "En attente", confirme: "Confirmé", annule: "Annulé", termine: "Terminé" };
  return el("span", { class: `status status-${statut}`, text: labels[statut] || statut });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

async function guard(label, fn) {
  try { await fn(); }
  catch (err) { console.error(err); alert(`Une erreur est survenue (${label}).`); }
}

/* ==========================================================================
   Connexion
   ========================================================================== */
function initLogin() {
  const form = document.getElementById("loginForm");
  const zone = document.getElementById("loginAlert");
  const showErr = (msg) => { zone.hidden = false; zone.className = "alert alert-error"; zone.textContent = msg; };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    zone.hidden = true;
    const btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    const { error } = await sb.auth.signInWithPassword({
      email: form.email.value.trim(),
      password: form.password.value,
    });
    btn.disabled = false;
    if (error) showErr("Identifiants incorrects. Vérifiez l'e-mail et le mot de passe.");
    // la suite est gérée par onAuthStateChange
  });

  document.getElementById("forgotLink").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!email) { showErr("Saisissez votre e-mail puis cliquez sur « Mot de passe oublié »."); return; }
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}${location.pathname}`,
    });
    zone.hidden = false;
    zone.className = error ? "alert alert-error" : "alert alert-success";
    zone.textContent = error
      ? "Impossible d'envoyer l'e-mail de réinitialisation."
      : "E-mail de réinitialisation envoyé. Suivez le lien reçu pour choisir un nouveau mot de passe.";
  });

  // Formulaire « nouveau mot de passe » (retour du lien de réinitialisation)
  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      document.getElementById("loginView").hidden = true;
      document.getElementById("resetView").hidden = false;
    }
  });
  document.getElementById("resetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = e.target;
    if (f.newpass.value.length < 8) { alert("Le mot de passe doit contenir au moins 8 caractères."); return; }
    const { error } = await sb.auth.updateUser({ password: f.newpass.value });
    alert(error ? "Échec de la mise à jour du mot de passe." : "Mot de passe mis à jour. Vous pouvez vous connecter.");
    location.reload();
  });
}

/* ==========================================================================
   Tableau de bord
   ========================================================================== */
function showDashboard() {
  document.getElementById("loginView").hidden = true;
  document.getElementById("resetView").hidden = true;
  document.getElementById("dashView").hidden = false;
  initTabs();
  loadRdv();
}

function initTabs() {
  const tabs = document.querySelectorAll(".admin-tabs [data-tab]");
  tabs.forEach((btn) => btn.addEventListener("click", () => {
    tabs.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
    document.querySelectorAll("#tabContent > section").forEach((s) => (s.hidden = true));
    document.getElementById(`tab-${btn.dataset.tab}`).hidden = false;
    ({ rdv: loadRdv, coiffeurs: loadCoiffeursAdmin, services: loadServicesAdmin, avis: loadAvisAdmin, galerie: loadGalerieAdmin, messages: loadMessages })[btn.dataset.tab]?.();
  }));
}

/* ---------- Rendez-vous ---------- */
async function loadRdv() {
  const zone = document.getElementById("rdvList");
  zone.replaceChildren(el("p", { class: "muted", text: "Chargement…" }));
  const { data, error } = await sb
    .from("rendez_vous")
    .select("*, services(nom), coiffeurs(nom)")
    .order("date_rdv", { ascending: false })
    .order("heure_rdv", { ascending: false })
    .limit(100);
  if (error) { zone.replaceChildren(el("p", { class: "muted", text: "Impossible de charger les rendez-vous." })); return; }

  const table = el("table", { class: "data-table" });
  table.append(
    el("thead", {}, [el("tr", {}, ["Date", "Heure", "Client", "Téléphone", "Service", "Coiffeur", "Statut", "Actions"].map((h) => el("th", { text: h })))])
  );
  const tbody = el("tbody");
  if (!data.length) tbody.append(el("tr", {}, [el("td", { colspan: "8", class: "muted", text: "Aucun rendez-vous pour le moment." })]));
  for (const r of data) {
    const actions = el("div", { class: "row-actions" });
    if (r.statut === "en_attente") {
      actions.append(el("button", { class: "btn btn-sm", type: "button", text: "Confirmer", onclick: () => guard("confirmation", async () => { await sb.from("rendez_vous").update({ statut: "confirme" }).eq("id", r.id); loadRdv(); }) }));
    }
    if (r.statut === "en_attente" || r.statut === "confirme") {
      actions.append(el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Annuler", onclick: () => { if (confirm("Annuler ce rendez-vous ?")) guard("annulation", async () => { await sb.from("rendez_vous").update({ statut: "annule" }).eq("id", r.id); loadRdv(); }); } }));
    }
    const tel = el("a", { href: `tel:${String(r.client_telephone).replace(/[^+\d]/g, "")}`, text: r.client_telephone });
    tbody.append(el("tr", {}, [
      el("td", { text: fmtDate(r.date_rdv + "T12:00:00") }),
      el("td", { text: String(r.heure_rdv).slice(0, 5) }),
      el("td", { text: r.client_nom }),
      el("td", {}, [tel]),
      el("td", { text: r.services?.nom || "—" }),
      el("td", { text: r.coiffeurs?.nom || "Sans préférence" }),
      el("td", {}, [statusBadge(r.statut)]),
      el("td", {}, [actions]),
    ]));
  }
  table.append(tbody);
  const wrap = el("div", { class: "table-wrap" }, [table]);
  zone.replaceChildren(wrap);
}

/* ---------- Coiffeurs ---------- */
async function loadCoiffeursAdmin() {
  const zone = document.getElementById("coiffeursList");
  zone.replaceChildren(el("p", { class: "muted", text: "Chargement…" }));
  const { data } = await sb.from("coiffeurs").select("*").order("ordre");
  const table = el("table", { class: "data-table" });
  table.append(el("thead", {}, [el("tr", {}, ["Nom", "Spécialités", "Exp.", "Actif", "Actions"].map((h) => el("th", { text: h })))]));
  const tbody = el("tbody");
  for (const c of data || []) {
    const actions = el("div", { class: "row-actions" });
    actions.append(
      el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Modifier", onclick: () => fillCoiffeurForm(c) }),
      el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Supprimer", onclick: () => { if (confirm(`Supprimer ${c.nom} ?`)) guard("suppression", async () => { await sb.from("coiffeurs").delete().eq("id", c.id); loadCoiffeursAdmin(); }); } })
    );
    tbody.append(el("tr", {}, [
      el("td", { text: c.nom }),
      el("td", { text: c.specialites }),
      el("td", { text: `${c.experience_annees} an${c.experience_annees > 1 ? "s" : ""}` }),
      el("td", { text: c.actif ? "Oui" : "Non" }),
      el("td", {}, [actions]),
    ]));
  }
  if (!data?.length) tbody.append(el("tr", {}, [el("td", { colspan: "5", class: "muted", text: "Aucun coiffeur." })]));
  table.append(tbody);
  zone.replaceChildren(el("div", { class: "table-wrap" }, [table]));
}

function fillCoiffeurForm(c) {
  const f = document.getElementById("coiffeurForm");
  f.dataset.id = c.id;
  f.nom.value = c.nom;
  f.specialites.value = c.specialites;
  f.experience_annees.value = c.experience_annees;
  f.bio.value = c.bio || "";
  f.photo_url.value = c.photo_url || "";
  f.actif.checked = c.actif;
  f.scrollIntoView({ behavior: "smooth", block: "center" });
}

function initCoiffeurForm() {
  const f = document.getElementById("coiffeurForm");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    guard("enregistrement du coiffeur", async () => {
      const payload = {
        nom: cleanText(f.nom.value, 80),
        specialites: cleanText(f.specialites.value, 120),
        experience_annees: Math.max(0, Math.min(60, parseInt(f.experience_annees.value || "0", 10) || 0)),
        bio: cleanText(f.bio.value, 600),
        photo_url: cleanUrl(f.photo_url.value, 500),
        actif: f.actif.checked,
      };
      if (!isValidName(payload.nom) || !payload.specialites) {
        alert("Nom (2 caractères min.) et spécialités sont obligatoires.");
        return;
      }
      const id = f.dataset.id;
      const { error } = id
        ? await sb.from("coiffeurs").update(payload).eq("id", id)
        : await sb.from("coiffeurs").insert(payload);
      if (error) { alert(error.code === "23505" ? "Nom déjà utilisé." : "Enregistrement impossible."); return; }
      f.reset(); delete f.dataset.id;
      loadCoiffeursAdmin();
    });
  });
}

/* ---------- Services ---------- */
async function loadServicesAdmin() {
  const zone = document.getElementById("servicesList");
  zone.replaceChildren(el("p", { class: "muted", text: "Chargement…" }));
  const { data } = await sb.from("services").select("*").order("categorie").order("ordre");
  const table = el("table", { class: "data-table" });
  table.append(el("thead", {}, [el("tr", {}, ["Nom", "Catégorie", "Prix", "Durée", "Actif", "Actions"].map((h) => el("th", { text: h })))]));
  const tbody = el("tbody");
  for (const s of data || []) {
    const actions = el("div", { class: "row-actions" });
    actions.append(
      el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Modifier", onclick: () => {
        const f = document.getElementById("serviceForm");
        f.dataset.id = s.id; f.nom.value = s.nom; f.categorie.value = s.categorie;
        f.prix.value = s.prix; f.prix_max.value = s.prix_max ?? ""; f.duree_min.value = s.duree_min; f.description.value = s.description || "";
        f.actif.checked = s.actif; f.scrollIntoView({ behavior: "smooth", block: "center" });
      } }),
      el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Supprimer", onclick: () => { if (confirm(`Supprimer « ${s.nom} » ?`)) guard("suppression", async () => {
        const { error } = await sb.from("services").delete().eq("id", s.id);
        if (error) alert("Suppression impossible : des rendez-vous sont liés à ce service. Désactivez-le plutôt.");
        loadServicesAdmin();
      }); } })
    );
    tbody.append(el("tr", {}, [
      el("td", { text: s.nom }), el("td", { text: s.categorie }),
      el("td", { text: formatPrixRange(s.prix, s.prix_max) }), el("td", { text: formatDuree(s.duree_min) }),
      el("td", { text: s.actif ? "Oui" : "Non" }), el("td", {}, [actions]),
    ]));
  }
  if (!data?.length) tbody.append(el("tr", {}, [el("td", { colspan: "6", class: "muted", text: "Aucun service." })]));
  table.append(tbody);
  zone.replaceChildren(el("div", { class: "table-wrap" }, [table]));
}

function initServiceForm() {
  const f = document.getElementById("serviceForm");
  for (const cat of CATEGORIES_SERVICES) f.categorie.append(el("option", { value: cat, text: cat }));
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    guard("enregistrement du service", async () => {
      const payload = {
        nom: cleanText(f.nom.value, 100),
        categorie: f.categorie.value,
        prix: Math.max(0, parseInt(f.prix.value || "0", 10) || 0),
        prix_max: f.prix_max.value ? Math.max(0, parseInt(f.prix_max.value, 10)) : null,
        duree_min: Math.max(5, Math.min(600, parseInt(f.duree_min.value || "30", 10) || 30)),
        description: cleanText(f.description.value, 400),
        actif: f.actif.checked,
      };
      if (payload.nom.length < 2) { alert("Le nom du service est obligatoire."); return; }
      if (payload.prix_max !== null && payload.prix_max < payload.prix) { alert("Le prix max doit être supérieur ou égal au prix min."); return; }
      const id = f.dataset.id;
      const { error } = id
        ? await sb.from("services").update(payload).eq("id", id)
        : await sb.from("services").insert(payload);
      if (error) { alert(error.code === "23505" ? "Un service porte déjà ce nom." : "Enregistrement impossible."); return; }
      f.reset(); delete f.dataset.id;
      loadServicesAdmin();
    });
  });
}

/* ---------- Avis ---------- */
async function loadAvisAdmin() {
  const zone = document.getElementById("avisList");
  zone.replaceChildren(el("p", { class: "muted", text: "Chargement…" }));
  const { data } = await sb.from("avis").select("*").order("created_at", { ascending: false }).limit(50);
  const list = el("div", { class: "grid" });
  if (!data?.length) list.append(el("p", { class: "muted", text: "Aucun avis." }));
  for (const a of data || []) {
    const card = el("article", { class: "card" });
    card.append(
      el("strong", { text: `${a.auteur} — ${a.note}/5 ${a.approuve ? "· publié" : "· masqué"}` }),
      el("p", { class: "muted", text: a.commentaire })
    );
    const actions = el("div", { class: "row-actions" });
    actions.append(
      el("button", { class: "btn btn-sm", type: "button", text: a.approuve ? "Masquer" : "Publier", onclick: () => guard("modération", async () => { await sb.from("avis").update({ approuve: !a.approuve }).eq("id", a.id); loadAvisAdmin(); }) }),
      el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Supprimer", onclick: () => { if (confirm("Supprimer cet avis ?")) guard("suppression", async () => { await sb.from("avis").delete().eq("id", a.id); loadAvisAdmin(); }); } })
    );
    card.append(actions);
    list.append(card);
  }
  zone.replaceChildren(list);
}

/* ---------- Galerie ---------- */
async function loadGalerieAdmin() {
  const zone = document.getElementById("galerieList");
  zone.replaceChildren(el("p", { class: "muted", text: "Chargement…" }));
  const { data } = await sb.from("galerie").select("*").order("ordre");
  const list = el("div", { class: "grid grid-4" });
  if (!data?.length) list.append(el("p", { class: "muted", text: "Galerie vide." }));
  for (const g of data || []) {
    const card = el("article", { class: "card team-card" });
    card.append(
      el("img", { src: g.image_url, alt: g.alt, loading: "lazy" }),
      el("div", { class: "team-body" }, [
        el("strong", { text: g.categorie }),
        el("p", { class: "muted", text: g.alt }),
        el("div", { class: "row-actions" }, [
          el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Retirer", onclick: () => { if (confirm("Retirer cette image ?")) guard("suppression", async () => { await sb.from("galerie").delete().eq("id", g.id); loadGalerieAdmin(); }); } }),
        ]),
      ])
    );
    list.append(card);
  }
  zone.replaceChildren(list);
}

function initGalerieForm() {
  const f = document.getElementById("galerieForm");
  for (const cat of CATEGORIES_GALERIE) f.categorie.append(el("option", { value: cat, text: cat }));
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    guard("ajout à la galerie", async () => {
      const { error } = await sb.from("galerie").insert({
        image_url: cleanUrl(f.image_url.value, 500),
        categorie: f.categorie.value,
        alt: cleanText(f.alt.value, 200) || "Réalisation du salon",
      });
      if (error) alert("Ajout impossible.");
      else { f.reset(); loadGalerieAdmin(); }
    });
  });
}

/* ---------- Messages ---------- */
async function loadMessages() {
  const zone = document.getElementById("messagesList");
  zone.replaceChildren(el("p", { class: "muted", text: "Chargement…" }));
  const { data } = await sb.from("messages_contact").select("*").order("created_at", { ascending: false }).limit(50);
  const list = el("div", { class: "grid" });
  if (!data?.length) list.append(el("p", { class: "muted", text: "Aucun message." }));
  for (const m of data || []) {
    const card = el("article", { class: "card" });
    const head = el("strong", { text: `${m.lu ? "✉" : "📩"} ${m.nom} · ${new Date(m.created_at).toLocaleDateString("fr-FR")}` });
    const coord = el("p", { class: "muted", text: [m.telephone, m.email].filter(Boolean).join(" · ") });
    card.append(head, coord, el("p", { text: m.message }));
    const actions = el("div", { class: "row-actions" });
    actions.append(
      el("button", { class: "btn btn-sm btn-outline", type: "button", text: m.lu ? "Marquer non lu" : "Marquer lu", onclick: () => guard("lecture", async () => { await sb.from("messages_contact").update({ lu: !m.lu }).eq("id", m.id); loadMessages(); }) }),
      el("button", { class: "btn btn-sm btn-outline", type: "button", text: "Supprimer", onclick: () => { if (confirm("Supprimer ce message ?")) guard("suppression", async () => { await sb.from("messages_contact").delete().eq("id", m.id); loadMessages(); }); } })
    );
    card.append(actions);
    list.append(card);
  }
  zone.replaceChildren(list);
}

/* ==========================================================================
   Point d'entrée
   ========================================================================== */
document.addEventListener("DOMContentLoaded", async () => {
  const app = document.getElementById("adminApp");
  if (!isSupabaseConfigured()) {
    app.replaceChildren(el("div", { class: "notice", text: "L'espace professionnel nécessite une base Supabase configurée. Renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans js/config.js, exécutez sql/schema.sql, puis créez un compte administrateur (voir README.md)." }));
    return;
  }
  sb = await getSupabase();
  if (!sb) {
    app.replaceChildren(el("div", { class: "notice", text: "Impossible de joindre la base de données. Vérifiez votre connexion." }));
    return;
  }

  initLogin();
  initCoiffeurForm();
  initServiceForm();
  initGalerieForm();

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    location.reload();
  });

  // Session existante ?
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return;

  // Seul un compte enregistré dans la table `admin` passe (appliqué aussi par la RLS)
  const { data: isAdminRow, error } = await sb.from("admin").select("id").maybeSingle();
  if (error || !isAdminRow) {
    const zone = document.getElementById("loginAlert");
    zone.hidden = false;
    zone.className = "alert alert-error";
    zone.textContent = "Ce compte n'a pas les droits d'administration du salon.";
    return;
  }
  showDashboard();
});
