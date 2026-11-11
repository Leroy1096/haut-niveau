/* ==========================================================================
   Page d'accueil : aperçu des services, de la galerie et des avis.
   ========================================================================== */

import { loadServices, loadGalerie, loadAvis, el, skeletons, formatPrixRange, formatDuree, imgFallback } from "./data.js";

/* Rend une carte service (partagée avec la page Services) */
export function serviceCard(s, withCta = false) {
  const card = el("article", { class: "card service-card reveal" });
  card.append(
    el("span", { class: "badge", text: s.categorie }),
    el("h3", { text: s.nom }),
    el("p", { class: "desc", text: s.description || "" })
  );
  const meta = el("div", { class: "service-meta" });
  meta.append(
    el("span", { class: "service-price", text: formatPrixRange(s.prix, s.prix_max) }),
    el("span", { class: "service-duration", text: `⏱ ${formatDuree(s.duree_min)}` })
  );
  card.append(meta);
  if (withCta) {
    const cta = el("a", {
      class: "btn btn-sm btn-outline",
      href: `rendez-vous.html?service=${encodeURIComponent(s.id)}`,
      text: "Réserver ce service",
    });
    cta.style.alignSelf = "flex-start";
    cta.style.marginTop = "0.9rem";
    card.append(cta);
  }
  return card;
}

/* Rend une image de la galerie (bouton → lightbox éventuelle) */
export function galleryItem(item, onOpen = null) {
  const btn = el("button", {
    class: "gallery-item reveal",
    type: "button",
    "data-categorie": item.categorie,
    "aria-label": `Agrandir : ${item.alt}`,
  });
  const img = el("img", { src: item.image_url, alt: item.alt, loading: "lazy", decoding: "async" });
  imgFallback(img, btn);
  btn.append(img);
  if (onOpen) btn.addEventListener("click", () => onOpen(item));
  return btn;
}

/* Rend une carte avis */
export function reviewCard(a) {
  const card = el("article", { class: "card review-card reveal" });
  const stars = el("div", { class: "stars", role: "img", "aria-label": `Note : ${a.note} sur 5` });
  stars.textContent = "★".repeat(a.note) + "☆".repeat(5 - a.note);
  const quote = el("blockquote", { text: `« ${a.commentaire} »` });
  const author = el("div", { class: "review-author" });
  author.append(
    el("span", { class: "avatar", text: a.auteur.trim().charAt(0).toUpperCase(), "aria-hidden": "true" }),
    el("span", { text: `${a.auteur}${a.service_mentionne ? " · " + a.service_mentionne : ""}` })
  );
  card.append(stars, quote, author);
  return card;
}

/* Renvoie le contenu vers l'observer d'apparition déjà initialisé */
function refreshReveals() {
  if (typeof window.__initReveal === "function") window.__initReveal();
}

/* ---------- « Nos savoir-faire » (accueil) ----------
   Cartes aux prix indicatifs demandés par le salon : pas de fourchette
   chiffrée (sauf enfants) et jamais de durée affichée. La page Services
   garde, elle, la carte détaillée complète. */
const SAVOIR_FAIRE = [
  { id: "a2000000-0000-4000-8000-000000000001", badge: "Femme", nom: "Coupe Dames", prix: "Selon le modèle",
    desc: "Du carré net à la coupe évolutive : un geste précis, adapté à votre visage et à vos envies." },
  { id: "a1000000-0000-4000-8000-000000000001", badge: "Homme", nom: "Coupe Homme", prix: "Selon le modèle",
    desc: "Coupe simple, dégradé ou avec motif : travail net et contours impeccables." },
  { id: "a1000000-0000-4000-8000-000000000010", badge: "Enfants", nom: "Coupe Enfants", prix: "À partir de 500 FCFA",
    desc: "Patience et douceur pour les petits, le geste juste sans stress." },
  { id: "a2000000-0000-4000-8000-000000000007", badge: "Femme & Homme", nom: "Coloration", prix: "Selon la couleur",
    desc: "Coloration complète, teinture ou reflets : le tarif dépend de la couleur choisie." },
  { id: "a2000000-0000-4000-8000-000000000003", badge: "Femme", nom: "Tresses", prix: "Selon le modèle",
    desc: "Nattes, fulani, box braids… le tarif dépend du modèle et de la longueur." },
];

function savoirFaireCard(sf, services) {
  const s = services.find((x) => String(x.id) === sf.id);
  const card = el("article", { class: "card service-card reveal" });
  card.append(
    el("span", { class: "badge", text: sf.badge }),
    el("h3", { text: sf.nom }),
    el("p", { class: "desc", text: sf.desc })
  );
  const meta = el("div", { class: "service-meta" });
  meta.append(el("span", { class: "service-price", text: sf.prix })); // prix indicatif — pas de durée
  card.append(meta);
  const cta = el("a", {
    class: "btn btn-sm btn-outline",
    href: `rendez-vous.html${s ? `?service=${encodeURIComponent(s.id)}` : ""}`,
    text: "Réserver",
  });
  cta.style.alignSelf = "flex-start";
  cta.style.marginTop = "0.9rem";
  card.append(cta);
  return card;
}

async function renderServicesPreview() {
  const zone = document.getElementById("servicesPreview");
  if (!zone) return;
  zone.replaceChildren(...skeletons(3));
  const services = await loadServices();
  zone.replaceChildren(...SAVOIR_FAIRE.map((sf) => savoirFaireCard(sf, services)));
  refreshReveals();
}

async function renderGalleryPreview() {
  const zone = document.getElementById("galleryPreview");
  if (!zone) return;
  zone.replaceChildren(...skeletons(4));
  const items = await loadGalerie();
  zone.replaceChildren(...items.slice(0, 6).map((g) => galleryItem(g, () => { location.href = "galerie.html"; })));
  refreshReveals();
}

async function renderAvis() {
  const zone = document.getElementById("avisList");
  if (!zone) return;
  zone.replaceChildren(...skeletons(3));
  const avis = await loadAvis(6);
  zone.replaceChildren(...avis.slice(0, 3).map((a) => reviewCard(a)));
  refreshReveals();
}

document.addEventListener("DOMContentLoaded", () => {
  renderServicesPreview();
  renderGalleryPreview();
  renderAvis();
});
