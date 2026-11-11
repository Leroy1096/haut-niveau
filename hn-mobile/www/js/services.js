/* ==========================================================================
   Page « Services & Tarifs » : liste complète regroupée par catégorie.
   ========================================================================== */

import { loadServices, el, skeletons } from "./data.js";
import { serviceCard } from "./home.js";

const ORDRE_CATEGORIES = ["Homme", "Femme"];

async function renderServices() {
  const zone = document.getElementById("servicesList");
  if (!zone) return;
  zone.replaceChildren(el("div", { class: "grid grid-3" }, skeletons(6)));

  const services = await loadServices();
  const parCategorie = new Map();
  for (const s of services) {
    if (!parCategorie.has(s.categorie)) parCategorie.set(s.categorie, []);
    parCategorie.get(s.categorie).push(s);
  }

  const fragments = [];
  const categories = [
    ...ORDRE_CATEGORIES.filter((c) => parCategorie.has(c)),
    ...[...parCategorie.keys()].filter((c) => !ORDRE_CATEGORIES.includes(c)),
  ];

  for (const cat of categories) {
    const section = el("section", { class: "service-group", "aria-labelledby": `cat-${cat}` });
    const head = el("div", { class: "section-head reveal" });
    head.append(el("h2", { id: `cat-${cat}`, text: cat }));
    const grid = el("div", { class: "grid grid-3" });
    grid.append(...parCategorie.get(cat).map((s) => serviceCard(s, true)));
    section.append(head, grid);
    section.style.marginBottom = "3rem";
    fragments.push(section);
  }

  zone.replaceChildren(...fragments);
  if (typeof window.__initReveal === "function") window.__initReveal();
}

document.addEventListener("DOMContentLoaded", renderServices);
