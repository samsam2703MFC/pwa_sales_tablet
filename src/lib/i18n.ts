import type { Lang, Period } from '../data/types';

/** Interface labels, [FR, NL]. Copied verbatim from the prototype. */
const LABELS = [
  {
    book: 'Book vendeuses', search: 'Rechercher un produit, un ingrédient, une question…', clear: 'Effacer',
    sample: "Données d'exemple — à remplacer par les fiches produit officielles.", hello: 'Bonjour !',
    homeIntro: "Ce qu'il faut savoir aujourd'hui en boutique.", curRange: 'La gamme actuelle', now: 'En ce moment', next: 'À préparer', best: 'Les plus vendus', tipL: 'Consigne',
    top: 'Top vente', vege: 'Végétarien', vegeS: 'VÉGÉ', gammeTitle: 'La gamme', all: 'Tout',
    say: 'À dire au client', ingr: 'Ingrédients', alg: 'Allergènes', contains: 'Contient', traces: 'Traces possibles', trS: 'Traces',
    keep: 'Conservation', keepNone: 'Non renseignée', noSeasonNow: 'Aucune saison en ce moment.', dlc: 'Durée', also: 'Proposez aussi', allYear: "Toute l'année", close: 'Fermer',
    alTitle: 'Allergènes', alIntro: 'Le client est allergique à :', alReset: 'Effacer', alOk: 'produits compatibles', alWarn: 'avec traces possibles',
    alNote: "En cas d'allergie sévère : montrer la fiche, signaler les traces possibles et laisser le client décider. Ne jamais garantir qu'un produit est « sans ». En cas de doute, appeler la responsable.",
    calTitle: 'Saisons', ventesTitle: 'Vendre plus', combos: 'Formules', reflexes: 'Les bons réflexes', pairs: 'Associations par produit',
    faqTitle: 'Questions fréquentes', selFaqT: 'Ce que les clients demandent', linkedP: 'Produits concernés', svcTitle: 'Services', how: 'Comment ça marche', delay: 'Délai', consTitle: 'Conservation & DLC',
    asks: 'Le client demande…', results: 'Résultats pour', noRes: 'Aucun résultat.', questions: 'Questions',
    d0: 'Immédiat', d1: 'Jour même', dn: 'jours',
    // Unverified BO data (not in the prototype)
    alUnk: 'À vérifier', alCheck: "À vérifier sur l'étiquette", alUnkN: "à vérifier sur l'étiquette",
    alUnkText: "Les allergènes de ce produit ne sont pas encore vérifiés : ne jamais garantir qu'il est « sans ». En cas de doute, appeler la responsable.",
    alRawL: 'Détail :', trUnk: "Traces non renseignées : à vérifier sur l'étiquette.",
    srcSample: "Données d'exemple", srcOffline: 'Hors ligne', srcOfflineOf: 'données du', srcNetwork: 'réseau',
  },
  {
    book: 'Verkoopsboek', search: 'Zoek een product, ingrediënt, vraag…', clear: 'Wissen',
    sample: 'Voorbeeldgegevens — te vervangen door de officiële productfiches.', hello: 'Goedendag!',
    homeIntro: 'Wat u vandaag moet weten in de winkel.', curRange: 'Het huidige assortiment', now: 'Nu', next: 'Voor te bereiden', best: 'Topverkopers', tipL: 'Richtlijn',
    top: 'Topper', vege: 'Vegetarisch', vegeS: 'VEGGIE', gammeTitle: 'Het assortiment', all: 'Alles',
    say: 'Tegen de klant', ingr: 'Ingrediënten', alg: 'Allergenen', contains: 'Bevat', traces: 'Mogelijke sporen', trS: 'Sporen',
    keep: 'Bewaring', keepNone: 'Niet ingevuld', noSeasonNow: 'Geen seizoen op dit moment.', dlc: 'Houdbaar', also: 'Stel ook voor', allYear: 'Het hele jaar', close: 'Sluiten',
    alTitle: 'Allergenen', alIntro: 'De klant is allergisch voor:', alReset: 'Wissen', alOk: 'geschikte producten', alWarn: 'met mogelijke sporen',
    alNote: 'Bij een ernstige allergie: toon de fiche, meld mogelijke sporen en laat de klant beslissen. Nooit garanderen dat een product "vrij van" is. Bij twijfel de verantwoordelijke bellen.',
    calTitle: 'Seizoenen', ventesTitle: 'Meer verkopen', combos: 'Formules', reflexes: 'De juiste reflexen', pairs: 'Combinaties per product',
    faqTitle: 'Veelgestelde vragen', selFaqT: 'Wat klanten vragen', linkedP: 'Betrokken producten', svcTitle: 'Diensten', how: 'Hoe werkt het', delay: 'Termijn', consTitle: 'Bewaring & houdbaarheid',
    asks: 'De klant vraagt…', results: 'Resultaten voor', noRes: 'Geen resultaten.', questions: 'Vragen',
    d0: 'Onmiddellijk', d1: 'Dezelfde dag', dn: 'dagen',
    alUnk: 'Nakijken', alCheck: 'Te controleren op het etiket', alUnkN: 'te controleren op het etiket',
    alUnkText: 'De allergenen van dit product zijn nog niet nagekeken: nooit garanderen dat het "vrij van" is. Bij twijfel de verantwoordelijke bellen.',
    alRawL: 'Detail:', trUnk: 'Sporen niet ingevuld: te controleren op het etiket.',
    srcSample: 'Voorbeeldgegevens', srcOffline: 'Offline', srcOfflineOf: 'gegevens van', srcNetwork: 'netwerk',
  },
] as const;

export type Labels = { [K in keyof (typeof LABELS)[0]]: string };
export const labels = (lang: Lang): Labels => LABELS[lang];

/** FR/NL pair whose NL entry must have exactly the FR keys (missing → TS2345, extra → TS2353). */
export const pair = <T extends object>(fr: T, nl: NoInfer<T>): readonly [T, T] => [fr, nl];

/** Statistics labels. */
const STATS_LABELS = pair(
  {
    ca: "Chiffre d'affaires", tk: 'Tickets', pan: 'Panier moyen', cross: 'Vente additionnelle', sais: 'Produits de saison', obj: 'Objectif', team: 'Équipe',
    per: [['day', "Aujourd'hui"], ['week', 'Cette semaine'], ['month', 'Ce mois']] as [Period, string][],
    rank: "Classement de l'équipe", top: 'Les plus vendus', days: '7 derniers jours', reached: 'Atteint', toGo: 'À atteindre', units: 'pcs', seller: 'Vendeuse',
    title: 'Statistiques', note: 'Chiffres d’exemple — à connecter à la caisse.',
    sample: "Données d'exemple", sampleText: 'Vendeuses, chiffres et objectifs fictifs, en attendant la connexion à la caisse.',
  },
  {
    ca: 'Omzet', tk: 'Tickets', pan: 'Gemiddeld ticket', cross: 'Bijverkoop', sais: 'Seizoensproducten', obj: 'Doel', team: 'Team',
    per: [['day', 'Vandaag'], ['week', 'Deze week'], ['month', 'Deze maand']] as [Period, string][],
    rank: 'Teamoverzicht', top: 'Meest verkocht', days: '7 laatste dagen', reached: 'Gehaald', toGo: 'Nog te gaan', units: 'st.', seller: 'Verkoopster',
    title: 'Statistieken', note: 'Voorbeeldcijfers — te koppelen aan de kassa.',
    sample: 'Voorbeeldgegevens', sampleText: 'Fictieve verkoopsters, cijfers en doelen, in afwachting van de koppeling met de kassa.',
  },
);
export type StatsLabels = (typeof STATS_LABELS)[0];
export const statsLabels = (lang: Lang): StatsLabels => STATS_LABELS[lang];

/** Home page targets (revenue and cross-sell, week and month), from the BO (GET /tablette/objectifs). */
const OBJ_LABELS = pair(
  {
    title: 'Objectifs', ca: "Chiffre d'affaires", cross: 'Vente additionnelle', week: 'Cette semaine', month: 'Ce mois',
    obj: 'Objectif', expected: 'attendu à ce jour', reached: 'Atteint', toGo: 'À atteindre', ahead: 'En avance', behind: 'En retard',
    noTarget: "Pas d'objectif", noData: 'Pas encore de chiffres', tickets: 'tickets', perTicket: 'articles par ticket',
    sampleNote: "Les objectifs viennent du back-office : ils s'affichent quand la tablette est reliée à un magasin.",
  },
  {
    title: 'Doelen', ca: 'Omzet', cross: 'Bijverkoop', week: 'Deze week', month: 'Deze maand',
    obj: 'Doel', expected: 'verwacht tot vandaag', reached: 'Gehaald', toGo: 'Nog te gaan', ahead: 'Voor op schema', behind: 'Achter op schema',
    noTarget: 'Geen doel', noData: 'Nog geen cijfers', tickets: 'tickets', perTicket: 'artikelen per ticket',
    sampleNote: 'De doelen komen uit de back-office: ze verschijnen wanneer de tablet aan een winkel gekoppeld is.',
  },
);
export type ObjLabels = (typeof OBJ_LABELS)[0];
export const objLabels = (lang: Lang): ObjLabels => OBJ_LABELS[lang];

/** Product sheet: sales arguments, network combos, bundles (src/drawer/drawer.logic.ts). */
const SALE_LABELS = pair(
  {
    args: 'Arguments de vente', bundles: 'Dans les menus & bundles', offer: 'Proposez',
    target: (n: string) => `objectif réseau : ${n} % des tickets`,
    best: 'Une de nos meilleures ventes au comptoir.',
    season: (name: string, dates: string) => `De la gamme ${name}${dates ? ` (${dates})` : ''} : à proposer tant qu'elle est là.`,
    dlc1: 'Fait du jour : à savourer aujourd\'hui, bien frais.',
    dlcN: (n: number) => `Se garde ${n} jours : facile à prendre pour plus tard.`,
    vegan: 'Vegan : sans aucun produit d\'origine animale.',
    vege: 'Végétarien.',
  },
  {
    args: 'Verkoopargumenten', bundles: "In menu's & bundels", offer: 'Stel voor',
    target: (n: string) => `netwerkdoel: ${n} % van de tickets`,
    best: 'Een van onze bestverkopers aan de toonbank.',
    season: (name: string, dates: string) => `Uit het assortiment ${name}${dates ? ` (${dates})` : ''}: voorstellen zolang het er is.`,
    dlc1: 'Van vandaag: vandaag nog lekker vers opeten.',
    dlcN: (n: number) => `Blijft ${n} dagen goed: makkelijk om mee te nemen voor later.`,
    vegan: 'Vegan: zonder enig dierlijk product.',
    vege: 'Vegetarisch.',
  },
);
export type SaleLabels = (typeof SALE_LABELS)[0];
export const saleLabels = (lang: Lang): SaleLabels => SALE_LABELS[lang];

/** "Les bundles de la semaine" (home page, src/data/bundles.ts). */
const BUNDLE_LABELS = pair(
  {
    title: 'Les bundles de la semaine', from: 'Dès le', today: "Aujourd'hui", only: 'Seulement à', colon: ' : ',
    period: (a: string, b: string) => `Du ${a} au ${b}`, bundle: 'Bundle',
    days: ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'],
    initials: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
    span: ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'], everyDay: 'tous les jours',
    channels: { cc: 'Click & collect', delivery: 'Livraison' },
  },
  {
    title: 'De bundels van de week', from: 'Vanaf', today: 'Vandaag', only: 'Alleen in', colon: ': ',
    period: (a: string, b: string) => `Van ${a} tot ${b}`, bundle: 'Bundel',
    days: ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'],
    initials: ['M', 'D', 'W', 'D', 'V', 'Z', 'Z'],
    span: ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'], everyDay: 'elke dag',
    channels: { cc: 'Click & collect', delivery: 'Levering' },
  },
);
export type BundleLabels = (typeof BUNDLE_LABELS)[0];
export const bundleLabels = (lang: Lang): BundleLabels => BUNDLE_LABELS[lang];

/** Customer remark form of the home page (sent to the BO, POST /tablette/remarques). */
const REMARK_LABELS = pair(
  {
    title: "Remarque d'un client", hint: 'Ce que le client a dit, avec ses mots. Elle part au back-office.',
    types: { compliment: 'Compliment', suggestion: 'Suggestion', reclamation: 'Réclamation' },
    placeholder: 'Ex. : « Le pain aux noix était encore meilleur la semaine passée. »',
    send: 'Envoyer', sending: 'Envoi…', chooseType: 'Choisissez le type de remarque.',
    sent: 'Merci ! La remarque est envoyée.', queued: 'Gardée sur la tablette : elle partira dès que la connexion revient.',
    rejected: "Le back-office a refusé cette remarque : vérifiez le texte.", lost: "La remarque n'a pas pu être envoyée ni gardée : réessayez.",
    waiting: (n: number) => (n > 1 ? `${n} remarques en attente d'envoi.` : "1 remarque en attente d'envoi."),
  },
  {
    title: 'Opmerking van een klant', hint: 'Wat de klant zei, in zijn eigen woorden. Ze gaat naar de back-office.',
    types: { compliment: 'Compliment', suggestion: 'Suggestie', reclamation: 'Klacht' },
    placeholder: 'Bv.: "Het notenbrood was vorige week nog lekkerder."',
    send: 'Versturen', sending: 'Versturen…', chooseType: 'Kies het soort opmerking.',
    sent: 'Bedankt! De opmerking is verstuurd.', queued: 'Bewaard op de tablet: ze vertrekt zodra er weer verbinding is.',
    rejected: 'De back-office heeft deze opmerking geweigerd: controleer de tekst.', lost: 'De opmerking kon niet verstuurd of bewaard worden: probeer opnieuw.',
    waiting: (n: number) => (n > 1 ? `${n} opmerkingen wachten om verstuurd te worden.` : '1 opmerking wacht om verstuurd te worden.'),
  },
);
export type RemarkLabels = (typeof REMARK_LABELS)[0];
export const remarkLabels = (lang: Lang): RemarkLabels => REMARK_LABELS[lang];

/** Onboarding labels. */
const ONB_LABELS = pair(
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
);
export type OnbLabels = (typeof ONB_LABELS)[0];
export const onbLabels = (lang: Lang): OnbLabels => ONB_LABELS[lang];

export type View = 'home' | 'gamme' | 'saisons' | 'al' | 'ventes' | 'faq' | 'svc' | 'cons' | 'stats' | 'obj' | 'rem' | 'bases' | 'onb';
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
  ['obj', 'Objectifs', 'Doelen', 'v'],
  ['rem', 'Remarques clients', 'Klantenopmerkingen', 'v'],
  ['bases', 'Les bases', 'De basis', 'f'],
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
