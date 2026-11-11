/* ==========================================================================
   Client Supabase — chargé dynamiquement, uniquement si configuré.
   Toutes les requêtes passent par ce client : les appels sont paramétrés
   par construction (postgREST), ce qui empêche toute injection SQL.
   ========================================================================== */

import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "./config.js?v=14";

let clientPromise = null;

/** Retourne le client Supabase ou null si non configuré / hors-ligne. */
export function getSupabase() {
  if (!isSupabaseConfigured()) return Promise.resolve(null);
  if (clientPromise) return clientPromise;

  clientPromise = import("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm")
    .then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true },
      })
    )
    .catch((err) => {
      console.warn("Supabase indisponible, mode dégradé :", err);
      return null;
    });

  return clientPromise;
}
