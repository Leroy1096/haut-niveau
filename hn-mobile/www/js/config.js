/* ==========================================================================
   Configuration du site — HAUT NIVEAU
   --------------------------------------------------------------------------
   ⚠️ SÉCURITÉ : seule la clé PUBLIQUE (anon/publishable) de Supabase doit
   figurer ici. Elle est conçue pour être exposée côté navigateur : la
   sécurité des données est assurée côté serveur par les politiques RLS
   (voir sql/schema.sql). Ne JAMAIS placer de clé `service_role` ou
   `secret` dans ce fichier ni dans aucun fichier du site.
   ========================================================================== */

export const SUPABASE_URL = "https://zwtzaaygkxflnfmxaanj.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp3dHphYXlna3hmbG5mbXhhYW5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQyMjQ4NzEsImV4cCI6MjEwOTgwMDg3MX0.Zfy3t6T96K7sz_9RclNygdi2c1I21GcQpX9Is5S555o"; // clé "anon" publique — sécurisée par les politiques RLS

/** Indique si Supabase est configuré. Sinon, le site fonctionne en mode
 *  démonstration (données locales + confirmation simulée des formulaires). */
export const isSupabaseConfigured = () =>
  SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 20;

/* ---------- Coordonnées du salon (source unique de vérité) ---------- */
export const SALON = {
  nom: "Haut Niveau",
  adresse: "Carrefour Collège Moderne, Oupoyo — non loin de la station, axe Soubré – Méagui",
  telephone: "(+225) 01 40 81 04 15",
  telephoneHref: "tel:+2250140810415",
  whatsapp: "https://wa.me/2250140810415?text=Bonjour%20%21%20Je%20souhaite%20prendre%20rendez-vous%20dans%20votre%20salon%20de%20coiffure.",

  // WhatsApp click-to-chat — 5 scénarios pré-remplis (numéro international : 2250140810415)
  whatsappLiens: {
    rdv: "https://wa.me/2250140810415?text=Bonjour%20%21%20Je%20souhaite%20prendre%20rendez-vous%20dans%20votre%20salon%20de%20coiffure.",
    tarifs: "https://wa.me/2250140810415?text=Bonjour%20%21%20Quels%20sont%20vos%20tarifs%20%3F",
    infos: "https://wa.me/2250140810415?text=Bonjour%20%21%20J%27aimerais%20quelques%20informations%20sur%20le%20salon%20Haut%20Niveau.",
    annuler: "https://wa.me/2250140810415?text=Bonjour%20%21%20Je%20souhaite%20annuler%20ou%20modifier%20mon%20rendez-vous.",
    confirmer: "https://wa.me/2250140810415?text=Bonjour%20%21%20Je%20confirme%20mon%20rendez-vous.%20%C3%80%20tout%20%C3%A0%20l%27heure%20%21",
  },
  email: "haut10niveau@gmail.com",
  horaires: [
    ["Lundi – Samedi", "7h30 – 21h00"],
    ["Dimanche", "14h00 – 20h00"],
    ["Dimanche matin", "Fermé"],
  ],
  // Salon ouvert 7 j/7 (dimanche : après-midi uniquement) — plus de jour de fermeture
  jourFermeture: null,
  // Créneaux de réservation : pas en minutes + fenêtres par type de jour
  // (fin = dernier départ proposé ; le soir, une prestation courte peut finir à l'heure de fermeture)
  creneaux: {
    pas: 30,
    semaine: { debut: "07:30", fin: "20:30" },   // lundi – samedi : 7h30 – 21h00
    dimanche: { debut: "14:00", fin: "19:30" },  // dimanche : 14h00 – 20h00
  },
  mapsUrl: "https://www.google.com/maps/search/?api=1&query=Oupoyo+Soubr%C3%A9+C%C3%B4te+d%27Ivoire",
  mapsEmbed:
    "https://www.openstreetmap.org/export/embed.html?bbox=-6.6541%2C5.5170%2C-6.5341%2C5.5970&layer=mapnik&marker=5.55695%2C-6.59413",
};
