// Mirror of admin/src/lib/pricing.js — kept identical so mobile and admin agree
// on totals at all times.

export const DEFAULT_TARIFF = {
  bags_included_in_base:        3,
  dnata_swissport_base_chf:    15,
  dnata_swissport_extra_bag_chf: 4,
  prive_base_chf:              25,
  prive_extra_bag_chf:          5,
};

const PRIVATE_LIKE = new Set(['prive', 'web', 'guichet']);

export function totalChfFor(svc, tariff) {
  const t = { ...DEFAULT_TARIFF, ...(tariff || {}) };
  const bags = Number(svc?.bags) || 0;
  const extra = Math.max(0, bags - t.bags_included_in_base);
  if (PRIVATE_LIKE.has(svc?.source)) {
    return Number(t.prive_base_chf) + extra * Number(t.prive_extra_bag_chf);
  }
  return Number(t.dnata_swissport_base_chf) + extra * Number(t.dnata_swissport_extra_bag_chf);
}
