// Tier-based, per-source pricing for CGS porter services.
//
//  · DNATA + Swissport → 1-3 bagages = 15 CHF, +4 CHF par bagage supplémentaire.
//  · Privé / Web / Guichet → 1-3 bagages = 25 CHF, +5 CHF par bagage supplémentaire.
//
// All five constants are mirrored on app_settings so the chef can tweak them
// from Paramètres later without redeploying.

export const DEFAULT_TARIFF = {
  bags_included_in_base:        3,
  dnata_swissport_base_chf:    15,
  dnata_swissport_extra_bag_chf: 4,
  prive_base_chf:              25,
  prive_extra_bag_chf:          5,
};

const PRIVATE_LIKE = new Set(['prive', 'web', 'guichet']);

/**
 * @param {{ source: string, bags: number }} svc
 * @param {Partial<typeof DEFAULT_TARIFF>} [tariff]
 * @returns {number} total in CHF
 */
export function totalChfFor(svc, tariff) {
  const t = { ...DEFAULT_TARIFF, ...(tariff || {}) };
  const bags = Number(svc?.bags) || 0;
  const extra = Math.max(0, bags - t.bags_included_in_base);
  if (PRIVATE_LIKE.has(svc?.source)) {
    return Number(t.prive_base_chf) + extra * Number(t.prive_extra_bag_chf);
  }
  return Number(t.dnata_swissport_base_chf) + extra * Number(t.dnata_swissport_extra_bag_chf);
}

/**
 * Human-readable price breakdown for UI previews.
 * @returns {string} e.g. "15 CHF (1–3 bag.) + 4 × 2 = 23 CHF"
 */
export function priceBreakdown(svc, tariff) {
  const t = { ...DEFAULT_TARIFF, ...(tariff || {}) };
  const bags = Number(svc?.bags) || 0;
  const extra = Math.max(0, bags - t.bags_included_in_base);
  const isPrivate = PRIVATE_LIKE.has(svc?.source);
  const base = isPrivate ? t.prive_base_chf : t.dnata_swissport_base_chf;
  const perExtra = isPrivate ? t.prive_extra_bag_chf : t.dnata_swissport_extra_bag_chf;
  const total = totalChfFor(svc, tariff);
  if (extra === 0) {
    return `${base} CHF (${bags || 1} bagage${bags > 1 ? 's' : ''})`;
  }
  return `${base} + ${perExtra} × ${extra} = ${total} CHF`;
}
