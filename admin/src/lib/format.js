// Shared formatters used across pages.

const CHF = new Intl.NumberFormat('fr-CH', {
  style: 'currency', currency: 'CHF', maximumFractionDigits: 0,
});

export const formatCHF = (n) => CHF.format(n ?? 0).replace('CHF', 'CHF\u00A0');

export const formatDate = (iso) =>
  new Date(iso).toLocaleDateString('fr-CH', { day: '2-digit', month: 'short', year: 'numeric' });

export const formatTime = (iso) =>
  new Date(iso).toLocaleTimeString('fr-CH', { hour: '2-digit', minute: '2-digit' });

export const formatDay = (iso) =>
  new Date(iso).toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short' });

export const totalChf = (s) =>
  Number(s.base_price_chf ?? 25) + (s.bags ?? 0) * Number(s.per_bag_price_chf ?? 12);

export const SOURCE_LABEL = {
  web:        'Web',
  dnata:      'DNATA',
  swissport:  'Swissport',
  prive:      'Privé',
};

export const STATUS_LABEL = {
  todo:   'À faire',
  active: 'En cours',
  done:   'Terminé',
};

export const STATUS_STYLES = {
  todo:   'bg-slate-100 text-slate-600',
  active: 'bg-emerald-50 text-emerald-700',
  done:   'bg-navy/10 text-navy',
};

export const SOURCE_COLOR = {
  web:        '#e91e8c',
  dnata:      '#1a1a5e',
  swissport:  '#10b981',
  prive:      '#f59e0b',
};

export const fullName = (p) => p ? `${p.first_name} ${p.last_name}` : '—';
export const shortName = (p) => p ? `${p.first_name} ${p.last_name.charAt(0)}.` : '—';
