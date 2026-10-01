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

- **Accessibilité** (sans changement visuel) : vrais boutons, `aria-pressed` / `aria-expanded`, tableaux (calendrier, allergènes, classement) exposés comme tableaux aux lecteurs d'écran, fiche produit et feuille « Plus » en boîtes de dialogue (focus déplacé à l'ouverture et rendu à la fermeture, Échap ferme), `lang` de la page mis à jour en NL, anneau de focus visible au clavier.
- **Fiche produit** : la page derrière ne défile plus pendant que la fiche est ouverte.
- **Allergènes** : quand la matrice défile horizontalement, les colonnes figées restent opaques sur les lignes grisées (dans le prototype, les cellules transparaissaient sous les noms).
- **Onboarding** : le livret est intégré à l'application (pas de chargement réseau), la bannière d'accueil est donc toujours visible.
- **Robustesse** : un identifiant de produit inconnu (association, formule, FAQ) est ignoré au lieu de faire planter l'écran.
- **Illustrations** : les trois boissons (`img/d/`) étaient livrées en 8000×8000 px (≈ 256 Mo en mémoire chacune une fois décodées, affichées à 44 px) ; elles ont été ramenées à 560×560 comme les autres. Les illustrations non utilisées par l'application n'ont pas été copiées.

## À signaler au design

- **Graisses Gotham** : dans le design system, le poids 400 pointe vers `Gotham_Regular_New.otf` et le poids 500 vers `Gotham_Medium.otf`. À l'écran, le texte courant (400) paraît plus gras que les libellés en 500 (ex. « Délai » dans Services, tuiles de l'accueil). Le prototype a exactement le même rendu ; le mapping a été conservé tel quel pour rester fidèle, mais les fichiers de police méritent d'être vérifiés.
- **Petites largeurs** (< 640 px, hors cible tablette) : certaines grilles du prototype (associations, conservation, carte saison de l'accueil) débordent horizontalement, comme dans le prototype.
