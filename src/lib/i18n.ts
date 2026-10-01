import type { Lang, Period } from '../data/types';

/** Interface labels, [FR, NL]. Copied verbatim from the prototype. */
const LABELS = [
  {
    book: 'Book vendeuses', search: 'Rechercher un produit, un ingrédient, une question…', clear: 'Effacer',
    sample: "Données d'exemple — à remplacer par les fiches produit officielles.", hello: 'Bonjour !',
    homeIntro: "Ce qu'il faut savoir aujourd'hui en boutique.", now: 'En ce moment', next: 'À préparer', best: 'Les plus vendus', tipL: 'Consigne',
    top: 'Top vente', vege: 'Végétarien', vegeS: 'VÉGÉ', gammeTitle: 'La gamme', all: 'Tout',
    say: 'À dire au client', ingr: 'Ingrédients', alg: 'Allergènes', contains: 'Contient', traces: 'Traces possibles', trS: 'Traces',
    keep: 'Conservation', dlc: 'Durée', also: 'Proposez aussi', allYear: "Toute l'année", close: 'Fermer',
    alTitle: 'Allergènes', alIntro: 'Le client est allergique à :', alReset: 'Effacer', alOk: 'produits compatibles', alWarn: 'avec traces possibles',
    alNote: "En cas d'allergie sévère : montrer la fiche, signaler les traces possibles et laisser le client décider. Ne jamais garantir qu'un produit est « sans ». En cas de doute, appeler la responsable.",
    calTitle: 'Saisons', ventesTitle: 'Vendre plus', combos: 'Formules', reflexes: 'Les bons réflexes', pairs: 'Associations par produit',
    faqTitle: 'Questions fréquentes', selFaqT: 'Ce que les clients demandent', linkedP: 'Produits concernés', svcTitle: 'Services', how: 'Comment ça marche', delay: 'Délai', consTitle: 'Conservation & DLC',
    asks: 'Le client demande…', results: 'Résultats pour', noRes: 'Aucun résultat.', questions: 'Questions',
    d0: 'Immédiat', d1: 'Jour même', dn: 'jours',
  },
  {
    book: 'Verkoopsboek', search: 'Zoek een product, ingrediënt, vraag…', clear: 'Wissen',
    sample: 'Voorbeeldgegevens — te vervangen door de officiële productfiches.', hello: 'Goedendag!',
    homeIntro: 'Wat u vandaag moet weten in de winkel.', now: 'Nu', next: 'Voor te bereiden', best: 'Topverkopers', tipL: 'Richtlijn',
    top: 'Topper', vege: 'Vegetarisch', vegeS: 'VEGGIE', gammeTitle: 'Het assortiment', all: 'Alles',
    say: 'Tegen de klant', ingr: 'Ingrediënten', alg: 'Allergenen', contains: 'Bevat', traces: 'Mogelijke sporen', trS: 'Sporen',
    keep: 'Bewaring', dlc: 'Houdbaar', also: 'Stel ook voor', allYear: 'Het hele jaar', close: 'Sluiten',
    alTitle: 'Allergenen', alIntro: 'De klant is allergisch voor:', alReset: 'Wissen', alOk: 'geschikte producten', alWarn: 'met mogelijke sporen',
    alNote: 'Bij een ernstige allergie: toon de fiche, meld mogelijke sporen en laat de klant beslissen. Nooit garanderen dat een product "vrij van" is. Bij twijfel de verantwoordelijke bellen.',
    calTitle: 'Seizoenen', ventesTitle: 'Meer verkopen', combos: 'Formules', reflexes: 'De juiste reflexen', pairs: 'Combinaties per product',
    faqTitle: 'Veelgestelde vragen', selFaqT: 'Wat klanten vragen', linkedP: 'Betrokken producten', svcTitle: 'Diensten', how: 'Hoe werkt het', delay: 'Termijn', consTitle: 'Bewaring & houdbaarheid',
    asks: 'De klant vraagt…', results: 'Resultaten voor', noRes: 'Geen resultaten.', questions: 'Vragen',
    d0: 'Onmiddellijk', d1: 'Dezelfde dag', dn: 'dagen',
  },
] as const;

export type Labels = { [K in keyof (typeof LABELS)[0]]: string };
export const labels = (lang: Lang): Labels => LABELS[lang];

/** Statistics labels. */
const STATS_LABELS = [
  {
    ca: "Chiffre d'affaires", tk: 'Tickets', pan: 'Panier moyen', cross: 'Vente additionnelle', sais: 'Produits de saison', obj: 'Objectif', team: 'Équipe',
    per: [['day', "Aujourd'hui"], ['week', 'Cette semaine'], ['month', 'Ce mois']] as [Period, string][],
    rank: "Classement de l'équipe", top: 'Les plus vendus', days: '7 derniers jours', reached: 'Atteint', toGo: 'À atteindre', units: 'pcs', seller: 'Vendeuse',
    title: 'Statistiques', note: 'Chiffres d’exemple — à connecter à la caisse.',
  },
  {
    ca: 'Omzet', tk: 'Tickets', pan: 'Gemiddeld ticket', cross: 'Bijverkoop', sais: 'Seizoensproducten', obj: 'Doel', team: 'Team',
    per: [['day', 'Vandaag'], ['week', 'Deze week'], ['month', 'Deze maand']] as [Period, string][],
    rank: 'Teamoverzicht', top: 'Meest verkocht', days: '7 laatste dagen', reached: 'Gehaald', toGo: 'Nog te gaan', units: 'st.', seller: 'Verkoopster',
    title: 'Statistieken', note: 'Voorbeeldcijfers — te koppelen aan de kassa.',
  },
];
export type StatsLabels = (typeof STATS_LABELS)[0];
export const statsLabels = (lang: Lang): StatsLabels => STATS_LABELS[lang];

/** Onboarding labels. */
const ONB_LABELS = [
  {
    rule: 'La règle', scripts: 'À dire à voix haute', exo: 'Exercice', readMin: '1 min de lecture', full: 'Lire le module complet', short: 'Revenir à la version courte',
    fullTag: 'Version complète', title: 'Onboarding', intro: 'Votre formation vente, module par module. À suivre dans l’ordre, en réunion d’équipe.',
    back: 'Tous les modules', prev: 'Précédent', next: 'Suivant', bad: 'À éviter', good: 'À dire',
    homeT: (n: number) => `Formation vente en ${n} modules · 1 min de lecture par module`,
  },
  {
    rule: 'De regel', scripts: 'Luidop te zeggen', exo: 'Oefening', readMin: '1 min lezen', full: 'Volledige module lezen', short: 'Terug naar de korte versie',
    fullTag: 'Volledige versie', title: 'Onboarding', intro: 'Uw verkoopopleiding, module per module. Volg ze in volgorde, tijdens een teamvergadering.',
    back: 'Alle modules', prev: 'Vorige', next: 'Volgende', bad: 'Niet zo', good: 'Wel zo',
    homeT: (n: number) => `Verkoopopleiding in ${n} modules · 1 min lezen per module`,
  },
];
export type OnbLabels = (typeof ONB_LABELS)[0];
export const onbLabels = (lang: Lang): OnbLabels => ONB_LABELS[lang];

export type View = 'home' | 'gamme' | 'saisons' | 'al' | 'ventes' | 'faq' | 'svc' | 'cons' | 'stats' | 'onb';
export type NavGroup = 'v' | 'f';

/** Navigation entries: [id, FR, NL, group]. Order = sidebar order. */
export const NAV: readonly (readonly [View, string, string, NavGroup])[] = [
  ['home', 'Accueil', 'Start', 'v'],
  ['gamme', 'La gamme', 'Assortiment', 'v'],
  ['saisons', 'Saisons', 'Seizoenen', 'v'],
  ['al', 'Allergènes', 'Allergenen', 'v'],
  ['ventes', 'Vendre plus', 'Meer verkopen', 'v'],
  ['faq', 'FAQ clients', 'FAQ klanten', 'v'],
  ['svc', 'Services', 'Diensten', 'v'],
  ['cons', 'Conservation', 'Bewaring', 'v'],
  ['stats', 'Statistiques', 'Statistieken', 'v'],
  ['onb', 'Onboarding', 'Onboarding', 'f'],
];

export const navLabel = (view: View, lang: Lang): string => {
  const d = NAV.find(n => n[0] === view)!;
  return lang ? d[2] : d[1];
};

export const groupTitle = (g: NavGroup, lang: Lang): string =>
  g === 'v' ? (lang ? 'Verkoop' : 'Vente') : (lang ? 'Opleiding' : 'Formation');

/** Short month names for the season calendar. */
export const monthNames = (lang: Lang): string[] =>
  lang
    ? ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec']
    : ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

/** Short weekday names, Monday first, for the 7-day revenue chart. */
export const dayNames = (lang: Lang): string[] =>
  lang ? ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'] : ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export const locale = (lang: Lang): string => (lang ? 'nl-BE' : 'fr-BE');
