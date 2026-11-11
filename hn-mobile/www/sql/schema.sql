-- ============================================================================
-- HAUT NIVEAU — Schéma de base de données complet (PostgreSQL / Supabase)
-- ----------------------------------------------------------------------------
-- Tables : coiffeurs, services, rendez_vous, avis, messages_contact, galerie, admin
-- Inclut : clés primaires/étrangères, contraintes NOT NULL / UNIQUE / CHECK,
--          index (date + coiffeur), protection anti double réservation,
--          fonctions de validation, RLS (sécurité au niveau ligne), données d'exemple.
--
-- À exécuter dans : Supabase → SQL Editor (ou via l'outil de migration).
-- Le script est idempotent : il peut être relancé sans casser l'existant.
-- ============================================================================

begin;

-- Pour gen_random_uuid() et crypt()/gen_salt() (hachage bcrypt des mots de passe
-- si un administrateur est créé via SQL — voir README.md)
create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ---------- Coiffeurs ----------
create table if not exists public.coiffeurs (
  id                 uuid        primary key default gen_random_uuid(),
  nom                text        not null check (char_length(nom) between 2 and 80),
  specialites        text        not null default '' check (char_length(specialites) <= 120),
  experience_annees  smallint    not null default 0 check (experience_annees between 0 and 60),
  bio                text        not null default '' check (char_length(bio) <= 600),
  photo_url          text        not null default '' check (char_length(photo_url) <= 500),
  actif              boolean     not null default true,
  ordre              smallint    not null default 0,
  created_at         timestamptz not null default now()
);

-- ---------- Services ----------
create table if not exists public.services (
  id          uuid        primary key default gen_random_uuid(),
  nom         text        not null unique check (char_length(nom) between 2 and 100),
  description text        not null default '' check (char_length(description) <= 400),
  categorie   text        not null default 'Homme'
              check (categorie in ('Homme','Femme')),          -- 2 catégories de services
  prix        integer     not null check (prix >= 0),          -- prix en FCFA (ou prix MIN de la fourchette)
  prix_max    integer     check (prix_max is null or prix_max >= prix), -- null = prix unique
  duree_min   smallint    not null check (duree_min between 5 and 600),
  actif       boolean     not null default true,
  ordre       smallint    not null default 0,
  created_at  timestamptz not null default now()
);

-- ---------- Rendez-vous ----------
-- Minimisation des données : on ne stocke que nom + téléphone (+ message libre),
-- aucune donnée bancaire ni d'adresse e-mail inutile.
create table if not exists public.rendez_vous (
  id               uuid        primary key default gen_random_uuid(),
  client_nom       text        not null check (char_length(client_nom) between 2 and 80),
  client_telephone text        not null check (client_telephone ~ '^\+?[0-9 ().-]{8,20}$'),
  service_id       uuid        not null references public.services(id) on delete restrict,
  coiffeur_id      uuid        references public.coiffeurs(id) on delete set null,
  date_rdv         date        not null,
  heure_rdv        time        not null check (heure_rdv >= '07:00'::time and heure_rdv <= '21:00'::time),
  message          text        check (message is null or char_length(message) <= 500),
  statut           text        not null default 'en_attente'
                   check (statut in ('en_attente','confirme','annule','termine')),
  created_at       timestamptz not null default now()
);

-- Anti double réservation : un même coiffeur ne peut pas avoir deux RDV
-- actifs (en_attente ou confirmé) sur le même créneau.
create unique index if not exists rdv_unique_creneau
  on public.rendez_vous (coiffeur_id, date_rdv, heure_rdv)
  where statut in ('en_attente', 'confirme');

-- Index demandés : recherches par date et par coiffeur
create index if not exists rdv_date_idx     on public.rendez_vous (date_rdv);
create index if not exists rdv_coiffeur_idx on public.rendez_vous (coiffeur_id);
create index if not exists rdv_statut_idx   on public.rendez_vous (statut);

-- Validation serveur supplémentaire : pas de rendez-vous dans le passé
create or replace function public.rdv_date_pas_passee() returns trigger
language plpgsql as $$
begin
  if new.date_rdv < current_date then
    raise exception 'La date du rendez-vous ne peut pas être passée.';
  end if;
  return new;
end $$;

drop trigger if exists trg_rdv_date on public.rendez_vous;
create trigger trg_rdv_date
  before insert or update on public.rendez_vous
  for each row execute function public.rdv_date_pas_passee();

-- Horaires d'ouverture réels : lundi – samedi 7h30 – 21h00 (dernier départ
-- 20h30) ; dimanche 14h00 – 20h00, fermé le matin (dernier départ 19h30).
create or replace function public.verifie_horaires_ouverture() returns trigger
language plpgsql as
$$
begin
  if new.heure_rdv < time '07:30' or new.heure_rdv > time '20:30' then
    raise exception 'Horaire en dehors des heures d''ouverture (lundi – samedi, 7h30 – 21h00).' using errcode = 'P0001';
  end if;
  if extract(isodow from new.date_rdv) = 7 and (new.heure_rdv < time '14:00' or new.heure_rdv > time '19:30') then
    raise exception 'Le dimanche, le salon est ouvert de 14h00 à 20h00 (fermé le matin).' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_horaires_ouverture on public.rendez_vous;
create trigger trg_horaires_ouverture
  before insert or update on public.rendez_vous
  for each row execute function public.verifie_horaires_ouverture();

-- ---------- Avis clients ----------
create table if not exists public.avis (
  id                uuid        primary key default gen_random_uuid(),
  auteur            text        not null check (char_length(auteur) between 2 and 60),
  note              smallint    not null check (note between 1 and 5),
  commentaire       text        not null check (char_length(commentaire) between 5 and 500),
  service_mentionne text        check (service_mentionne is null or char_length(service_mentionne) <= 60),
  approuve          boolean     not null default false,   -- modéré avant publication
  created_at        timestamptz not null default now()
);

-- ---------- Messages de contact ----------
create table if not exists public.messages_contact (
  id         uuid        primary key default gen_random_uuid(),
  nom        text        not null check (char_length(nom) between 2 and 80),
  telephone  text        check (telephone is null or telephone ~ '^\+?[0-9 ().-]{8,20}$'),
  email      text        check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
             check (email is null or char_length(email) <= 120),
  message    text        not null check (char_length(message) between 5 and 1000),
  lu         boolean     not null default false,
  created_at timestamptz not null default now(),
  -- Au moins un moyen de réponse (même règle que dans le formulaire web)
  check (telephone is not null or email is not null)
);

-- ---------- Galerie ----------
create table if not exists public.galerie (
  id         uuid        primary key default gen_random_uuid(),
  image_url  text        not null check (char_length(image_url) between 2 and 500),
  alt        text        not null default 'Réalisation du salon' check (char_length(alt) <= 200),
  categorie  text        not null default 'Coupes'
             check (categorie in ('Coupes','Coloration','Tresses','Locks','Soins','Événements','Barbe')),
  ordre      smallint    not null default 0,
  created_at timestamptz not null default now()
);

-- ---------- Administrateurs ----------
-- Aucun mot de passe ici : l'authentification (hachage bcrypt du mot de passe)
-- est gérée par Supabase Auth (table auth.users). Cette table ne fait que
-- marquer quel(s) compte(s) ont les droits d'administration du site.
create table if not exists public.admin (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null unique references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- 1b. NETTOYAGE + VALIDATION CÔTÉ SERVEUR
--     Triggers BEFORE INSERT/UPDATE : toute donnée entrante — site web, appel
--     API direct, script — est NETTOYÉE, puis validée par les contraintes
--     CHECK de la section 1. Miroir de js/validate.js côté client.
-- ============================================================================

-- Texte libre : caractères de contrôle → espace, espaces compressés, trim, tronqué
create or replace function public.clean_text(t text, max_len int default 500)
returns text language plpgsql immutable as $$
begin
  if t is null then return null; end if;
  t := regexp_replace(t, '[[:cntrl:]]', ' ', 'g');
  t := regexp_replace(t, '\s+', ' ', 'g');
  t := btrim(t);
  return left(t, max_len);
end $$;

-- Téléphone : séparateurs et tout non-chiffre retirés, « + » conservé en tête
create or replace function public.clean_phone(t text)
returns text language plpgsql immutable as $$
declare has_plus boolean;
begin
  if t is null then return null; end if;
  has_plus := left(btrim(t), 1) = '+';
  t := translate(t, ' ' || chr(9) || chr(10) || chr(13) || '().-', '');
  t := regexp_replace(t, '[^0-9]', '', 'g');
  if has_plus then t := '+' || t; end if;
  return t;
end $$;

-- Lien/URL : caractères de contrôle et espaces retirés, tronqué
create or replace function public.clean_lien(t text, max_len int default 500)
returns text language plpgsql immutable as $$
begin
  if t is null then return null; end if;
  t := regexp_replace(t, '[[:cntrl:]]', '', 'g');
  t := regexp_replace(t, '\s+', '', 'g');
  return left(t, max_len);
end $$;

create or replace function public.nettoie_rendez_vous() returns trigger language plpgsql as $$
begin
  new.client_nom := public.clean_text(new.client_nom, 80);
  new.client_telephone := public.clean_phone(new.client_telephone);
  new.message := nullif(public.clean_text(new.message, 500), '');
  -- Validation de la valeur NETTOYÉE (avant les CHECK) avec message clair
  if new.client_nom is null or char_length(new.client_nom) < 2 then
    raise exception 'Nom de client invalide (2 caractères minimum après nettoyage).';
  end if;
  if new.client_telephone is null or new.client_telephone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'Numéro de téléphone invalide après nettoyage (8 à 15 chiffres).';
  end if;
  return new;
end $$;

drop trigger if exists trg_nettoie_rdv on public.rendez_vous;
create trigger trg_nettoie_rdv before insert or update on public.rendez_vous
  for each row execute function public.nettoie_rendez_vous();

create or replace function public.nettoie_messages_contact() returns trigger language plpgsql as $$
begin
  new.nom := public.clean_text(new.nom, 80);
  new.telephone := nullif(public.clean_phone(new.telephone), '');
  new.email := nullif(lower(btrim(new.email)), '');
  if new.email is not null then new.email := left(new.email, 120); end if;
  new.message := public.clean_text(new.message, 1000);
  if new.nom is null or char_length(new.nom) < 2 then
    raise exception 'Nom invalide (2 caractères minimum après nettoyage).';
  end if;
  if new.telephone is null and new.email is null then
    raise exception 'Indiquez au moins un téléphone ou un e-mail.';
  end if;
  if new.telephone is not null and new.telephone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'Numéro de téléphone invalide après nettoyage.';
  end if;
  return new;
end $$;

drop trigger if exists trg_nettoie_messages on public.messages_contact;
create trigger trg_nettoie_messages before insert or update on public.messages_contact
  for each row execute function public.nettoie_messages_contact();

create or replace function public.nettoie_avis() returns trigger language plpgsql as $$
begin
  new.auteur := public.clean_text(new.auteur, 60);
  new.commentaire := public.clean_text(new.commentaire, 500);
  new.service_mentionne := nullif(public.clean_text(new.service_mentionne, 60), '');
  return new;
end $$;

drop trigger if exists trg_nettoie_avis on public.avis;
create trigger trg_nettoie_avis before insert or update on public.avis
  for each row execute function public.nettoie_avis();

create or replace function public.nettoie_coiffeurs() returns trigger language plpgsql as $$
begin
  new.nom := public.clean_text(new.nom, 80);
  new.specialites := public.clean_text(new.specialites, 120);
  new.bio := public.clean_text(new.bio, 600);
  new.photo_url := public.clean_lien(new.photo_url, 500);
  return new;
end $$;

drop trigger if exists trg_nettoie_coiffeurs on public.coiffeurs;
create trigger trg_nettoie_coiffeurs before insert or update on public.coiffeurs
  for each row execute function public.nettoie_coiffeurs();

create or replace function public.nettoie_services() returns trigger language plpgsql as $$
begin
  new.nom := public.clean_text(new.nom, 100);
  new.description := public.clean_text(new.description, 400);
  return new;
end $$;

drop trigger if exists trg_nettoie_services on public.services;
create trigger trg_nettoie_services before insert or update on public.services
  for each row execute function public.nettoie_services();

create or replace function public.nettoie_galerie() returns trigger language plpgsql as $$
begin
  new.image_url := public.clean_lien(new.image_url, 500);
  new.alt := coalesce(nullif(public.clean_text(new.alt, 200), ''), 'Réalisation du salon');
  return new;
end $$;

drop trigger if exists trg_nettoie_galerie on public.galerie;
create trigger trg_nettoie_galerie before insert or update on public.galerie
  for each row execute function public.nettoie_galerie();

-- ============================================================================
-- 1c. PROTECTION CSRF + LIMITATION ANTI-SPAM (côté serveur)
-- Contexte : le site authentifie l'API par jeton Bearer (clé anon / JWT) et
-- NON par cookie — le CSRF « classique » n'est donc pas exploitable. On ajoute
-- quand même une défense en profondeur : contrôle de l'en-tête Origin pour
-- toute écriture publique, et limitation de débit persistante (journal SQL).
-- ============================================================================

create table if not exists public.origines_autorisees (
  motif text primary key,          -- motif LIKE, ex. 'https://%.vercel.app'
  note  text
);
alter table public.origines_autorisees enable row level security; -- aucune policy : invisible au public
revoke all on public.origines_autorisees from anon, authenticated;

insert into public.origines_autorisees (motif, note) values
  ('http://localhost:%',  'Développement local'),
  ('http://127.0.0.1:%',  'Développement local'),
  ('https://%.e2b.app',   'Aperçu de développement (sandbox)'),
  ('https://%.vercel.app','Production Vercel'),
  ('http://localhost',    'Application Android Capacitor (WebView)'),
  ('https://localhost',   'Application Android Capacitor (WebView https)'),
  ('capacitor://localhost','Application iOS Capacitor')
on conflict (motif) do nothing;
-- ⚠ Après mise en production, ajoutez votre domaine :
-- insert into public.origines_autorisees values ('https://votre-domaine.ci', 'Site en production');

create or replace function public.verifie_origine() returns void
language plpgsql security definer set search_path = public as
$$
declare
  v_headers text;
  v_origin  text;
begin
  v_headers := current_setting('request.headers', true);
  if v_headers is null or btrim(v_headers) = '' then return; end if; -- éditeur SQL / non-navigateur
  v_origin := nullif(btrim(v_headers::json ->> 'origin'), '');
  if v_origin is null or v_origin = 'null' then return; end if;      -- curl, scripts, file://
  if not exists (select 1 from public.origines_autorisees o where v_origin like o.motif) then
    raise exception 'Origine de la requête refusée (protection CSRF).' using errcode = 'P0001';
  end if;
end;
$$;

create table if not exists public.antispam_journal (
  id        bigint generated always as identity primary key,
  sujet     text not null,           -- 'rendez_vous' | 'messages_contact'
  empreinte text not null,           -- téléphone ou e-mail nettoyé
  ip        text,
  cree_le   timestamptz not null default now()
);
create index if not exists idx_antispam_empreinte on public.antispam_journal (sujet, empreinte, cree_le desc);
create index if not exists idx_antispam_ip        on public.antispam_journal (sujet, ip, cree_le desc);
create index if not exists idx_antispam_date      on public.antispam_journal (cree_le);
alter table public.antispam_journal enable row level security;
revoke all on public.antispam_journal from anon, authenticated;

create or replace function public.antispam_controle(p_sujet text, p_empreinte text) returns void
language plpgsql security definer set search_path = public as
$$
declare
  v_headers text;
  v_ip      text;
  n         integer;
begin
  delete from public.antispam_journal where cree_le < now() - interval '24 hours';
  v_headers := current_setting('request.headers', true);
  if v_headers is not null and btrim(v_headers) <> '' then
    v_ip := nullif(btrim(split_part(v_headers::json ->> 'x-forwarded-for', ',', 1)), '');
  end if;
  -- a) même téléphone / e-mail : max 3 demandes par 10 minutes
  select count(*) into n from public.antispam_journal
   where sujet = p_sujet and empreinte = p_empreinte and cree_le > now() - interval '10 minutes';
  if n >= 3 then
    raise exception 'Trop de demandes en peu de temps depuis ce contact. Réessayez dans quelques minutes ou appelez-nous directement.' using errcode = 'P0001';
  end if;
  -- b) même IP : max 10 demandes par 10 minutes
  if v_ip is not null then
    select count(*) into n from public.antispam_journal
     where sujet = p_sujet and ip = v_ip and cree_le > now() - interval '10 minutes';
    if n >= 10 then
      raise exception 'Trop de demandes en peu de temps depuis votre connexion. Réessayez dans quelques minutes.' using errcode = 'P0001';
    end if;
  end if;
  -- c) cap global : 60 insertions publiques / heure
  select count(*) into n from public.antispam_journal where cree_le > now() - interval '1 hour';
  if n >= 60 then
    raise exception 'Le salon reçoit beaucoup de demandes en ce moment. Merci de réessayer dans quelques minutes.' using errcode = 'P0001';
  end if;
  insert into public.antispam_journal (sujet, empreinte, ip) values (p_sujet, p_empreinte, v_ip);
end;
$$;

create or replace function public.securise_insertion_publique() returns trigger
language plpgsql security definer set search_path = public as
$$
declare
  v_empreinte text;
begin
  perform public.verifie_origine();
  if TG_TABLE_NAME = 'rendez_vous' then
    v_empreinte := coalesce(nullif(new.client_telephone, ''), new.client_nom, '?');
  else
    v_empreinte := coalesce(nullif(new.email, ''), nullif(new.telephone, ''), new.nom, '?');
  end if;
  perform public.antispam_controle(TG_TABLE_NAME, v_empreinte);
  return new;
end;
$$;

-- Nommés « trg_securite_insertion » : ils se déclenchent après les triggers
-- « trg_nettoie_* » (ordre alphabétique des BEFORE) → l'empreinte limitée
-- est toujours la valeur déjà nettoyée.
drop trigger if exists trg_securite_insertion on public.rendez_vous;
create trigger trg_securite_insertion before insert on public.rendez_vous
  for each row execute function public.securise_insertion_publique();

drop trigger if exists trg_securite_insertion on public.messages_contact;
create trigger trg_securite_insertion before insert on public.messages_contact
  for each row execute function public.securise_insertion_publique();

revoke execute on function public.verifie_origine() from anon, authenticated;
revoke execute on function public.antispam_controle(text, text) from anon, authenticated;
revoke execute on function public.securise_insertion_publique() from anon, authenticated;

-- ============================================================================
-- 2. FONCTION is_admin() — vrai si l'utilisateur connecté est admin
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$ select exists (select 1 from public.admin where user_id = auth.uid()) $$;

-- ============================================================================
-- 3. ROW LEVEL SECURITY — le public ne lit que ce qui est publié et ne peut
--    QUE créer un rendez-vous ou un message ; seul l'admin modifie/supprime.
-- ============================================================================

alter table public.coiffeurs        enable row level security;
alter table public.services         enable row level security;
alter table public.rendez_vous      enable row level security;
alter table public.avis             enable row level security;
alter table public.messages_contact enable row level security;
alter table public.galerie          enable row level security;
alter table public.admin            enable row level security;

-- ----- coiffeurs : lecture publique (actifs uniquement), gestion admin -----
drop policy if exists "coiffeurs_lecture_publique" on public.coiffeurs;
create policy "coiffeurs_lecture_publique" on public.coiffeurs
  for select using (actif = true);
drop policy if exists "coiffeurs_gestion_admin" on public.coiffeurs;
create policy "coiffeurs_gestion_admin" on public.coiffeurs
  for all using (public.is_admin()) with check (public.is_admin());

-- ----- services : idem -----
drop policy if exists "services_lecture_publique" on public.services;
create policy "services_lecture_publique" on public.services
  for select using (actif = true);
drop policy if exists "services_gestion_admin" on public.services;
create policy "services_gestion_admin" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

-- ----- rendez_vous : création publique, lecture/gestion réservées à l'admin -----
-- (le public ne peut PAS lister les rendez-vous → confidentialité des clients)
drop policy if exists "rdv_creation_publique" on public.rendez_vous;
create policy "rdv_creation_publique" on public.rendez_vous
  for insert with check (statut = 'en_attente');
drop policy if exists "rdv_gestion_admin" on public.rendez_vous;
create policy "rdv_gestion_admin" on public.rendez_vous
  for all using (public.is_admin()) with check (public.is_admin());

-- ----- avis : lecture publique des avis approuvés, modération admin -----
drop policy if exists "avis_lecture_publique" on public.avis;
create policy "avis_lecture_publique" on public.avis
  for select using (approuve = true);
drop policy if exists "avis_gestion_admin" on public.avis;
create policy "avis_gestion_admin" on public.avis
  for all using (public.is_admin()) with check (public.is_admin());

-- ----- messages_contact : envoi public, lecture/suppression admin -----
drop policy if exists "messages_envoi_public" on public.messages_contact;
create policy "messages_envoi_public" on public.messages_contact
  for insert with check (true);
drop policy if exists "messages_gestion_admin" on public.messages_contact;
create policy "messages_gestion_admin" on public.messages_contact
  for all using (public.is_admin()) with check (public.is_admin());

-- ----- galerie : lecture publique, gestion admin -----
drop policy if exists "galerie_lecture_publique" on public.galerie;
create policy "galerie_lecture_publique" on public.galerie
  for select using (true);
drop policy if exists "galerie_gestion_admin" on public.galerie;
create policy "galerie_gestion_admin" on public.galerie
  for all using (public.is_admin()) with check (public.is_admin());

-- ----- admin : un compte connecté peut seulement vérifier SON appartenance -----
drop policy if exists "admin_lecture_soi" on public.admin;
create policy "admin_lecture_soi" on public.admin
  for select to authenticated using (user_id = auth.uid());

-- ============================================================================
-- 4. DONNÉES D'EXEMPLE (idempotent — peut être relancé sans doublons)
-- ============================================================================
-- Carte HOMME (prix terrain, fourchettes) — 11 prestations
insert into public.services (id, nom, description, categorie, prix, prix_max, duree_min, ordre) values
  ('a1000000-0000-4000-8000-000000000001','Coupe simple tondeuse','Coupe uniforme, sans dessin.','Homme',500,1000,30,1),
  ('a1000000-0000-4000-8000-000000000002','Coupe + Dégradé / Fade','Dégradé américain, taper bas.','Homme',1000,1500,30,2),
  ('a1000000-0000-4000-8000-000000000003','Coupe + Dessin / Motif','Lignes, étoile, vague à la lame.','Homme',1500,2500,45,3),
  ('a1000000-0000-4000-8000-000000000004','Rasage tête complète','À la tondeuse ou à la lame.','Homme',500,1000,20,4),
  ('a1000000-0000-4000-8000-000000000005','Taille de barbe','Nettoyage + contours nets.','Homme',500,1000,20,5),
  ('a1000000-0000-4000-8000-000000000006','Forfait Coupe + Barbe + Rasage visage','Le forfait complet du samedi.','Homme',2000,3000,60,6),
  ('a1000000-0000-4000-8000-000000000007','Shampoing + Soin homme','Nettoyage et soin du cuir chevelu.','Homme',500,1000,30,7),
  ('a1000000-0000-4000-8000-000000000008','Teinture / Coloration noire','Pour camoufler les cheveux blancs.','Homme',2000,5000,60,8),
  ('a1000000-0000-4000-8000-000000000009','Défrisage homme','Technique douce, produit compris.','Homme',3000,5000,90,9),
  ('a1000000-0000-4000-8000-000000000010','Coupe Enfant (−12 ans)','Moins de 12 ans, en douceur.','Homme',500,1000,25,10),
  ('a1000000-0000-4000-8000-000000000011','Locks / Dreadlocks','Reprise des racines, entretien.','Homme',5000,10000,90,11)
on conflict (nom) do nothing;

-- Carte FEMME — 12 prestations (à ajuster dans l'espace pro si besoin)
insert into public.services (id, nom, description, categorie, prix, prix_max, duree_min, ordre) values
  ('a2000000-0000-4000-8000-000000000001','Coupe simple femme','Coupe des pointes et mise en forme.','Femme',1000,2000,40,1),
  ('a2000000-0000-4000-8000-000000000002','Shampoing + Brushing','Lavage doux et mise en forme.','Femme',1000,2500,45,2),
  ('a2000000-0000-4000-8000-000000000003','Tresses simples (nattes, piqué-lâché)','Cheveux naturels, sans mèches.','Femme',1500,3000,90,3),
  ('a2000000-0000-4000-8000-000000000004','Tresses avec mèches (Fulani, box braids…)','Mèches comprises, toutes longueurs.','Femme',3000,8000,180,4),
  ('a2000000-0000-4000-8000-000000000005','Vanilles / Twists','Cheveux naturels ou mèches.','Femme',2500,5000,120,5),
  ('a2000000-0000-4000-8000-000000000006','Locks / Dreadlocks femme','Reprise des racines, entretien.','Femme',5000,10000,90,6),
  ('a2000000-0000-4000-8000-000000000007','Coloration complète','Produit compris, cuir chevelu protégé.','Femme',3000,6000,90,7),
  ('a2000000-0000-4000-8000-000000000008','Balayage / Mèches','Effet soleil sur cheveux texturés.','Femme',5000,12000,150,8),
  ('a2000000-0000-4000-8000-000000000009','Défrisage + soin','Technique douce, produit compris.','Femme',3000,5000,90,9),
  ('a2000000-0000-4000-8000-000000000010','Soin profond (vapeur)','Masque capillaire réparateur.','Femme',1500,3000,45,10),
  ('a2000000-0000-4000-8000-000000000011','Pose de perruque','Wig posée et coiffée.','Femme',2000,5000,60,11),
  ('a2000000-0000-4000-8000-000000000012','Coiffure mariage / événement','Essai inclus, à domicile possible.','Femme',5000,15000,90,12)
on conflict (nom) do nothing;

insert into public.coiffeurs (id, nom, specialites, experience_annees, bio, photo_url, ordre) values
  ('b0000000-0000-4000-8000-000000000001','Aïcha Koné','Tresses & coiffures protectrices',10,'Fondatrice du salon. Formée à Abidjan et Dakar, Aïcha fait des tresses un art : fulani, knotless, vanilles… toujours sans douleur et sans casse.','images/team-aicha.jpg',1),
  ('b0000000-0000-4000-8000-000000000002','Mariam Touré','Coloration & coupes femme',7,'Coloriste passionnée, Mariam maîtrise le balayage sur cheveux texturés et les coupes qui épousent votre visage. Son conseil : des couleurs qui vivent bien au soleil.','images/team-mariam.jpg',2),
  ('b0000000-0000-4000-8000-000000000003','Junior Kouassi','Barbier & coupes homme',6,'Précision au millimètre : dégradés, contours de barbe et finition à la serviette chaude. Junior transforme chaque coupe homme en signature.','images/team-junior.jpg',3)
on conflict do nothing;

insert into public.avis (id, auteur, note, commentaire, service_mentionne, approuve) values
  ('d0000000-0000-4000-8000-000000000001','Fatou D.',5,'Mes box braids ont tenu deux mois sans abîmer mes bords. Accueil adorable et salon impeccable. Je recommande à 100 % !','Tresses',true),
  ('d0000000-0000-4000-8000-000000000002','Koffi A.',5,'Le meilleur barbier d''Agboville. Rendez-vous pris en ligne en 2 minutes, zéro attente sur place.','Barbe',true),
  ('d0000000-0000-4000-8000-000000000003','Aminata S.',5,'Mon balayage caramel est magnifique et mes cheveux sont restés souples. Mariam est une vraie pro de la couleur.','Coloration',true),
  ('d0000000-0000-4000-8000-000000000004','Nadia B.',4,'Coiffée pour mon mariage : chignon superbe du matin au soir. Petit plus : l''équipe est venue à domicile.','Événements',true),
  ('d0000000-0000-4000-8000-000000000005','Serge K.',5,'Salon moderne, propre, ponctuel. La coupe enfant est un sans-faute avec mon fils de 6 ans.','Coupes',true),
  ('d0000000-0000-4000-8000-000000000006','Prisca Y.',5,'Le soin vapeur a littéralement réparé mes pointes. On sent que l''équipe aime les cheveux.','Soins',true)
on conflict do nothing;

insert into public.galerie (id, image_url, alt, categorie, ordre) values
  ('e0000000-0000-4000-8000-000000000001','images/galerie-coupe.jpg','Coupe courte effilée sur cheveux crépus','Coupes',1),
  ('e0000000-0000-4000-8000-000000000002','images/galerie-coloration.jpg','Balayage caramel sur cheveux longs','Coloration',2),
  ('e0000000-0000-4000-8000-000000000003','images/galerie-tresses.jpg','Tresses fulani ornées de perles dorées','Tresses',3),
  ('e0000000-0000-4000-8000-000000000004','images/galerie-mariage.jpg','Chignon de mariée avec accessoires dorés','Événements',4),
  ('e0000000-0000-4000-8000-000000000005','images/galerie-barbe.jpg','Taille de barbe aux contours nets','Barbe',5),
  ('e0000000-0000-4000-8000-000000000006','images/galerie-brushing.jpg','Brushing soyeux, brillance miroir','Soins',6),
  ('e0000000-0000-4000-8000-000000000007','images/salon.jpg','L''intérieur lumineux du salon Haut Niveau','Soins',7)
on conflict do nothing;

commit;

-- ============================================================================
-- 5. CRÉATION DU COMPTE ADMINISTRATEUR — volontairement HORS de ce script
--    (voir README.md § « Espace pro » : jamais de mot de passe, même haché,
--    dans un script versionné).
-- ============================================================================
