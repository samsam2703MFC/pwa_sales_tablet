# Book vendeuses — L'Atelier By

Application tablette (PWA) pour les vendeuses des boutiques L'Atelier By : tout ce qu'il faut savoir au comptoir, en français et en néerlandais, même hors connexion.

- **Vente** : accueil du jour, gamme produits, calendrier des saisons, tableau allergènes interactif, vente additionnelle, FAQ clients, services, conservation/DLC, statistiques.
- **Formation** : onboarding vente en 7 modules (version courte ≤ 1 min et version complète).
- Bascule FR/NL instantanée, recherche globale (produits, ingrédients, allergènes, FAQ), fiche produit en panneau latéral (paysage) ou feuille montante (portrait).

Reconstruit au pixel près à partir du prototype HTML du handoff design (`Book Vendeuses.dc.html`). Les écarts entre le README du handoff et le prototype, et les quelques écarts volontaires, sont listés dans [docs/ecarts-prototype.md](docs/ecarts-prototype.md).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de production + service worker (dist/)
npm run preview    # sert dist/ comme en production
```

Déploiement : `dist/` se copie tel quel dans n'importe quel dossier d'un serveur statique (à la racine ou par exemple sous `https://intranet/book-vendeuses/`), toutes ses adresses étant relatives. Ouvrir l'adresse du dossier avec la barre oblique finale (`…/book-vendeuses/`).

### Dans le back-office (BO)

En production, l'application est servie par le BO (Cockpit) depuis son dossier `public/tablette/` : `http://185.180.206.46/consulant_bo/tablette/` (barre oblique finale comprise). Ce dossier est l'identité de l'application installée : le déplacer installerait une seconde application sur les tablettes.

```bash
npm ci && npm run build                     # après la vérification complète (ci-dessous)
rm -rf ../consultant_bo/public/tablette && cp -r dist ../consultant_bo/public/tablette
git rev-parse HEAD > ../consultant_bo/public/tablette/VERSION
```

L'application trouve le BO à côté de son propre dossier, sans configuration : l'API est `../api/cockpit` (→ `/consulant_bo/api/cockpit`) et les photos `uploads/…` du BO se lisent sous `../` (→ `/consulant_bo/uploads/…`). Le même `dist/` fonctionne donc à la racine d'un domaine comme dans un sous-dossier. `VITE_API_BASE` (au build) force une autre racine d'API.

**https obligatoire pour le hors-connexion et l'installation** : le service worker n'existe qu'en https (ou sur `localhost`). En http, l'application fonctionne normalement en ligne (données du BO comprises), mais rien n'est gardé sur la tablette et elle ne s'installe pas.

En développement, `npm run dev` relaie `/api` et `/uploads` vers un BO lancé sur le port 8080 (`php -S 127.0.0.1:8080 -t public public/router.php` dans `consultant_bo`) ; sans BO, l'application affiche ses données d'exemple.

Vérifications :

```bash
npm run typecheck  # TypeScript
npm run lint       # oxlint
npm test           # tests unitaires (Vitest)
npm run test:e2e   # tests de bout en bout (Playwright)
```

`npm run test:e2e` construit l'application puis la sert avec `vite preview` sur le port 4173 (échoue tout de suite si le port est déjà pris, par exemple par `npm run preview`). `E2E_SKIP_BUILD=1 npm run test:e2e` réutilise le `dist/` existant. Les tests tournent en paysage (1280×800) et en portrait (820×1180), y compris le fonctionnement hors connexion et les données du BO (BO simulé : `e2e/bo.spec.ts`).

Les icônes de l'application (`public/icons/`, `public/favicon.ico`) sont générées par `npm run icons`.

## Configuration

| Réglage | Build (`.env`) | Runtime (URL) | Défaut |
| --- | --- | --- | --- |
| Langue initiale | `VITE_DEFAULT_LANG=NL` | `?lang=nl` | FR |
| Afficher les prix | `VITE_SHOW_PRICES=false` | `?prices=0` | oui |
| Date du jour (démo, captures) | — | `?date=2026-12-15` | horloge de l'appareil |
| Magasin (book envoyé par le BO) | — | `?shop=4` (identifiant `shops.id` du BO) | book réseau |
| Racine de l'API du BO | `VITE_API_BASE=https://…/api/cockpit` | — | `../api/cockpit` à côté du dossier de l'application |

Deux choses seulement sont mémorisées sur l'appareil (localStorage) : le magasin (`bv.shop`) — l'application installée s'ouvre sans paramètre, il faut donc qu'elle se souvienne du magasin de son lien `?shop=4` ; `?shop=` (vide) l'oublie — et le dernier book reçu du BO (`bv.book`, voir « Données »). Aucun état de navigation n'est gardé : chaque ouverture repart de l'accueil.

## Mise en page

- **≥ 1000 px (paysage)** : colonne de navigation à gauche (256 px), contenu à droite.
- **< 1000 px (portrait)** : en-tête avec logo et bascule FR/NL, barre d'onglets en bas (Accueil, Gamme, Allergènes, FAQ, Plus).

## Structure

```
src/
  data/          données d'exemple + types ; book du BO (remote.ts : contrôle, fusion), photos hors ligne (warmPhotos.ts)
  content/       livret de formation complet (FR/NL, Markdown)
  lib/           i18n, formats (prix, montants, DLC), date, configuration, catalogue, adresses du BO (api.ts)
  state/         état global de l'application (vue, langue, recherche, filtres, fiche…)
  components/    composants partagés (carte produit, puce produit, chips, titres)
  shell/         navigation : colonne latérale, en-tête, recherche, barre d'onglets, feuille « Plus »
  views/         un dossier par écran (logique pure dans *.logic.ts + tests)
  drawer/        fiche produit
  pwa/           enregistrement du service worker
public/img/      illustrations au trait (design system L'Atelier By)
```

## Données

Au lancement, l'application affiche tout de suite le dernier book reçu du BO pour ce lien, gardé sur l'appareil (localStorage `bv.book`, environ 100 Ko), puis redemande le book en arrière-plan : le BO met souvent 2 à 6 s à répondre. La toute première fois (rien de gardé), elle attend le BO jusqu'à 15 s (« Book vendeuses… » à l'écran) avant de démarrer sur les données d'exemple. Le book vient de `GET <API>/tablette/book?shop=<id>` ; l'application le contrôle (structure, schéma 1 ; les lignes invalides sont écartées) et le fusionne avec le book d'exemple (`src/data/remote.ts`) :

- **du BO** : produits (noms, prix, unités, photos, best-sellers, régime, conservation, DLC), catégories et saisons ;
- **de l'exemple** (`src/data/book.ts`) : les 14 allergènes réglementaires, la FAQ, les services, les bons réflexes, l'onboarding et les statistiques (bandeau « Données d'exemple ») ; les formules, les produits liés de la FAQ et les classements qui citent des produits d'exemple disparaissent.

Les blocs vides (argumentaire, description, ingrédients, conservation, vente additionnelle, formules…) sont masqués, un texte NL vide est remplacé par le FR et un produit sans photo reçoit une illustration neutre. **Allergènes** : un produit dont le BO ne garantit pas la liste (`alKnown: false`, toujours le cas tant que le format des allergènes du BO n'est pas vérifié) n'est jamais affiché comme compatible ni « sans » : « À vérifier sur l'étiquette » dans le tableau, sur la carte et dans la fiche (avec le texte brut du BO) ; des traces non renseignées (`trKnown: false`) donnent au mieux « Traces ».

L'origine des données est toujours affichée : note de la colonne (paysage) ou pastille de l'en-tête (portrait) — « BO · <magasin> · <date> », « Hors ligne · données du … » ou « Données d'exemple ». Si le BO ne répond pas (hors ligne, erreur, réponse autre que du JSON), l'application démarre sur le dernier book reçu s'il est gardé sur la tablette (« Hors ligne · données du … »), sinon sur les données d'exemple (c'est le cas sous `vite preview` et dans les tests de bout en bout, sans BO). Elle redemande le book juste après le démarrage puis au plus une fois par heure tant qu'elle est ouverte ; une nouvelle version est gardée sur l'appareil et s'applique en rechargeant la page quand la tablette n'est pas utilisée, jamais pendant une vente.

Les données de `src/data/book.ts` sont des **exemples** à remplacer par les fiches produit officielles (produits, prix, allergènes, FAQ) et par un export caisse (statistiques). Tous les textes sont des paires `[FR, NL]` ; le modèle est typé dans `src/data/types.ts`.

Les identifiants qui relient les fiches entre elles (allergènes, catégorie, saison, associations, FAQ, formules, classement) sont vérifiés par `src/data/validate.ts` : `npm test` échoue et la console de développement affiche la liste si l'un d'eux ne correspond à rien. Les tests de logique tournent sur un petit book de test (`src/test/fixtures.ts`) et ne dépendent pas des données ; seuls les blocs « sample data (prototype golden values) » et les tests des écrans (`*View.test.tsx`) vérifient les valeurs d'exemple : quand `book.ts` est remplacé, il faut les mettre à jour ou les supprimer.

Les illustrations sont dans `public/img/` (PNG transparents au trait, environ 560 px, affichés en `mix-blend-mode: multiply`). Seules les illustrations utilisées par l'application y sont copiées ; les autres restent dans le handoff design.

## Hors connexion

L'application est une PWA installable : le service worker (Workbox via `vite-plugin-pwa`) met en cache l'application, les polices et toutes les illustrations au premier chargement. Les mises à jour se téléchargent en arrière-plan (au lancement, puis au plus une fois par heure, l'application ouverte ou au réveil de la tablette) ; la page se recharge sur la nouvelle version dès que la tablette est verrouillée ou inutilisée depuis deux minutes (tout de suite si personne n'y a encore touché), jamais pendant une manipulation.

Données du BO : le dernier book reçu est gardé (cache `bv-book`, le réseau d'abord, le cache si le BO ne répond pas en 30 s ou renvoie une erreur) et les photos des produits aussi (cache `bv-photos`, 600 photos, 60 jours) : celles affichées, et toutes les autres, téléchargées une à une en arrière-plan quand la tablette est en ligne et inactive. Tout cela suppose https (voir « Dans le back-office »).
