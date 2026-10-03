// Les bases — les gestes et les mots de chaque jour au comptoir. Chaque texte = [FR, NL].
// Phrases reprises du livret de formation vente (09-2026, src/content/livret-*.md), dans la
// version de chaque langue ; le reste est écrit dans le même ton (vouvoiement, court, concret,
// vocabulaire positif du module 4). Les phrases « Ce qu'on dit » n'utilisent aucun mot de la
// liste du module 4 (bases.test.ts le vérifie).
import type { T2 } from './types';

/** Illustrations of public/img/onb/ (<name>.png). */
export type BasesIcon = 'bread' | 'cake' | 'croissant' | 'hot-drink' | 'phone-orders' | 'savoury-tart' | 'sweet-tart';

export interface BaseTopic {
  id: string;
  icon: BasesIcon;
  /** Topic title (card heading). */
  title: T2;
  /** Short label of the topic's chip. */
  chip: T2;
  /** The rule, in one sentence. */
  rule: T2;
  /** 3–5 short steps, in order. */
  steps: T2[];
  /** "Ce qu'on dit" (✓): 2–3 phrases. */
  say: T2[];
  /** "Ce qu'on ne dit pas" (✕): 2–3 phrases. */
  avoid: T2[];
  /** Livret module(s) it comes from. */
  source?: T2;
}

/** Image path of a topic illustration. */
export const basesIcon = (icon: BasesIcon): string => `img/onb/${icon}.png`;

/** Screen labels. */
export const BASES_LABELS = {
  intro: ["Les gestes et les mots de chaque jour au comptoir, repris de votre livret de formation.", 'De gebaren en woorden van elke dag aan de toog, uit uw opleidingsboekje.'],
  topics: ['Thèmes', "Thema's"],
  steps: ['Étape par étape', 'Stap voor stap'],
  say: ["Ce qu'on dit", 'Wat we zeggen'],
  avoid: ["Ce qu'on ne dit pas", 'Wat we niet zeggen'],
  source: ['Livret de formation', 'Opleidingsboekje'],
} as const satisfies Record<string, T2>;

export const BASES: readonly BaseTopic[] = [
{id:'accueil', icon:'croissant',
 title:['Accueillir un client','Een klant onthalen'],
 chip:['Bonjour','Goeiedag'],
 rule:["Chaque client qui entre est regardé et salué dans les 3 secondes, même si vous êtes occupé avec quelqu'un d'autre.","Elke klant die binnenkomt, wordt binnen 3 seconden aangekeken en begroet, ook als u met iemand anders bezig bent."],
 steps:[["Un regard et un sourire dès que le client entre : le client qui sait qu'on l'a vu attend avec plaisir.","Een blik en een glimlach zodra de klant binnenkomt: een klant die weet dat hij gezien is, wacht met plezier."],
  ["« Bonjour », dit en premier, par vous : c'est vous qui recevez chez vous, c'est à vous d'ouvrir.","« Goeiedag », als eerste gezegd, door u: u ontvangt bij u thuis, dus u opent het gesprek."],
  ["« Qu'est-ce qui vous ferait plaisir ? » : vous ne prenez pas une commande, vous commencez une conversation.","« Waarmee kan ik u een plezier doen? »: u neemt geen bestelling op, u begint een gesprek."],
  ["Vous regardez le client, vous l'écoutez, vous le conseillez, vous lui faites goûter quand c'est possible.","U kijkt de klant aan, u luistert, u geeft advies, u laat proeven telkens het kan."]],
 say:[["« Bonjour ! Qu'est-ce qui vous ferait plaisir ? »","« Goeiedag! Waarmee kan ik u een plezier doen? »"],
  ["Un regard, un sourire : « Bonjour, je suis à vous dans un instant. »","Een blik, een glimlach: « Goeiedag, ik help u zo meteen. »"]],
 avoid:[["« Je vous écoute. »","« Zeg het maar. »"],
  ["Rien du tout : vous continuez sans lever les yeux.","Niets: u gaat verder zonder op te kijken."]],
 source:["Module 1 · L'expérience client","Module 1 · De klantervaring"]},

{id:'telephone', icon:'phone-orders',
 title:['Répondre au téléphone','De telefoon opnemen'],
 chip:['Téléphone','Telefoon'],
 rule:["Un client qui appelle a déjà envie d'acheter : il raccroche avec une commande ou un moment de passage prévu, jamais avec une simple information.","Een klant die belt, heeft al zin om te kopen: hij hangt op met een bestelling of een afgesproken bezoek, nooit met alleen een inlichting."],
 steps:[["Décrocher avant la troisième sonnerie. Tout passe par la voix : souriez, le client l'entend.","Opnemen voor de derde beltoon. Alles gaat via uw stem: glimlach, de klant hoort het."],
  ["Découvrir : pour quelle occasion, pour combien de personnes, pour quel jour.","Ontdekken: voor welke gelegenheid, voor hoeveel personen, voor welke dag."],
  ["Proposer un ou deux produits liés à la réponse, avec la phrase produit.","Voorstellen: één of twee producten die passen bij het antwoord, met de productzin."],
  ["Conclure : le lien du webshop, ou la commande notée et un moment de passage.","Afsluiten: de link naar de webshop, of de bestelling genoteerd en een afgesproken bezoek."],
  ["Récapituler la commande à voix haute (produit, jour, heure, nom), puis remercier et dire au revoir.","De bestelling luidop samenvatten (product, dag, uur, naam), dan bedanken en afscheid nemen."]],
 say:[["« L'Atelier By [boutique], bonjour, [prénom] à l'appareil. Qu'est-ce qui vous ferait plaisir ? »","« L'Atelier By [winkel], goeiedag, met [voornaam]. Waarmee kan ik u een plezier doen? »"],
  ["« C'est noté : une grande tarte pour dimanche 10 h, au nom de Martin. »","« Genoteerd: een grote taart voor zondag 10 u, op naam van Martin. »"],
  ["« Merci de votre appel, et à dimanche ! »","« Bedankt voor uw telefoontje, en tot zondag! »"]],
 avoid:[["« Allô ? »","« Hallo? »"],
  ["« Oui, on en a. » → « D'accord, merci. » Rien n'est commandé.","« Ja, die hebben we. » → « Oké, bedankt. » Niets besteld."],
  ["« Je ne sais pas, normalement il faut prévenir avant. »","« Ik weet het niet, normaal gezien moet u dat vooraf laten weten. »"]],
 source:['Module 6 · Téléphone et avis Google','Module 6 · Telefoon en Google-reviews']},

{id:'mecontent', icon:'bread',
 title:['Gérer un client mécontent','Omgaan met een ontevreden klant'],
 chip:['Client mécontent','Ontevreden klant'],
 rule:["Un client mécontent veut d'abord être écouté, puis aidé : vous écoutez jusqu'au bout, vous proposez une solution, et vous prévenez votre responsable le jour même.","Een ontevreden klant wil eerst gehoord worden, en dan geholpen: u luistert tot het einde, u stelt een oplossing voor, en u verwittigt uw verantwoordelijke dezelfde dag."],
 steps:[["Écouter jusqu'au bout, sans couper la parole, en regardant le client.","Luisteren tot het einde, zonder te onderbreken, terwijl u de klant aankijkt."],
  ["Remercier le client de vous le dire, puis présenter vos excuses pour ce qu'il a vécu, sans vous justifier.","De klant bedanken dat hij het zegt, en dan uw excuses aanbieden voor wat hij meemaakte, zonder u te verantwoorden."],
  ["Reformuler ce que vous avez compris : le client sait qu'on l'a vraiment écouté.","Herformuleren wat u begrepen hebt: zo weet de klant dat er echt naar hem geluisterd is."],
  ["Proposer une solution : ce que vous pouvez faire, et quand.","Een oplossing voorstellen: wat u kunt doen, en wanneer."],
  ["Au-delà de ce que vous pouvez décider, appeler votre responsable. Dans tous les cas, vous le prévenez le jour même.","Gaat het verder dan wat u mag beslissen, roep dan uw verantwoordelijke. In elk geval verwittigt u hem dezelfde dag."]],
 say:[["« Merci de me le dire, et toutes nos excuses pour ce moment. »","« Bedankt dat u het zegt, en onze excuses daarvoor. »"],
  ["« Si je comprends bien, samedi, l'attente a été longue et le pain aux céréales était parti. »","« Als ik het goed begrijp, was het zaterdag lang wachten en was het meergranenbrood uitverkocht. »"],
  ["« Votre pain aux céréales se commande la veille sur notre webshop : il vous attendra au comptoir. »","« Uw meergranenbrood kunt u de dag ervoor op onze webshop bestellen: het ligt dan voor u klaar aan de toog. »"]],
 avoid:[["« Désolés, le samedi il y a beaucoup de monde et malheureusement on ne peut pas tout prévoir. »","« Sorry, op zaterdag is het heel druk en helaas kunnen we niet alles voorzien. »"],
  ["« Calmez-vous. »","« Blijf kalm, alstublieft. »"],
  ["« Ce n'est pas de ma faute. »","« Dat is niet mijn schuld. »"]],
 source:['Modules 4 et 6 · Vocabulaire positif, client mécontent','Modules 4 en 6 · Positieve woordenschat, ontevreden klant']},

{id:'file', icon:'savoury-tart',
 title:["Quand la file s'allonge",'Als de rij langer wordt'],
 chip:["File d'attente",'Wachtrij'],
 rule:["Même quand la file s'allonge, la personne en face de vous a droit à toute votre attention : c'est comme ça qu'on sert vite et bien à la fois.","Ook als de rij langer wordt, heeft de persoon tegenover u recht op al uw aandacht: zo bedient u snel en goed tegelijk."],
 steps:[["Chaque client qui entre est regardé et salué dans les 3 secondes : celui qu'on a vu attend avec plaisir.","Elke klant die binnenkomt, wordt binnen 3 seconden aangekeken en begroet: wie gezien is, wacht met plezier."],
  ["Le client en face de vous reste le premier : vous finissez sa vente avec le même soin, jusqu'à l'au revoir.","De klant tegenover u blijft de eerste: u rondt zijn verkoop af met dezelfde zorg, tot aan het afscheid."],
  ["Vous servez dans l'ordre d'arrivée.","U bedient in volgorde van aankomst."],
  ["Au client suivant : un merci pour sa patience, puis « Qu'est-ce qui vous ferait plaisir ? »","Bij de volgende klant: een bedankje voor zijn geduld, dan « Waarmee kan ik u een plezier doen? »"]],
 say:[["« Bonjour, je suis à vous dans un instant. »","« Goeiedag, ik help u zo meteen. »"],
  ["« Merci de votre patience, je suis à vous. »","« Bedankt voor uw geduld, ik help u nu. »"]],
 avoid:[["« Désolé pour l'attente. »","« Sorry voor het wachten. »"],
  ["« Suivant ! »","« Volgende! »"],
  ["« Ce sera tout ? », pour aller plus vite.","« Was dat alles? », om sneller te gaan."]],
 source:["Modules 1 et 4 · L'expérience client, vocabulaire positif",'Modules 1 en 4 · De klantervaring, positieve woordenschat']},

{id:'fidelite', icon:'hot-drink',
 title:['Fidéliser un client','Klanten trouw maken'],
 chip:['Fidélité','Getrouwheid'],
 rule:["Un habitué, vous le reconnaissez, vous savez ce qu'il aime, et vous lui donnez à chaque visite une raison de revenir.","U herkent een vaste klant, u weet wat hij graag neemt, en u geeft hem bij elk bezoek een reden om terug te komen."],
 steps:[["Vous retenez le nom des habitués et ce qu'ils prennent d'habitude, et vous les saluez par leur nom.","U onthoudt de naam van de vaste klanten en wat ze gewoonlijk nemen, en u begroet ze bij naam."],
  ["Vous présentez la carte de fidélité de l'application : 1 point par euro, 100 points = 5 € offerts.","U stelt de getrouwheidskaart in de app voor: 1 punt per euro, 100 punten = 5 € korting."],
  ["Vous parlez de la nouveauté de saison, et vous la faites goûter quand c'est possible.","U vertelt over de nieuwigheid van het seizoen, en u laat ze proeven telkens het kan."],
  ["Quand un habitué repart content, c'est le bon moment pour demander un avis 5★.","Als een vaste klant tevreden vertrekt, is dat het juiste moment om een 5★-review te vragen."]],
 say:[["« Bonjour Monsieur Dubois ! Comme d'habitude, un café et un croissant ? »","« Goeiedag meneer Dubois! Zoals gewoonlijk, een koffie en een croissant? »"],
  ["« Avec l'application, vous cumulez des points à chaque achat. »","« Met de app spaart u punten bij elke aankoop. »"],
  ["« Vous avez goûté notre [produit de saison] ? Il vient d'arriver, je vous en fais goûter un morceau. »","« Hebt u ons [seizoensproduct] al geproefd? Het is er net, ik laat u een stukje proeven. »"]],
 avoid:[["« Vous avez la carte de fidélité ? » → « Non. » → « D'accord. »","« Hebt u de getrouwheidskaart? » → « Nee. » → « Oké. »"],
  ["« Laissez-nous un avis 5★, on vous offre un café. »","« Laat een 5★-review achter, dan krijgt u een koffie van ons. »"],
  ["« Merci, au revoir. », dit à un habitué comme à un inconnu.","« Bedankt, dag. », tegen een vaste klant zoals tegen een onbekende."]],
 source:["Modules 1 et 6 · L'expérience client, avis Google",'Modules 1 en 6 · De klantervaring, Google-reviews']},

{id:'aurevoir', icon:'sweet-tart',
 title:['Dire au revoir','Afscheid nemen'],
 chip:['Au revoir','Tot ziens'],
 rule:["D'une visite, on retient surtout le meilleur moment, et le dernier : soignez la sortie, c'est l'impression qui décide si le client revient.","Van een bezoek onthoudt men vooral het beste moment, en het laatste: verzorg het vertrek, die indruk beslist of de klant terugkomt."],
 steps:[["Le produit est emballé avec soin et remis en main, jamais posé ni glissé sur le comptoir.","Het product wordt met zorg ingepakt en in de hand gegeven, nooit neergelegd of over de toog geschoven."],
  ["Un conseil utile : comment le conserver, comment le réchauffer, ce qui l'accompagne bien.","Een nuttige tip: hoe het te bewaren, hoe het op te warmen, waar het goed bij past."],
  ["Vous reprenez ce que le client vous a dit : il comprend qu'on l'a vraiment écouté.","U herneemt wat de klant u gezegd heeft: zo weet hij dat er echt naar hem geluisterd is."],
  ["Vous remerciez et vous dites « Au revoir, à bientôt » en le regardant, avec son prénom si c'est un habitué.","U bedankt en zegt « Tot ziens, tot binnenkort » terwijl u hem aankijkt, met zijn naam als het een vaste klant is."]],
 say:[["« Voilà votre tarte, je vous la donne à plat. Gardez-la au frais jusqu'au dessert. Très bon anniversaire dimanche, et à bientôt ! »","« Alstublieft, uw taart, ik geef ze u plat mee. Bewaar ze koel tot het dessert. Een heel fijne verjaardag zondag, en tot binnenkort! »"],
  ["« Voilà, Monsieur Dubois. Belle journée, et à demain ! »","« Alstublieft, meneer Dubois. Een fijne dag, en tot morgen! »"],
  ["« Bon appétit pour votre salade ! »","« Smakelijk bij uw salade! »"]],
 avoid:[["« 24 €. Merci, au revoir. » en se tournant déjà vers le client suivant.","« 24 €. Bedankt, dag. » terwijl u zich al naar de volgende klant draait."],
  ["Le « au revoir » dit dos tourné, ou pendant qu'on ouvre le tiroir-caisse.","Het « tot ziens » dat met de rug naar de klant gezegd wordt, of terwijl de kassa opengaat."]],
 source:["Module 1 · L'expérience client",'Module 1 · De klantervaring']},
];
