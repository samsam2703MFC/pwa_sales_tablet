# Book vendeuses — L'Atelier By

Application tablette (PWA) pour les vendeuses des boutiques L'Atelier By : tout ce qu'il faut savoir au comptoir, en français et en néerlandais, même hors connexion.

- **Vente** : accueil du jour, gamme produits, calendrier des saisons, tableau allergènes interactif, vente additionnelle, FAQ clients, services, conservation/DLC, statistiques.
- **Formation** : onboarding vente en 7 modules (version courte ≤ 1 min et version complète).
- Bascule FR/NL instantanée, recherche globale (produits, ingrédients, allergènes, FAQ), fiche produit en panneau latéral (paysage) ou feuille montante (portrait).

Reconstruit au pixel près à partir du prototype HTML du handoff design (`Book Vendeuses.dc.html`).

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # build de production + service worker (dist/)
npm run preview    # sert dist/ comme en production
```

Vérifications :

```bash
npm run typecheck  # TypeScript
npm run lint       # oxlint
npm test           # tests unitaires (Vitest)
npm run test:e2e   # tests de bout en bout (Playwright)
```

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

## Hors connexion

L'application est une PWA installable : le service worker (Workbox via `vite-plugin-pwa`) met en cache l'application, les polices et toutes les illustrations au premier chargement. Les mises à jour s'installent automatiquement au chargement suivant.
