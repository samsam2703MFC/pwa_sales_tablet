# Écarts avec le handoff design

L'application reproduit le prototype `Book Vendeuses.dc.html` au pixel près (comparaisons automatiques prototype ↔ application en paysage 1280×800 et portrait 820×1180, FR et NL, écran par écran et état par état). Ce document liste les points où le README du handoff et le prototype ne disent pas la même chose, et les quelques écarts volontaires.

## README ≠ prototype : le prototype a été suivi

Le prototype rendu est la référence visuelle ; le README du handoff en est une description, parfois approximative.

| Sujet | README | Prototype (retenu) |
| --- | --- | --- |
| Sous-titre « Book vendeuses » | 14 px | 16 px (colonne) / 15 px (en-tête portrait) |
| Libellés de la barre d'onglets | 12 px | 13 px |
| Date dans l'en-tête | 13 px | 15 px |
| Recherche | dans la langue affichée | dans les deux langues (FR et NL) |
| Cartes des résultats de recherche | identiques à la gamme | sans badge VEGAN/VÉGÉ ni codes allergènes |
| Chips de filtre, puces-produits des saisons | 44 px | 52 px |
| Retour tactile `scale(0.97)` | toutes les cartes et boutons | cartes produit, tuiles « Le client demande… » et « Plus », bannière onboarding, modules |
| FAQ | aucune réponse ouverte au départ (implicite) | la première question est ouverte |
| Bouton « Fermer » de la fiche | 44 px | 52 px |
| Unité du prix dans la fiche | 13 px | 14 px |
| Titre d'un module onboarding | 34 px | 32 px |
| Texte « La règle » | 24 px | 20 px |
| Pied de module | « Module précédent / suivant » | libellé du module voisin (« ← Ouverture », « Module 2 → ») |
| Sourcils de la liste des modules | « Module N » | libellé du livret (« Ouverture », « Module 1 »…) |
| Version complète d'un module | encadré « Ce que ça fait progresser » | jamais visible : il suit toujours la section « Exercice », retirée |

## Écarts volontaires

- **Accessibilité** (sans changement visuel) : vrais boutons, `aria-pressed` / `aria-expanded`, tableaux (calendrier, allergènes, classement) exposés comme tableaux aux lecteurs d'écran, fiche produit et feuille « Plus » en boîtes de dialogue modales (focus déplacé à l'ouverture et rendu à la fermeture, Échap ferme, page derrière inerte), `lang` de la page mis à jour en NL, anneau de focus visible au clavier et jamais rogné par une zone défilante ; focus clavier jamais masqué par l'en-tête collant ni la barre d'onglets (scroll-padding, WCAG 2.2 SC 2.4.11) ; nombre de résultats de recherche annoncé ; après un changement de section déclenché depuis la page (tuiles de l'accueil, bannière onboarding), focus placé sur le titre de la nouvelle page.
- **Zones tactiles** : les petits boutons-texte (« Effacer » de la recherche et des allergènes, noms de produit de « Associations par produit » et de Conservation, segments FR/NL) ont une zone de toucher d'au moins 44 px, agrandie de façon invisible dans l'espace qui les entoure (rendu identique).
- **Images** : `img { -webkit-touch-callout: none; pointer-events: none }` — pas de menu « appui long » sur les illustrations sous iOS/Android (le prototype l'affiche) ; les touchers atteignent toujours le bouton parent.
- **Hauteurs d'écran** : la colonne de navigation (100vh) et la fiche produit en portrait (94vh) utilisent `dvh`, `vh` restant la valeur de repli : dans un onglet de navigateur dont la barre d'outils se replie, elles ne passent plus sous la barre. Aucun changement dans l'application installée ni sur ordinateur.
- **Colonne de navigation (écrans tactiles)** : sur tablette en paysage, la liste ne tient pas en hauteur (Onboarding masqué dès 800 px, Statistiques aussi vers 720–750 px) et les barres de défilement tactiles sont invisibles au repos ; un fondu en bas de la liste (`@media (pointer: coarse)`, src/shell/Sidebar.module.css) indique qu'elle défile (rien ne change à la souris).
- **Fiche produit, glissement** : le glissement sur l'en-tête ne ferme la fiche que s'il va surtout vers la droite (paysage) ou vers le bas (portrait) ; dans le prototype, un défilement en diagonale sur l'en-tête la fermait.
- **Mises à jour** : une nouvelle version ne recharge pas la page pendant qu'on s'en sert (le plugin PWA rechargerait aussitôt) ; voir le README.
- **Fiche produit** : la page derrière ne défile plus pendant que la fiche est ouverte.
- **Allergènes** : quand la matrice défile horizontalement, les colonnes figées restent opaques sur les lignes grisées (dans le prototype, les cellules transparaissaient sous les noms).
- **Onboarding** : le livret est intégré à l'application (pas de chargement réseau), la bannière d'accueil est donc toujours visible.
- **Robustesse** : un identifiant inconnu (produit d'une association, d'une formule ou d'une FAQ, code allergène, saison) est ignoré au lieu de faire planter l'écran ; les tests (`src/data/validate.ts`) et la console en développement signalent ces identifiants pour qu'ils soient corrigés dans les données.
- **Illustrations** : les trois boissons (`img/d/`) étaient livrées en 8000×8000 px (≈ 256 Mo en mémoire chacune une fois décodées, affichées à 44 px) ; elles ont été ramenées à 560×560 comme les autres. Les illustrations non utilisées par l'application n'ont pas été copiées.

## À signaler au design

- **Graisses Gotham** : dans le design system, le poids 400 pointe vers `Gotham_Regular_New.otf` et le poids 500 vers `Gotham_Medium.otf`. À l'écran, le texte courant (400) paraît plus gras que les libellés en 500 (ex. « Délai » dans Services, tuiles de l'accueil). Le prototype a exactement le même rendu ; le mapping a été conservé tel quel pour rester fidèle, mais les fichiers de police méritent d'être vérifiés.
- **Navigation latérale** : elle ne tient pas en hauteur sur iPad en paysage (≈ 720–810 px) : envisager une navigation plus dense.
- **Petites largeurs** (< 640 px, hors cible tablette) : certaines grilles du prototype (associations, conservation, carte saison de l'accueil) débordent horizontalement, comme dans le prototype.
