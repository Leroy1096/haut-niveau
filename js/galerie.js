/* ==========================================================================
   Page « Galerie » : grille filtrable par catégorie + visionneuse (lightbox)
   accessible au clavier (Échap, flèches, retour du focus).
   ========================================================================== */

import { loadGalerie, CATEGORIES_GALERIE, el, skeletons, imgFallback } from "./data.js";

let items = [];
let currentIndex = 0;
let lastFocused = null;

/* ---------- Lightbox ---------- */
function buildLightbox() {
  const lb = el("div", { class: "lightbox", id: "lightbox", role: "dialog", "aria-modal": "true", "aria-label": "Visionneuse d'image" });
  const figure = el("figure");
  const img = el("img", { id: "lbImg", alt: "" });
  const cap = el("figcaption", { id: "lbCaption" });
  figure.append(img, cap);
  const close = el("button", { class: "lb-close", type: "button", "aria-label": "Fermer la visionneuse", text: "✕" });
  const prev = el("button", { class: "lb-prev", type: "button", "aria-label": "Image précédente", text: "‹" });
  const next = el("button", { class: "lb-next", type: "button", "aria-label": "Image suivante", text: "›" });
  lb.append(figure, close, prev, next);
  document.body.append(lb);

  close.addEventListener("click", closeLightbox);
  prev.addEventListener("click", () => show(currentIndex - 1));
  next.addEventListener("click", () => show(currentIndex + 1));
  lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.classList.contains("open")) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowLeft") show(currentIndex - 1);
    else if (e.key === "ArrowRight") show(currentIndex + 1);
    else if (e.key === "Tab") {
      // Maintien du focus dans la visionneuse
      const focusables = [close, prev, next];
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  return lb;
}

function show(index) {
  const lb = document.getElementById("lightbox");
  if (!lb || !items.length) return;
  currentIndex = (index + items.length) % items.length;
  const item = items[currentIndex];
  const img = lb.querySelector("#lbImg");
  const cap = lb.querySelector("#lbCaption");
  img.src = item.image_url;
  img.alt = item.alt;
  cap.textContent = `${item.categorie} — ${item.alt}  (${currentIndex + 1}/${items.length})`;
}

function openLightbox(item) {
  const lb = document.getElementById("lightbox") || buildLightbox();
  lastFocused = document.activeElement;
  const visible = visibleItems();
  items = visible;
  show(Math.max(0, visible.findIndex((g) => g.id === item.id)));
  lb.classList.add("open");
  document.body.style.overflow = "hidden";
  lb.querySelector(".lb-close").focus();
}

function closeLightbox() {
  const lb = document.getElementById("lightbox");
  if (!lb) return;
  lb.classList.remove("open");
  document.body.style.overflow = "";
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
}

/* ---------- Grille + filtres ---------- */
let activeFilter = "Tous";

function visibleItems() {
  return activeFilter === "Tous" ? items : items.filter((g) => g.categorie === activeFilter);
}

function applyFilter() {
  document.querySelectorAll(".gallery-item").forEach((btn) => {
    const showItem = activeFilter === "Tous" || btn.dataset.categorie === activeFilter;
    btn.classList.toggle("hidden", !showItem);
  });
  const count = document.getElementById("galleryCount");
  if (count) {
    const n = visibleItems().length;
    count.textContent = `${n} réalisation${n > 1 ? "s" : ""}${activeFilter === "Tous" ? "" : ` · ${activeFilter}`}`;
  }
}

function renderFilters(categories) {
  const zone = document.getElementById("galleryFilters");
  if (!zone) return;
  const all = ["Tous", ...categories];
  zone.replaceChildren(
    ...all.map((cat) => {
      const btn = el("button", {
        class: "filter-btn", type: "button",
        "aria-pressed": cat === activeFilter ? "true" : "false",
        text: cat,
      });
      btn.addEventListener("click", () => {
        activeFilter = cat;
        zone.querySelectorAll(".filter-btn").forEach((b) =>
          b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
        applyFilter();
      });
      return btn;
    })
  );
}

async function renderGalerie() {
  const grid = document.getElementById("galleryGrid");
  if (!grid) return;
  grid.replaceChildren(...skeletons(6));

  items = await loadGalerie();
  const cats = [...new Set(items.map((g) => g.categorie))];
  renderFilters(CATEGORIES_GALERIE.filter((c) => cats.includes(c)));

  grid.replaceChildren(
    ...items.map((item) => {
      const btn = el("button", {
        class: "gallery-item reveal",
        type: "button",
        "data-categorie": item.categorie,
        "aria-label": `Agrandir : ${item.alt}`,
      });
      const img = el("img", { src: item.image_url, alt: item.alt, loading: "lazy", decoding: "async" });
      imgFallback(img, btn);
      btn.append(img);
      btn.addEventListener("click", () => openLightbox(item));
      return btn;
    })
  );
  applyFilter();
  if (typeof window.__initReveal === "function") window.__initReveal();
}

document.addEventListener("DOMContentLoaded", renderGalerie);
