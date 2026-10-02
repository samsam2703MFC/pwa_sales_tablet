/**
 * The shop's targets as the BO sends them (GET /api/cockpit/tablette/objectifs, schema 1),
 * one gauge state per row: revenue ahead of plan this week, behind this month; cross-sell
 * (items per ticket) still to reach this week, reached this month. Shared by the unit tests
 * and the e2e suite (e2e/bo.spec.ts).
 */
export const OBJECTIVES_PAYLOAD = {
  schema: 1,
  genereLe: '2026-10-02T20:15:00+02:00',
  date: '2026-10-02',
  shop: { id: '4', nom: 'Ixelles' },
  ca: {
    semaine: { du: '2026-09-28', au: '2026-10-04', realise: 4310.5, objectif: 6000, attendu: 3420 },
    mois: { du: '2026-10-01', au: '2026-10-31', realise: 812.4, objectif: 25000, attendu: 1650 },
  },
  // Cross-sell = items (lines) per ticket (decision of 2 October 2026).
  venteAdd: {
    semaine: { parTicket: 1.82, cible: 2, tickets: 452 },
    mois: { parTicket: 2.05, cible: 2, tickets: 1890 },
  },
  sources: { ca: 'CA TTC des tickets de caisse (comme /exploitation/periode)', venteAdd: 'articles par ticket (comme Ventes › primes)' },
};
