/* ==========================================================================
   Couche de données — charge depuis Supabase quand il est configuré,
   sinon depuis les données de démonstration ci-dessous.
   Tous les rendus utilisent textContent / createElement (anti-XSS).
   ========================================================================== */

import { getSupabase } from "./supabaseClient.js";

/* ---------- Données de démonstration (mode hors-ligne / sans config) ---------- */
export const FALLBACK = {
  services: [
    // ---- Carte Homme (prix terrain, d'après la carte du salon) ----
    { id: "a1000000-0000-4000-8000-000000000001", nom: "Coupe simple tondeuse", description: "Coupe uniforme, sans dessin.", categorie: "Homme", prix: 500, prix_max: 1000, duree_min: 30 },
    { id: "a1000000-0000-4000-8000-000000000002", nom: "Coupe + Dégradé / Fade", description: "Dégradé américain, taper bas.", categorie: "Homme", prix: 1000, prix_max: 1500, duree_min: 30 },
    { id: "a1000000-0000-4000-8000-000000000003", nom: "Coupe + Dessin / Motif", description: "Lignes, étoile, vague à la lame.", categorie: "Homme", prix: 1500, prix_max: 2500, duree_min: 45 },
    { id: "a1000000-0000-4000-8000-000000000004", nom: "Rasage tête complète", description: "À la tondeuse ou à la lame.", categorie: "Homme", prix: 500, prix_max: 1000, duree_min: 20 },
    { id: "a1000000-0000-4000-8000-000000000005", nom: "Taille de barbe", description: "Nettoyage + contours nets.", categorie: "Homme", prix: 500, prix_max: 1000, duree_min: 20 },
    { id: "a1000000-0000-4000-8000-000000000006", nom: "Forfait Coupe + Barbe + Rasage visage", description: "Le forfait complet du samedi.", categorie: "Homme", prix: 2000, prix_max: 3000, duree_min: 60 },
    { id: "a1000000-0000-4000-8000-000000000007", nom: "Shampoing + Soin homme", description: "Nettoyage et soin du cuir chevelu.", categorie: "Homme", prix: 500, prix_max: 1000, duree_min: 30 },
    { id: "a1000000-0000-4000-8000-000000000008", nom: "Teinture / Coloration noire", description: "Pour camoufler les cheveux blancs.", categorie: "Homme", prix: 2000, prix_max: 5000, duree_min: 60 },
    { id: "a1000000-0000-4000-8000-000000000009", nom: "Défrisage homme", description: "Technique douce, produit compris.", categorie: "Homme", prix: 3000, prix_max: 5000, duree_min: 90 },
    { id: "a1000000-0000-4000-8000-000000000010", nom: "Coupe Enfant (−12 ans)", description: "Moins de 12 ans, en douceur.", categorie: "Homme", prix: 500, prix_max: 1000, duree_min: 25 },
    { id: "a1000000-0000-4000-8000-000000000011", nom: "Locks / Dreadlocks", description: "Reprise des racines, entretien.", categorie: "Homme", prix: 5000, prix_max: 10000, duree_min: 90 },
    // ---- Carte Femme ----
    { id: "a2000000-0000-4000-8000-000000000001", nom: "Coupe simple femme", description: "Coupe des pointes et mise en forme.", categorie: "Femme", prix: 1000, prix_max: 2000, duree_min: 40 },
    { id: "a2000000-0000-4000-8000-000000000002", nom: "Shampoing + Brushing", description: "Lavage doux et mise en forme.", categorie: "Femme", prix: 1000, prix_max: 2500, duree_min: 45 },
    { id: "a2000000-0000-4000-8000-000000000003", nom: "Tresses simples (nattes, piqué-lâché)", description: "Cheveux naturels, sans mèches.", categorie: "Femme", prix: 1500, prix_max: 3000, duree_min: 90 },
    { id: "a2000000-0000-4000-8000-000000000004", nom: "Tresses avec mèches (Fulani, box braids…)", description: "Mèches comprises, toutes longueurs.", categorie: "Femme", prix: 3000, prix_max: 8000, duree_min: 180 },
    { id: "a2000000-0000-4000-8000-000000000005", nom: "Vanilles / Twists", description: "Cheveux naturels ou mèches.", categorie: "Femme", prix: 2500, prix_max: 5000, duree_min: 120 },
    { id: "a2000000-0000-4000-8000-000000000006", nom: "Locks / Dreadlocks femme", description: "Reprise des racines, entretien.", categorie: "Femme", prix: 5000, prix_max: 10000, duree_min: 90 },
    { id: "a2000000-0000-4000-8000-000000000007", nom: "Coloration complète", description: "Produit compris, cuir chevelu protégé.", categorie: "Femme", prix: 3000, prix_max: 6000, duree_min: 90 },
    { id: "a2000000-0000-4000-8000-000000000008", nom: "Balayage / Mèches", description: "Effet soleil sur cheveux texturés.", categorie: "Femme", prix: 5000, prix_max: 12000, duree_min: 150 },
    { id: "a2000000-0000-4000-8000-000000000009", nom: "Défrisage + soin", description: "Technique douce, produit compris.", categorie: "Femme", prix: 3000, prix_max: 5000, duree_min: 90 },
    { id: "a2000000-0000-4000-8000-000000000010", nom: "Soin profond (vapeur)", description: "Masque capillaire réparateur.", categorie: "Femme", prix: 1500, prix_max: 3000, duree_min: 45 },
    { id: "a2000000-0000-4000-8000-000000000011", nom: "Pose de perruque", description: "Wig posée et coiffée.", categorie: "Femme", prix: 2000, prix_max: 5000, duree_min: 60 },
    { id: "a2000000-0000-4000-8000-000000000012", nom: "Coiffure mariage / événement", description: "Essai inclus, à domicile possible.", categorie: "Femme", prix: 5000, prix_max: 15000, duree_min: 90 },
  ],
  coiffeurs: [
    {
      id: "c1", nom: "Aïcha Koné", photo_url: "images/team-aicha.jpg",
      specialites: "Tresses & coiffures protectrices", experience_annees: 10,
      bio: "Fondatrice du salon. Formée à Abidjan et Dakar, Aïcha fait des tresses un art : fulani, knotless, vanilles… toujours sans douleur et sans casse.",
    },
    {
      id: "c2", nom: "Mariam Touré", photo_url: "images/team-mariam.jpg",
      specialites: "Coloration & coupes femme", experience_annees: 7,
      bio: "Coloriste passionnée, Mariam maîtrise le balayage sur cheveux texturés et les coupes qui épousent votre visage. Son conseil : des couleurs qui vivent bien au soleil.",
    },
    {
      id: "c3", nom: "Junior Kouassi", photo_url: "images/team-junior.jpg",
      specialites: "Barbier & coupes homme", experience_annees: 6,
      bio: "Précision au millimètre : dégradés, contours de barbe et finition à la serviette chaude. Junior transforme chaque coupe homme en signature.",
    },
  ],
  avis: [
    { id: "a1", auteur: "Fatou D.", note: 5, commentaire: "Mes box braids ont tenu deux mois sans abîmer mes bords. Accueil adorable et salon impeccable. Je recommande à 100 % !", service_mentionne: "Tresses" },
    { id: "a2", auteur: "Koffi A.", note: 5, commentaire: "Le meilleur barbier de l'axe. Rendez-vous pris en ligne en 2 minutes, zéro attente sur place.", service_mentionne: "Barbe" },
    { id: "a3", auteur: "Aminata S.", note: 5, commentaire: "Mon balayage caramel est magnifique et mes cheveux sont restés souples. Mariam est une vraie pro de la couleur.", service_mentionne: "Coloration" },
    { id: "a4", auteur: "Nadia B.", note: 4, commentaire: "Coiffée pour mon mariage : chignon superbe du matin au soir. Petit plus : l'équipe est venue à domicile.", service_mentionne: "Événements" },
    { id: "a5", auteur: "Serge K.", note: 5, commentaire: "Salon moderne, propre, ponctuel. La coupe enfant est un sans-faute avec mon fils de 6 ans.", service_mentionne: "Coupes" },
    { id: "a6", auteur: "Prisca Y.", note: 5, commentaire: "Le soin vapeur a littéralement réparé mes pointes. On sent que l'équipe aime les cheveux.", service_mentionne: "Soins" },
  ],
  galerie: [
    { id: "g1", image_url: "images/galerie-coupe.jpg", alt: "Coupe courte effilée sur cheveux crépus", categorie: "Coupes", ordre: 1 },
    { id: "g2", image_url: "images/galerie-coloration.jpg", alt: "Balayage caramel sur cheveux longs", categorie: "Coloration", ordre: 2 },
    { id: "g3", image_url: "images/galerie-tresses.jpg", alt: "Tresses fulani ornées de perles dorées", categorie: "Tresses", ordre: 3 },
    { id: "g4", image_url: "images/galerie-mariage.jpg", alt: "Chignon de mariée avec accessoires dorés", categorie: "Événements", ordre: 4 },
    { id: "g5", image_url: "images/galerie-barbe.jpg", alt: "Taille de barbe aux contours nets", categorie: "Barbe", ordre: 5 },
    { id: "g6", image_url: "images/galerie-brushing.jpg", alt: "Brushing soyeux, brillance miroir", categorie: "Soins", ordre: 6 },
    { id: "g7", image_url: "images/salon.jpg", alt: "L'intérieur lumineux du salon Haut Niveau", categorie: "Soins", ordre: 7 },
    { id: "g8", image_url: "images/galerie-waves.jpg", alt: "Waves décolorées platine, contours nets (photo client)", categorie: "Coupes", ordre: 8 },
    { id: "g9", image_url: "images/galerie-locks-ombre.jpg", alt: "Locks ombrées aux pointes blondes — extensions (photo client)", categorie: "Locks", ordre: 9 },
    { id: "g10", image_url: "images/galerie-locks-depart.jpg", alt: "Départ de locks propre, séparation carrée — extensions (photo client)", categorie: "Locks", ordre: 10 },
    { id: "g11", image_url: "images/galerie-coupe-cuivre.jpg", alt: "Coupe courte femme, coloration cuivrée lumineuse (photo client)", categorie: "Coloration", ordre: 11 },
    { id: "g12", image_url: "images/galerie-coiffage-blond.jpg", alt: "Boucles teintées blond platine, contours nets (photo client)", categorie: "Coloration", ordre: 12 },
    { id: "g13", image_url: "images/galerie-fade-barbe.jpg", alt: "Fade propre et barbe aux contours dessinés (photo client)", categorie: "Coupes", ordre: 13 },
    { id: "g14", image_url: "images/galerie-fade-motif.jpg", alt: "Fade avec motif tracé à la lame (photo client)", categorie: "Coupes", ordre: 14 },
    { id: "g15", image_url: "images/galerie-tresses-homme.jpg", alt: "Tresses collées homme, fade et barbe nets (photo client)", categorie: "Tresses", ordre: 15 },
    { id: "g16", image_url: "images/galerie-motif-cuivre.jpg", alt: "Motif artistique à la lame, boucles cuivrées (photo client)", categorie: "Coupes", ordre: 16 },
    { id: "g17", image_url: "images/galerie-motif-tempe.jpg", alt: "Fade net avec motif signature à la tempe (photo client)", categorie: "Coupes", ordre: 17 },
    { id: "g18", image_url: "images/galerie-motif-croix.jpg", alt: "Fade et croix tracée, barbe impeccable (photo client)", categorie: "Coupes", ordre: 18 },
    { id: "g19", image_url: "images/galerie-hightop.jpg", alt: "Coupe afro structurée, contours parfaits (photo client)", categorie: "Coupes", ordre: 19 },
    { id: "g20", image_url: "images/galerie-zigzag-cuivre.jpg", alt: "Boucles cuivrées et motif zigzag à la lame (photo client)", categorie: "Coupes", ordre: 20 },
    { id: "g21", image_url: "images/galerie-geo-cuivre.jpg", alt: "Boucles cuivrées, motif géométrique (photo client)", categorie: "Coupes", ordre: 21 },
    { id: "g22", image_url: "images/galerie-vanilles-homme.jpg", alt: "Vanilles homme avec fade et barbe sculptée (photo client)", categorie: "Tresses", ordre: 22 },
    { id: "g23", image_url: "images/galerie-motif-x.jpg", alt: "Boucles naturelles, motif croisé à la lame (photo client)", categorie: "Coupes", ordre: 23 },
    { id: "g24", image_url: "images/galerie-bordeaux.jpg", alt: "Coupe courte teintée bordeaux, mini motif (photo client)", categorie: "Coloration", ordre: 24 },
    { id: "g25", image_url: "images/galerie-vague.jpg", alt: "Boucles définies et motif vague (photo client)", categorie: "Coupes", ordre: 25 },
    { id: "g26", image_url: "images/galerie-coeur.jpg", alt: "Boucles femme, motif cœur et lettre tracés (photo client)", categorie: "Coupes", ordre: 26 },
    { id: "g27", image_url: "images/galerie-soin-purete.jpg", alt: "Soin visage pureté aux pétales de rose", categorie: "Soins", ordre: 27 },
    { id: "g28", image_url: "images/galerie-gommage.jpg", alt: "Gommage visage en douceur, teint lumineux", categorie: "Soins", ordre: 28 },
    { id: "g29", image_url: "images/galerie-massage-visage.jpg", alt: "Massage relaxant du visage, ambiance tamisée", categorie: "Soins", ordre: 29 },
    { id: "g30", image_url: "images/galerie-masque-creme.jpg", alt: "Application d'un masque crème hydratant", categorie: "Soins", ordre: 30 },
    { id: "g31", image_url: "images/galerie-masque-charbon.jpg", alt: "Masque au charbon purifiant", categorie: "Soins", ordre: 31 },
  ],
};

export const CATEGORIES_GALERIE = ["Coupes", "Coloration", "Tresses", "Locks", "Événements", "Barbe", "Soins"];

/* ---------- Utilitaires de formatage ---------- */
const prixFmt = new Intl.NumberFormat("fr-FR");
export const formatPrix = (n) => `${prixFmt.format(n)} FCFA`;
export const formatDuree = (min) =>
  min >= 60 ? `${Math.floor(min / 60)} h${min % 60 ? ` ${String(min % 60).padStart(2, "0")}` : ""}` : `${min} min`;

/** "500 – 1 000 FCFA" si une fourchette (prix_max) existe, sinon "4 000 FCFA". */
export const formatPrixRange = (prix, prixMax) =>
  prixMax ? `${prixFmt.format(prix)} – ${prixFmt.format(prixMax)} FCFA` : formatPrix(prix);

/* ---------- Petit helper DOM (anti-XSS : jamais de innerHTML avec des données) ---------- */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.append(c);
  return node;
}

export const skeletons = (n) =>
  Array.from({ length: n }, () => el("div", { class: "skeleton", "aria-hidden": "true" }));

/** Si une image est introuvable (404), remplace par un dégradé élégant
 *  au lieu d'une icône cassée. */
export function imgFallback(img, holder) {
  img.addEventListener("error", () => {
    img.remove();
    if (holder) holder.classList.add("img-missing");
  }, { once: true });
}

/* ---------- Chargeurs (Supabase → repli local) ---------- */
export async function loadServices() {
  const sb = await getSupabase();
  if (!sb) return FALLBACK.services;
  const { data, error } = await sb.from("services").select("*").eq("actif", true).order("ordre").order("prix");
  return error || !data?.length ? FALLBACK.services : data;
}

export async function loadCoiffeurs() {
  const sb = await getSupabase();
  if (!sb) return FALLBACK.coiffeurs;
  const { data, error } = await sb.from("coiffeurs").select("*").eq("actif", true).order("ordre");
  return error || !data?.length ? FALLBACK.coiffeurs : data;
}

export async function loadAvis(limit = 12) {
  const sb = await getSupabase();
  if (!sb) return FALLBACK.avis.slice(0, limit);
  const { data, error } = await sb
    .from("avis").select("*").eq("approuve", true)
    .order("created_at", { ascending: false }).limit(limit);
  return error || !data?.length ? FALLBACK.avis.slice(0, limit) : data;
}

export async function loadGalerie() {
  const sb = await getSupabase();
  if (!sb) return FALLBACK.galerie;
  const { data, error } = await sb.from("galerie").select("*").order("ordre");
  return error || !data?.length ? FALLBACK.galerie : data;
}
