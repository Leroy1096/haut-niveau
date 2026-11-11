/* ==========================================================================
   Page « Notre équipe & le salon » : fiches des coiffeurs.
   ========================================================================== */

import { loadCoiffeurs, el, skeletons, imgFallback } from "./data.js";

function teamCard(c) {
  const card = el("article", { class: "card team-card reveal" });
  const img = el("img", {
    src: c.photo_url || "images/salon.jpg",
    alt: `Portrait de ${c.nom}, ${c.specialites}`,
    loading: "lazy",
    decoding: "async",
  });
  imgFallback(img, card);
  const body = el("div", { class: "team-body" });
  body.append(
    el("h3", { text: c.nom }),
    el("div", { class: "role", text: c.specialites }),
    el("div", { class: "exp", text: `${c.experience_annees} an${c.experience_annees > 1 ? "s" : ""} d'expérience` }),
    el("p", { text: c.bio || "" })
  );
  card.append(img, body);
  return card;
}

async function renderEquipe() {
  const zone = document.getElementById("teamList");
  if (!zone) return;
  zone.replaceChildren(...skeletons(3));
  const coiffeurs = await loadCoiffeurs();
  zone.replaceChildren(...coiffeurs.map(teamCard));
  if (typeof window.__initReveal === "function") window.__initReveal();
}

document.addEventListener("DOMContentLoaded", renderEquipe);
