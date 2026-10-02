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

Vérifications :

```bash
npm run typecheck  # TypeScript
npm run lint       # oxlint
npm test           # tests unitaires (Vitest)
npm run test:e2e   # tests de bout en bout (Playwright)
```

`npm run test:e2e` construit l'application puis la sert avec `vite preview` sur le port 4173 (échoue tout de suite si le port est déjà pris, par exemple par `npm run preview`). `E2E_SKIP_BUILD=1 npm run test:e2e` réutilise le `dist/` existant. Les tests tournent en paysage (1280×800) et en portrait (820×1180), y compris le fonctionnement hors connexion.

Les icônes de l'application (`public/icons/`, `public/favicon.ico`) sont générées par `npm run icons`.

## Configuration

| Réglage | Build (`.env`) | Runtime (URL) | Défaut |
| --- | --- | --- | --- |
| Langue initiale | `VITE_DEFAULT_LANG=NL` | `?lang=nl` | FR |
| Afficher les prix | `VITE_SHOW_PRICES=false` | `?prices=0` | oui |
| Date du jour (démo, captures) | — | `?date=2026-12-15` | horloge de l'appareil |

Aucun état n'est mémorisé sur l'appareil (pas de localStorage) : chaque ouverture repart de l'accueil.

## Mise en page

- **≥ 1000 px (paysage)** : colonne de navigation à gauche (256 px), contenu à droite.
- **< 1000 px (portrait)** : en-tête avec logo et bascule FR/NL, barre d'onglets en bas (Accueil, Gamme, Allergènes, FAQ, Plus).

## Structure

```
src/
  data/          données (produits, allergènes, saisons, FAQ, services, formules, stats) + types
  content/       livret de formation complet (FR/NL, Markdown)
  lib/           i18n, formats (prix, montants, DLC), date, configuration, catalogue
  state/         état global de l'application (vue, langue, recherche, filtres, fiche…)
  components/    composants partagés (carte produit, puce produit, chips, titres)
  shell/         navigation : colonne latérale, en-tête, recherche, barre d'onglets, feuille « Plus »
  views/         un dossier par écran (logique pure dans *.logic.ts + tests)
  drawer/        fiche produit
  pwa/           enregistrement du service worker
public/img/      illustrations au trait (design system L'Atelier By)
```

## Données

Les données de `src/data/book.ts` sont des **exemples** à remplacer par les fiches produit officielles (produits, prix, allergènes, FAQ) et par un export caisse (statistiques). Tous les textes sont des paires `[FR, NL]` ; le modèle est typé dans `src/data/types.ts`.

Les identifiants qui relient les fiches entre elles (allergènes, catégorie, saison, associations, FAQ, formules, classement) sont vérifiés par `src/data/validate.ts` : `npm test` échoue et la console de développement affiche la liste si l'un d'eux ne correspond à rien. Les tests de logique tournent sur un petit book de test (`src/test/fixtures.ts`) et ne dépendent pas des données ; seuls les blocs « sample data (prototype golden values) » et les tests des écrans (`*View.test.tsx`) vérifient les valeurs d'exemple : quand `book.ts` est remplacé, il faut les mettre à jour ou les supprimer.

Les illustrations sont dans `public/img/` (PNG transparents au trait, environ 560 px, affichés en `mix-blend-mode: multiply`). Seules les illustrations utilisées par l'application y sont copiées ; les autres restent dans le handoff design.

## Hors connexion

L'application est une PWA installable : le service worker (Workbox via `vite-plugin-pwa`) met en cache l'application, les polices et toutes les illustrations au premier chargement. Les mises à jour se téléchargent en arrière-plan (au lancement, puis au plus une fois par heure, l'application ouverte ou au réveil de la tablette) ; la page se recharge sur la nouvelle version dès que la tablette est verrouillée ou inutilisée depuis deux minutes (tout de suite si personne n'y a encore touché), jamais pendant une manipulation.
