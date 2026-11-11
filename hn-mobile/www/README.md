# Haut Niveau — Site web du salon de coiffure (Agboville)

Site vitrine **mobile-first**, en français, avec réservation en ligne, galerie filtrable,
mode sombre et espace d'administration. **Site statique** (HTML/CSS/JS natif, zéro build)
connecté à **Supabase** (base de données + authentification) et prêt pour **Vercel**.

---

## 1. Structure du projet

```
salon-lecrin/
├── index.html            Accueil (hero, chiffres clés, aperçus services/galerie/avis, horaires)
├── services.html         Services & tarifs (2 cartes Homme / Femme, fourchettes de prix terrain en FCFA, avec CTA de réservation)
├── equipe.html           Histoire, valeurs, fiches coiffeurs, infos pratiques + carte
├── galerie.html          Grille filtrable + visionneuse (lightbox clavier)
├── rendez-vous.html      Formulaire de réservation (validation complète + anti-spam)
├── contact.html          Formulaire de contact + infos + carte
├── admin/
│   └── index.html        Espace pro : connexion, rendez-vous, coiffeurs, services, avis, galerie, messages
├── css/
│   └── style.css         Design system complet (thème clair/sombre, responsive, animations)
├── js/
│   ├── config.js         ⚙️ Coordonnées du salon + clé PUBLIQUE Supabase (voir §3)
│   ├── supabaseClient.js Chargement dynamique du client Supabase (mode dégradé si absent)
│   ├── data.js           Chargeurs + données de démonstration de repli
│   ├── main.js           Menu, thème, animations au scroll, compteurs, barre mobile Appel/WhatsApp
│   ├── home.js / services.js / equipe.js / galerie.js / rendez-vous.js / contact.js / admin.js
├── images/               Visuels du salon (optimisables, lazy-loading activé)
├── sql/
│   └── schema.sql        Script SQL complet : tables, contraintes, index, RLS, données d'exemple
└── vercel.json           URLs propres + en-têtes de sécurité (CSP, nosniff…)
```

## 2. Tester en local

Le site étant statique, n'importe quel petit serveur suffit :

```bash
cd salon-lecrin
python3 -m http.server 8000        # ou : npx serve .
# → http://localhost:8000
```

> Sans configuration Supabase, le site fonctionne en **mode démonstration** :
> contenus issus de `js/data.js`, formulaires simulés (message explicite affiché).

## 3. Base de données (Supabase)

### 3.1 Installation du schéma
1. Ouvrez votre projet Supabase → **SQL Editor**.
2. Copiez-collez tout le contenu de **`sql/schema.sql`** et exécutez (**Run**).
   Le script est idempotent (rejouable sans erreur ni doublon).
3. Vérifiez dans **Table Editor** : `coiffeurs`, `services`, `rendez_vous`, `avis`,
   `messages_contact`, `galerie`, `admin` — avec données d'exemple.

### 3.2 Brancher le site
Dans `js/config.js` :

```js
export const SUPABASE_URL = "https://VOTRE-PROJET.supabase.co";
export const SUPABASE_ANON_KEY = "VOTRE-CLE-ANON-OU-PUBLISHABLE"; // Dashboard → Settings → API Keys
```

⚠️ **Jamais** de clé `service_role` / `secret` côté front. La clé anon est
publique par conception ; la sécurité vient des **politiques RLS** (déjà activées) :

| Table            | Public (non connecté)                     | Admin |
|------------------|--------------------------------------------|-------|
| coiffeurs        | lecture (actifs)                           | tout  |
| services         | lecture (actifs)                           | tout  |
| galerie          | lecture                                    | tout  |
| avis             | lecture (approuvés)                        | tout  |
| rendez_vous      | **insertion uniquement** (statut en_attente)| tout  |
| messages_contact | **insertion uniquement**                   | tout  |
| admin            | —                                          | lecture de sa propre ligne |

### 3.3 Créer le compte administrateur (2 min, sans mettre de mot de passe dans le code)
1. Supabase → **Authentication → Users → Add user → Create new user**
   (e-mail + mot de passe fort, *Auto Confirm User* : oui).
2. Copiez l'**UID** affiché, puis dans le SQL Editor :
   ```sql
   insert into public.admin (user_id) values ('UID-COPIE-ICI');
   ```
3. Connectez-vous sur `/admin/`. « Mot de passe oublié » est disponible pour changer
   le mot de passe par e-mail.
4. Recommandé ensuite : **Authentication → Sign In / Providers → désactiver
   l'inscription publique** (*Disable sign ups*) — seuls les comptes créés par
   vous pourront exister.

Le mot de passe est haché en **bcrypt** par Supabase Auth (jamais stocké en clair,
jamais dans la table `public.admin` — qui ne contient que le lien vers `auth.users`).

## 4. Déploiement sur Vercel

### Option A — via Git (recommandé : mises à jour par simple push)
```bash
cd salon-lecrin
git init && git add -A && git commit -m "Site Haut Niveau"
# créez le dépôt sur github.com puis :
git remote add origin git@github.com:VOTRE-USER/salon-lecrin.git
git push -u origin main
```
Puis sur vercel.com : **Add New → Project → Import** le dépôt.
Framework : *Other* · Build command : *(vide)* · Output directory : *(vide ou `.`)*.

### Option B — via la CLI (instantané)
```bash
npm i -g vercel
cd salon-lecrin
vercel            # prévisualisation
vercel --prod     # production
```

> HTTPS est automatique chez Vercel. `vercel.json` ajoute les en-têtes de
> sécurité (CSP, X-Content-Type-Options, etc.) — aucune configuration requise.
> Si une page demande une connexion Vercel : *Project → Settings → Deployment
> Protection →* désactiver « Vercel Authentication ».

## 4b. État de l'installation (déjà réalisé pour vous)

**Supabase (projet `salonpro`, région eu-west-1) — terminé ✅**
- Schéma complet appliqué : 7 tables, contraintes, trigger anti-date-passée,
  index unique anti double réservation, RLS sur toutes les tables,
  données d'exemple chargées (10 services, 3 coiffeurs, 6 avis, 7 photos de galerie,
  2 rendez-vous de démonstration, 1 message de contact de démonstration).
- `js/config.js` est déjà **branché** sur ce projet (clé publique anon).
- Inscription publique **désactivée** (Authentication : seul vous créez des comptes).
- **Compte administrateur déjà créé** : e-mail = votre adresse de compte Vercel
  (`yveskione@gmail.com`). Le mot de passe temporaire vous a été communiqué dans
  la conversation — changez-le depuis `/admin/` via « Mot de passe oublié »
  (e-mail de réinitialisation) ou dans Supabase → Authentication → Users.

**Vercel — projet `salon-lecrin` créé ✅, dernier pas à la main (2 min)**
Le connecteur Vercel ne peut pas envoyer le tout premier déploiement d'un projet
(limite documentée : `projectSettings` non exposé) et ne transporte pas les
images binaires. Pour publier le site complet (photos incluses) :

```bash
npm i -g vercel          # une seule fois
cd salon-lecrin
vercel login
vercel link              # choisir l'équipe « kouamelan-s-projects » puis le projet « salon-lecrin »
vercel --prod            # en ligne !
```

Ensuite :
1. **Désactivez la protection par connexion Vercel** (sinon les visiteurs devront
   se connecter) : Vercel → projet `salon-lecrin` → *Settings → Deployment
   Protection* → désactiver « Vercel Authentication ».
2. Dans Supabase → *Authentication → URL Configuration* : mettez **Site URL**
   sur l'adresse Vercel finale et ajoutez-la aux **Redirect URLs** (pour les
   e-mails de réinitialisation de mot de passe).

---

## 5. Sécurité — récapitulatif de ce qui est déjà en place

- **Injections SQL** : impossible — toutes les requêtes passent par le client
  Supabase (PostgREST paramétré). Aucune concaténation SQL nulle part.
- **XSS** : tout rendu de données via `textContent`/`createElement` (zéro `innerHTML`
  avec des données utilisateur) + CSP en en-têtes.
- **CSRF** : par conception, l'API Supabase est appelée avec un jeton
  `Authorization: Bearer` (clé anon / JWT en `localStorage`) et **jamais par
  cookie de session** — un cookie est envoyé automatiquement par le navigateur,
  pas un en-tête Bearer : le CSRF classique est donc inapplicable.
  **Défense en profondeur en plus** : la fonction SQL `verifie_origine()`
  (trigger `trg_securite_insertion`) rejette toute insertion publique dont
  l'en-tête `Origin` n'appartient pas à la table `origines_autorisees`
  (localhost, aperçu, `*.vercel.app`… ajoutez votre domaine en production) —
  un formulaire posté depuis un site malveillant est bloqué même si la clé
  anon est publique. En-têtes de sécurité (`X-Frame-Options`, CSP
  `frame-ancestors 'none'`, `Referrer-Policy`…) prêts dans `vercel.json`.
- **RLS** activée sur les 7 tables (politiques détaillées dans `sql/schema.sql`).
- **Validation ET nettoyage, double couche** : côté client (`js/validate.js` :
  trim, caractères de contrôle supprimés, espaces compressés, téléphone et
  e-mail normalisés, troncature) **et** côté serveur (triggers
  `clean_text` / `clean_phone` / `clean_lien` avant INSERT/UPDATE, puis
  contraintes `CHECK` qui valident la valeur *nettoyée*, trigger
  anti-date-passée, index unique anti double réservation). Même un appel API
  direct hors du site stocke une donnée propre.
- **Anti-spam / limitation de débit, double couche** :
  - *Côté client* : champ piège (*honeypot* « entreprise », invisible pour les
    humains — un bot qui le remplit reçoit un faux succès), délai minimal de
    remplissage (3 s), et **pause d'1 minute** entre deux envois (`localStorage`).
  - *Côté serveur (la vraie barrière)* : trigger
    `securise_insertion_publique()` + journal SQL `antispam_journal`
    (rétention 24 h, invisible au public) — **3 demandes max / 10 min** par
    téléphone ou e-mail, **10 max / 10 min** par adresse IP, **60 insertions
    publiques max / heure** au total. Le visiteur reçoit un message clair en
    français. Testé en direct : la 4ᵉ demande d'un même numéro est rejetée.
  - Pour aller plus loin : activer le **CAPTCHA** de Supabase
    (Auth → **Attack Protection**) et/ou une Edge Function.
- **Minimisation des données** : seul le nécessaire (nom, téléphone, message).
- **Mots de passe** : bcrypt via Supabase Auth, aucun secret dans le code.

## 6. Personnalisation

- **Couleurs / thème** : variables CSS en haut de `css/style.css` (`--accent`, etc.).
- **Coordonnées, horaires, créneaux** : tout est centralisé dans `js/config.js`.
- **Images** : remplacez les fichiers de `images/` (gardez des JPG ~1200 px max)
  ou ajoutez-en via l'onglet *Galerie* de l'espace pro.
- **Contenus** (services, équipe, avis) : onglets dédiés de l'espace pro.

## 7. Checklist de tests (à rejouer après tout changement)

- [ ] Réservation : succès, créneau déjà pris (message clair), dimanche matin
      refusé (ouverture à 14h00), date passée refusée, téléphone invalide refusé,
      horaire hors 7h30 – 21h00 refusé.
- [ ] Nettoyage : nom avec espaces multiples ou caractères de contrôle → stocké
      propre ; « +225 07 07 07 07 07 » → enregistré « +2250707070707 » ;
      champ devenu vide après nettoyage → rejeté avec message clair (les deux
      couches : message en rouge côté navigateur, exception SQL côté API).
- [ ] Contact : succès, message trop court refusé, « téléphone ou e-mail » requis.
- [ ] Anti-spam : 4ᵉ demande avec le même téléphone/e-mail en 10 min → rejetée
      avec message « Trop de demandes… » (côté client : 2ᵉ envoi en moins
      d'1 minute → avertissement de patience).
- [ ] CSRF : un POST API avec un `Origin: https://site-inconnu.example` → rejeté
      « Origine de la requête refusée » ; le même POST sans en-tête Origin ou
      depuis une origine autorisée → accepté.
- [ ] Admin : mauvais mot de passe refusé ; compte non-admin refusé ;
      confirmer/annuler un rendez-vous ; ajouter un service → visible immédiatement sur le site.
- [ ] Mode sombre : bascule + persistance au rechargement.
- [ ] Mobile : menu burger, barre Appel/WhatsApp, formulaires utilisables au pouce.
- [ ] Clavier : tabulation visible, lightbox (Échap/flèches), menu (Échap).
- [ ] `prefers-reduced-motion` : aucune animation intrusive.
