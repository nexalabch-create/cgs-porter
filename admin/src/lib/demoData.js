// Demo data for when Supabase env vars aren't set. Same shape as DB rows so
// pages render identically in either mode.
const PORTERS = [
  { id: 'mt',  email: 'mate.torgvaidze@cgs-ltd.com', role: 'chef',   first_name: 'Mate',     last_name: 'Torgvaidze', initials: 'MT' },
  { id: 'p2',  email: 'marc.dubois@cgs-ltd.com',     role: 'porter', first_name: 'Marc',     last_name: 'Dubois',     initials: 'MD' },
  { id: 'p3',  email: 'julien.moreau@cgs-ltd.com',   role: 'porter', first_name: 'Julien',   last_name: 'Moreau',     initials: 'JM' },
  { id: 'p4',  email: 'lea.bertrand@cgs-ltd.com',    role: 'porter', first_name: 'Léa',      last_name: 'Bertrand',   initials: 'LB' },
  { id: 'p5',  email: 'karim.benali@cgs-ltd.com',    role: 'porter', first_name: 'Karim',    last_name: 'Benali',     initials: 'KB' },
  { id: 'p6',  email: 'anais.roche@cgs-ltd.com',     role: 'porter', first_name: 'Anaïs',    last_name: 'Roche',      initials: 'AR' },
  { id: 'p7',  email: 'thomas.schneider@cgs-ltd.com',role: 'porter', first_name: 'Thomas',   last_name: 'Schneider',  initials: 'TS' },
  { id: 'p8',  email: 'camille.petit@cgs-ltd.com',   role: 'porter', first_name: 'Camille',  last_name: 'Petit',      initials: 'CP' },
  { id: 'p9',  email: 'hugo.martin@cgs-ltd.com',     role: 'porter', first_name: 'Hugo',     last_name: 'Martin',     initials: 'HM' },
  { id: 'p10', email: 'aicha.diallo@cgs-ltd.com',    role: 'porter', first_name: 'Aïcha',    last_name: 'Diallo',     initials: 'AD' },
  { id: 'p11', email: 'ricardo.almeida@cgs-ltd.com', role: 'porter', first_name: 'Ricardo',  last_name: 'Almeida',    initials: 'RA' },
  { id: 'p12', email: 'yasmine.haddad@cgs-ltd.com',  role: 'porter', first_name: 'Yasmine',  last_name: 'Haddad',     initials: 'YH' },
  { id: 'p13', email: 'pierre.girard@cgs-ltd.com',   role: 'porter', first_name: 'Pierre',   last_name: 'Girard',     initials: 'PG' },
  { id: 'p14', email: 'elena.rossi@cgs-ltd.com',     role: 'porter', first_name: 'Elena',    last_name: 'Rossi',      initials: 'ER' },
  { id: 'p15', email: 'mohamed.berrada@cgs-ltd.com', role: 'porter', first_name: 'Mohamed',  last_name: 'Berrada',    initials: 'MB' },
  { id: 'p16', email: 'zoe.chevalier@cgs-ltd.com',   role: 'porter', first_name: 'Zoé',      last_name: 'Chevalier',  initials: 'ZC' },
  { id: 'p17', email: 'antoine.vidal@cgs-ltd.com',   role: 'porter', first_name: 'Antoine',  last_name: 'Vidal',      initials: 'AV' },
  { id: 'p18', email: 'nadia.meier@cgs-ltd.com',     role: 'porter', first_name: 'Nadia',    last_name: 'Meier',      initials: 'NM' },
  { id: 'p19', email: 'sofia.costa@cgs-ltd.com',     role: 'porter', first_name: 'Sofia',    last_name: 'Costa',      initials: 'SC' },
  { id: 'p20', email: 'leo.bonnet@cgs-ltd.com',      role: 'porter', first_name: 'Léo',      last_name: 'Bonnet',     initials: 'LB' },
];

const SOURCES = ['web', 'dnata', 'swissport', 'prive'];
const FLOWS = ['arrivee', 'depart'];
const STATUSES = ['todo', 'active', 'done'];

// Generate ~120 services across last 30 days for realistic charts.
const SERVICES = (() => {
  const arr = [];
  const now = new Date('2026-04-25T08:00:00+02:00');
  let counter = 1;
  for (let day = 29; day >= 0; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);
    const todayCount = day === 0 ? 5 : 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < todayCount; i++) {
      const hour = 8 + Math.floor(Math.random() * 12);
      const min = [0, 15, 30, 45][Math.floor(Math.random() * 4)];
      const scheduled = new Date(date);
      scheduled.setHours(hour, min, 0, 0);
      const bags = 1 + Math.floor(Math.random() * 5);
      const porter = PORTERS[1 + Math.floor(Math.random() * (PORTERS.length - 1))];
      const status = day === 0 && i >= 2 ? 'todo' : (day === 0 && i === 1 ? 'active' : 'done');
      arr.push({
        id: `demo-${counter++}`,
        flight: ['EK', 'LX', 'AF', 'BA', 'QR', 'LH', 'KL', 'TK'][Math.floor(Math.random() * 8)] +
                Math.floor(100 + Math.random() * 900),
        scheduled_at: scheduled.toISOString(),
        client_name: ['Mr. Khalid Al-Mansouri', 'Mme Sophie Lefèvre', 'M. Tanaka',
                      'Mr. Whitford', 'Dr. Schmidt', 'Mr. Patel', 'Mlle Bertrand',
                      'M. Rossi', 'Mme Bonnet', 'Mr. Chen'][Math.floor(Math.random() * 10)],
        client_email: null,
        meeting_point: ['Terminal 1 · A12', 'Terminal 2 · First', 'Hall arrivées P3', 'Salon BA'][Math.floor(Math.random() * 4)],
        bags,
        base_price_chf: 25,
        per_bag_price_chf: 12,
        status,
        agency: ['Emirates VIP', 'Swiss First', 'Air France Premium', 'BA', 'Qatar'][Math.floor(Math.random() * 5)],
        client_phone: '+41 22 ' + Math.floor(100 + Math.random() * 900) + ' ' + Math.floor(10 + Math.random() * 90) + ' ' + Math.floor(10 + Math.random() * 90),
        flow: FLOWS[Math.floor(Math.random() * 2)],
        source: SOURCES[Math.floor(Math.random() * 4)],
        remarques: '',
        assigned_porter_id: status === 'todo' && Math.random() < 0.4 ? null : porter.id,
        started_at: status !== 'todo' ? scheduled.toISOString() : null,
        completed_at: status === 'done' ? new Date(scheduled.getTime() + 30 * 60000).toISOString() : null,
        created_at: scheduled.toISOString(),
      });
    }
  }
  return arr;
})();

const SETTINGS = {
  id: 1,
  company_name: 'CGS — Carrying Geneva Services',
  company_address: 'Aéroport de Genève, 1215 Genève',
  company_phone: '+41 22 717 71 00',
  company_email: 'porter@cgs-ltd.com',
  base_price_chf: 25,
  bags_included_in_base: 3,
  per_extra_bag_price_chf: 5,
  webhook_apps_script_url: 'https://script.google.com/macros/s/XXXXX/exec',
  app_version: '2.4.1',
};

export const demo = {
  porters: PORTERS,
  services: SERVICES,
  clients: [],
  settings: SETTINGS,
};
