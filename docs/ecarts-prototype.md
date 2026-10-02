# Écarts avec le handoff design

L'application a d'abord reproduit le prototype `Book Vendeuses.dc.html` au pixel près (comparaisons automatiques prototype ↔ application en paysage 1280×800 et portrait 820×1180, FR et NL, écran par écran et état par état), puis elle a été adaptée aux demandes de la boutique (octobre 2026, voir la section du même nom). Ce document liste les points où le README du handoff et le prototype ne disent pas la même chose, les écarts volontaires et ces demandes.

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

## Demandes de la boutique (octobre 2026)

Écarts voulus par la boutique après les premiers essais en magasin : le prototype n'est plus la référence sur ces points.

- **Plus de colonne de navigation à gauche** : en paysage aussi, le menu est en bas de l'écran — la même barre du haut (logo, « Book vendeuses », pastille d'origine des données, FR/NL), la même barre d'onglets fixée en bas (Accueil, La gamme, Allergènes, FAQ, Plus) et la même feuille « Plus » (Vente / Formation) que le portrait du prototype. Seules la date à côté de la recherche (≥ 1000 px) et la fiche produit (panneau latéral ≥ 1000 px, feuille montante en dessous) dépendent encore de la largeur. Le contenu gagne les 256 px de la colonne (marges latérales de 36 px en paysage). La note « Données d'exemple — à remplacer… » du bas de la colonne disparaît avec elle : la pastille de la barre du haut la remplace dans les deux orientations. En recherche, l'onglet de la rubrique reste allumé (comportement des onglets du prototype ; la colonne, elle, n'allumait rien).
- **Accueil** : la bannière « Formation vente en 7 modules », « À préparer » (saison suivante) et « Les plus vendus » sont retirés. Deux blocs sont ajoutés : les **objectifs du magasin** (chiffre d'affaires et vente additionnelle en articles par ticket, semaine et mois, jauges ; venus du BO, masqués avec les données d'exemple) en haut, et le formulaire **« Remarque d'un client »** sous « Le client demande… ». Restent la salutation, « Le client demande… » et la ou les saisons du moment.
- **Saisons** : sous le calendrier (qui garde toutes les saisons), seules les saisons en cours ce mois-ci ont leur carte, une par ligne, pleine largeur (illustration à gauche, puis nom, dates, consigne et produits) ; le prototype montrait toutes les saisons en grille. Aucune saison en cours : « Aucune saison en ce moment. ».
- **Les bases** : nouvelle rubrique de Formation (avant Onboarding), absente du prototype : les gestes et les mots de chaque jour au comptoir, d'après le livret de formation vente ; tuile `img/onb/phone-orders.png` dans la feuille « Plus ».
- **Remarques des clients** : nouveau formulaire de l'accueil (type Compliment / Suggestion / Réclamation, texte, « Envoyer »), envoyé au BO ; hors connexion, la remarque attend sur la tablette et part au retour du réseau (voir le README).
- **Fiche produit, « Conservation »** : la colonne est toujours affichée à côté de la durée, avec « Non renseignée » / « Niet ingevuld » en gris quand le BO n'a pas de texte (le prototype et la première version la masquaient quand elle était vide).

## Écarts volontaires

- **Accessibilité** (sans changement visuel) : vrais boutons, `aria-pressed` / `aria-expanded`, tableaux (calendrier, allergènes, classement) exposés comme tableaux aux lecteurs d'écran, fiche produit et feuille « Plus » en boîtes de dialogue modales (focus déplacé à l'ouverture et rendu à la fermeture, Échap ferme, page derrière inerte), `lang` de la page mis à jour en NL, anneau de focus visible au clavier et jamais rogné par une zone défilante ; focus clavier jamais masqué par l'en-tête collant ni la barre d'onglets (scroll-padding, WCAG 2.2 SC 2.4.11) ; nombre de résultats de recherche annoncé ; après un changement de section déclenché depuis la page (tuiles de l'accueil), focus placé sur le titre de la nouvelle page.
- **Zones tactiles** : les petits boutons-texte (« Effacer » de la recherche et des allergènes, noms de produit de « Associations par produit » et de Conservation, segments FR/NL) ont une zone de toucher d'au moins 44 px, agrandie de façon invisible dans l'espace qui les entoure (rendu identique).
- **Images** : `img { -webkit-touch-callout: none; pointer-events: none }` — pas de menu « appui long » sur les illustrations sous iOS/Android (le prototype l'affiche) ; les touchers atteignent toujours le bouton parent.
- **Hauteurs d'écran** : la fiche produit en portrait (94vh) utilise `dvh`, `vh` restant la valeur de repli : dans un onglet de navigateur dont la barre d'outils se replie, elle ne passe plus sous la barre. Aucun changement dans l'application installée ni sur ordinateur.
- **Fiche produit, glissement** : le glissement sur l'en-tête ne ferme la fiche que s'il va surtout vers la droite (paysage) ou vers le bas (portrait) ; dans le prototype, un défilement en diagonale sur l'en-tête la fermait.
- **Mises à jour** : une nouvelle version ne recharge pas la page pendant qu'on s'en sert (le plugin PWA rechargerait aussitôt) ; voir le README.
- **Fiche produit** : la page derrière ne défile plus pendant que la fiche est ouverte.
- **Allergènes** : quand la matrice défile horizontalement, les colonnes figées restent opaques sur les lignes grisées (dans le prototype, les cellules transparaissaient sous les noms).
- **Onboarding** : le livret est intégré à l'application (pas de chargement réseau).
- **Robustesse** : un identifiant inconnu (produit d'une association, d'une formule ou d'une FAQ, code allergène, saison) est ignoré au lieu de faire planter l'écran ; les tests (`src/data/validate.ts`) et la console en développement signalent ces identifiants pour qu'ils soient corrigés dans les données.
- **Illustrations** : les trois boissons (`img/d/`) étaient livrées en 8000×8000 px (≈ 256 Mo en mémoire chacune une fois décodées, affichées à 44 px) ; elles ont été ramenées à 560×560 comme les autres. Les illustrations non utilisées par l'application n'ont pas été copiées.

## Données du back-office (écarts volontaires)

Avec les données d'exemple, et en dehors des demandes de la boutique ci-dessus, l'application reste identique au prototype, à deux ajouts près : la pastille « Données d'exemple » de la barre du haut et le bandeau « Données d'exemple » des Statistiques. Les autres différences n'apparaissent qu'avec un book du BO, souvent incomplet en phase 1.

- **Origine des données** : une petite pastille après « Book vendeuses » dans la barre du haut (absente du prototype), dans les deux orientations : « BO · <magasin> · <date du book> », « Hors ligne · données du … » ou « Données d'exemple ». Elle remplace la note du bas de la colonne du prototype (« Données d'exemple — à remplacer… »), partie avec la colonne.
- **Statistiques** : bandeau « Données d'exemple » sous le titre (les statistiques ne viennent pas encore du BO) ; la liste « Les plus vendus » est masquée quand aucun de ses produits n'existe dans le book du BO.
- **Allergènes non vérifiés** (`alKnown: false`) : jamais « OK » ni « sans ». Dans le tableau, pastille « À vérifier » / « Nakijken », « ? » dans les cases au lieu de cases vides, troisième compteur « à vérifier sur l'étiquette » et entrée de légende ; sur les cartes de la gamme, étiquette « À vérifier sur l'étiquette » à la place des codes ; dans la fiche, encadré « À vérifier sur l'étiquette » avec le texte brut du BO à la place des 14 tuiles (seules les tuiles « Contient » / « Traces » connues restent). Traces non renseignées (`trKnown: false`) : au mieux « Traces » dans le tableau, et une phrase sous la grille de la fiche.
- **Blocs vides masqués** : dans la fiche, « À dire au client », la description, « Ingrédients », la ligne prix/unité et « Proposez aussi » (phrase et puces séparément) — « Conservation » reste affichée (« Non renseignée », voir les demandes de la boutique) ; à l'accueil, la consigne et les puces d'une saison ; dans Saisons, la consigne, les puces et le calendrier sans saison ; dans Vendre plus, chaque section vide, et les produits sans association ni phrase ; dans Conservation, une catégorie sans produit (le prototype affichait son titre seul ; l'exemple n'en a pas).
- **Textes** : un texte NL vide est remplacé par le FR (le BO n'a pas encore de traductions).
- **Photos** : un produit ou une saison sans image reçoit une illustration neutre (`img/placeholder.svg`, cloche de pâtissier) ; une image qui ne se charge pas (photo supprimée, pas encore téléchargée hors connexion) est remplacée par la même illustration au lieu de l'icône d'image cassée.
- **Formules, produits liés de la FAQ** : ceux qui citent des produits d'exemple sont retirés avec un book du BO (une formule n'est gardée que si tous ses produits existent).

## À signaler au design

- **Graisses Gotham** : dans le design system, le poids 400 pointe vers `Gotham_Regular_New.otf` et le poids 500 vers `Gotham_Medium.otf`. À l'écran, le texte courant (400) paraît plus gras que les libellés en 500 (ex. « Délai » dans Services, tuiles de l'accueil). Le prototype a exactement le même rendu ; le mapping a été conservé tel quel pour rester fidèle, mais les fichiers de police méritent d'être vérifiés.
- **Navigation latérale** : elle ne tenait pas en hauteur sur iPad en paysage (≈ 720–810 px) ; réglé par la demande de la boutique d'octobre 2026 (plus de colonne, barre d'onglets en bas dans les deux orientations).
- **Petites largeurs** (< 640 px, hors cible tablette) : certaines grilles du prototype (associations, conservation, carte saison de l'accueil) débordent horizontalement, comme dans le prototype.
