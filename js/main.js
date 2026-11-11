/* ==========================================================================
   Comportements communs à toutes les pages :
   thème clair/sombre, menu mobile, en-tête sticky, apparition au scroll,
   compteurs animés, transitions de page, actions mobiles (appel/WhatsApp).
   ========================================================================== */

import { SALON } from "./config.js?v=14";

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- Thème clair / sombre ---------- */
const SUN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>';
const MOON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';

function applyThemeIcon(btn) {
  const dark = document.documentElement.dataset.theme === "dark";
  btn.innerHTML = dark ? SUN : MOON;
  btn.setAttribute("aria-label", dark ? "Passer au thème clair" : "Passer au thème sombre");
  btn.title = btn.getAttribute("aria-label");
}

function initTheme() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  applyThemeIcon(btn);
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (_) {}
    applyThemeIcon(btn);
  });
}

/* ---------- Menu mobile (burger) ---------- */
function initBurger() {
  const burger = document.getElementById("burger");
  const nav = document.getElementById("mainNav");
  if (!burger || !nav) return;

  const close = () => {
    burger.setAttribute("aria-expanded", "false");
    nav.classList.remove("open");
  };
  burger.addEventListener("click", () => {
    const open = burger.getAttribute("aria-expanded") === "true";
    burger.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("open", !open);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && nav.classList.contains("open")) { close(); burger.focus(); }
  });
  document.addEventListener("click", (e) => {
    if (nav.classList.contains("open") && !nav.contains(e.target) && !burger.contains(e.target)) close();
  });
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
}

/* ---------- En-tête : ombre au scroll ---------- */
function initHeaderScroll() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
}

/* ---------- Apparition au scroll ---------- */
function initReveal() {
  const targets = document.querySelectorAll(".reveal");
  if (!targets.length) return;
  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
    }),
    { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
  );
  targets.forEach((t) => io.observe(t));
}
// Ré-exposé pour le contenu injecté dynamiquement (listes chargées en async)
window.__initReveal = initReveal;

/* ---------- Compteurs animés ---------- */
function animateCounter(node) {
  const target = parseFloat(node.dataset.count);
  const decimals = Number(node.dataset.decimals || 0);
  const suffix = node.dataset.suffix || "";
  const fmt = new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals, maximumFractionDigits: decimals,
  });
  if (prefersReducedMotion) { node.textContent = fmt.format(target) + suffix; return; }
  const duration = 1500;
  const start = performance.now();
  const tick = (now) => {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    node.textContent = fmt.format(target * eased) + suffix;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function initCounters() {
  const counters = document.querySelectorAll("[data-count]");
  if (!counters.length) return;
  if (!("IntersectionObserver" in window)) { counters.forEach(animateCounter); return; }
  const io = new IntersectionObserver(
    (entries) => entries.forEach((en) => {
      if (en.isIntersecting) { animateCounter(en.target); io.unobserve(en.target); }
    }),
    { threshold: 0.4 }
  );
  counters.forEach((c) => io.observe(c));
}

/* ---------- Transitions de page (fade) ---------- */
function initPageTransitions() {
  document.body.classList.remove("page-enter");
  document.body.classList.add("page-entered");
  if (prefersReducedMotion) return;
  document.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (!a) return;
    const url = new URL(a.href, location.href);
    const isInternal = url.origin === location.origin && /\.html?$/.test(url.pathname);
    if (!isInternal || a.target === "_blank" || url.href === location.href || e.metaKey || e.ctrlKey) return;
    e.preventDefault();
    document.body.classList.add("page-exit");
    setTimeout(() => { location.href = url.href; }, 180);
  });
}

/* ---------- Barre d'actions mobile : Appel + WhatsApp ---------- */
function initMobileCta() {
  if (document.body.dataset.noMobileCta === "true") return;
  const bar = document.createElement("div");
  bar.className = "mobile-cta";
  bar.setAttribute("role", "region");
  bar.setAttribute("aria-label", "Actions rapides");

  const call = document.createElement("a");
  call.className = "btn btn-dark";
  call.href = SALON.telephoneHref;
  call.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.4 2.1L8 10a16 16 0 0 0 6 6l1.4-1.4a2 2 0 0 1 2.1-.4c.9.3 1.9.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg> Appeler';

  const wa = document.createElement("a");
  wa.className = "btn btn-whatsapp";
  wa.href = SALON.whatsapp;
  wa.target = "_blank";
  wa.rel = "noopener";
  wa.innerHTML = '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.6-6.1c-.3-.1-1.5-.8-1.8-.9-.2-.1-.4-.1-.6.1-.2.3-.6.8-.8 1-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4 0-.5.2-.7l.4-.5c.1-.2.1-.3 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1.1 2.7a9.1 9.1 0 0 0 3.5 3.1c1.3.6 1.9.6 2.5.5.4-.1 1.3-.5 1.5-1 .2-.5.2-1 .1-1l-.5-.3z"/></svg> WhatsApp';

  // Nom du salon au centre, entre Appeler et WhatsApp
  const brand = document.createElement("div");
  brand.className = "cta-brand";
  brand.innerHTML = "<strong>HAUT NIVEAU</strong><small>barber · Oupoyo</small>";

  bar.append(call, brand, wa);
  document.body.append(bar);
  document.body.classList.add("has-mobile-cta");

  // WhatsApp : si le navigateur bloque la nouvelle fenêtre (bloqueur de popups),
  // on navigue dans l'onglet courant. Dans l'aperçu intégré d'Arena (iframe),
  // WhatsApp refuse l'affichage en cadre → on explique plutôt que d'afficher du vide.
  wa.addEventListener("click", (e) => {
    e.preventDefault();
    const win = window.open(wa.href, "_blank", "noopener");
    if (win) return;
    if (window.self === window.top) {
      location.href = wa.href;
    } else {
      showToast("💬 Dans cet aperçu intégré, le clic est bloqué par le cadre. Sur le vrai site, le bouton ouvrira WhatsApp directement — wa.me/2250140810415");
    }
  });

  // Appeler : au clic, le numéro s'affiche directement DANS le bouton (visible même
  // quand l'action tel: est muette — aperçu, PC). Sur mobile, le clavier d'appel
  // s'ouvre en plus (action native conservée). Le bouton redevient « Appeler » après 6 s.
  call.addEventListener("click", () => {
    if (call.dataset.busy === "1") return;
    call.dataset.busy = "1";
    const labelAppeler = call.innerHTML;
    // format court "01 40 81 04 15" pour tenir dans le bouton (le lien tel: garde l'international)
    call.textContent = "01 40 81 04 15";
    call.classList.add("showing-number");
    call.setAttribute("title", "Numéro du salon");
    setTimeout(() => {
      call.innerHTML = labelAppeler;
      call.classList.remove("showing-number");
      call.removeAttribute("title");
      delete call.dataset.busy;
    }, 6000);
  });
}

/* ---------- Petit bandeau d'information éphémère ---------- */
function showToast(message) {
  let t = document.getElementById("mini-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "mini-toast";
    t.setAttribute("role", "status");
    document.body.append(t);
  }
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(t._hideTimer);
  t._hideTimer = setTimeout(() => t.classList.remove("show"), 4200);
}

/* ---------- Divers ---------- */
function initMisc() {
  const year = document.getElementById("currentYear");
  if (year) year.textContent = String(new Date().getFullYear());

  // Souligne le lien de navigation de la page courante
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".main-nav a[href]").forEach((a) => {
    if (a.getAttribute("href") === path) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });
}

/* ---------- PWA : installation et mode hors ligne (coquille) ---------- */
if ("serviceWorker" in navigator && !location.pathname.startsWith("/admin")) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => { /* PWA indisponible : le site reste fonctionnel */ });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  initBurger();
  initHeaderScroll();
  initReveal();
  initCounters();
  initPageTransitions();
  initMobileCta();
  initMisc();
});
