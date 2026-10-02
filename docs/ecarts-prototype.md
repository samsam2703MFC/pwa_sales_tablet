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

## Données du back-office (écarts volontaires)

Avec les données d'exemple, l'application reste identique au prototype (comparaisons pixel à pixel), à deux ajouts près : la pastille « Données d'exemple » de l'en-tête en portrait et le bandeau « Données d'exemple » des Statistiques. Les autres différences n'apparaissent qu'avec un book du BO, souvent incomplet en phase 1.

- **Origine des données** : en paysage, la note du bas de la colonne (« Données d'exemple — à remplacer… » dans le prototype) devient « BO · <magasin> · <date du book> » ou « Hors ligne · données du … » ; en portrait, une petite pastille après « Book vendeuses » dans l'en-tête (absente du prototype) dit la même chose, ou « Données d'exemple ».
- **Statistiques** : bandeau « Données d'exemple » sous le titre (les statistiques ne viennent pas encore du BO) ; la liste « Les plus vendus » est masquée quand aucun de ses produits n'existe dans le book du BO.
- **Allergènes non vérifiés** (`alKnown: false`) : jamais « OK » ni « sans ». Dans le tableau, pastille « À vérifier » / « Nakijken », « ? » dans les cases au lieu de cases vides, troisième compteur « à vérifier sur l'étiquette » et entrée de légende ; sur les cartes de la gamme, étiquette « À vérifier sur l'étiquette » à la place des codes ; dans la fiche, encadré « À vérifier sur l'étiquette » avec le texte brut du BO à la place des 14 tuiles (seules les tuiles « Contient » / « Traces » connues restent). Traces non renseignées (`trKnown: false`) : au mieux « Traces » dans le tableau, et une phrase sous la grille de la fiche.
- **Blocs vides masqués** : dans la fiche, « À dire au client », la description, « Ingrédients », « Conservation », la ligne prix/unité et « Proposez aussi » (phrase et puces séparément) ; à l'accueil, la consigne et les puces d'une saison, « À préparer » sans saison, « Les plus vendus » sans best-seller ; dans Saisons, la consigne, les puces et le calendrier sans saison ; dans Vendre plus, chaque section vide, et les produits sans association ni phrase ; dans Conservation, une catégorie sans produit (le prototype affichait son titre seul ; l'exemple n'en a pas).
- **Textes** : un texte NL vide est remplacé par le FR (le BO n'a pas encore de traductions).
- **Photos** : un produit ou une saison sans image reçoit une illustration neutre (`img/placeholder.svg`, cloche de pâtissier) ; une image qui ne se charge pas (photo supprimée, pas encore téléchargée hors connexion) est remplacée par la même illustration au lieu de l'icône d'image cassée.
- **Formules, produits liés de la FAQ** : ceux qui citent des produits d'exemple sont retirés avec un book du BO (une formule n'est gardée que si tous ses produits existent).

## À signaler au design

- **Graisses Gotham** : dans le design system, le poids 400 pointe vers `Gotham_Regular_New.otf` et le poids 500 vers `Gotham_Medium.otf`. À l'écran, le texte courant (400) paraît plus gras que les libellés en 500 (ex. « Délai » dans Services, tuiles de l'accueil). Le prototype a exactement le même rendu ; le mapping a été conservé tel quel pour rester fidèle, mais les fichiers de police méritent d'être vérifiés.
- **Navigation latérale** : elle ne tient pas en hauteur sur iPad en paysage (≈ 720–810 px) : envisager une navigation plus dense.
- **Petites largeurs** (< 640 px, hors cible tablette) : certaines grilles du prototype (associations, conservation, carte saison de l'accueil) débordent horizontalement, comme dans le prototype.
