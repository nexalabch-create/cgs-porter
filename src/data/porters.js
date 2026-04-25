// Porter directory. In production this comes from Supabase `users` table.
export const PORTERS = [
  { id: 'mt',  firstName: 'Mate',     lastName: 'Torgvaidze', role: 'chef',   initials: 'MT' },
  { id: 'p2',  firstName: 'Marc',     lastName: 'Dubois',     role: 'porter', initials: 'MD' },
  { id: 'p3',  firstName: 'Julien',   lastName: 'Moreau',     role: 'porter', initials: 'JM' },
  { id: 'p4',  firstName: 'Léa',      lastName: 'Bertrand',   role: 'porter', initials: 'LB' },
  { id: 'p5',  firstName: 'Karim',    lastName: 'Benali',     role: 'porter', initials: 'KB' },
  { id: 'p6',  firstName: 'Anaïs',    lastName: 'Roche',      role: 'porter', initials: 'AR' },
  { id: 'p7',  firstName: 'Thomas',   lastName: 'Schneider',  role: 'porter', initials: 'TS' },
  { id: 'p8',  firstName: 'Camille',  lastName: 'Petit',      role: 'porter', initials: 'CP' },
  { id: 'p9',  firstName: 'Hugo',     lastName: 'Martin',     role: 'porter', initials: 'HM' },
  { id: 'p10', firstName: 'Aïcha',    lastName: 'Diallo',     role: 'porter', initials: 'AD' },
  { id: 'p11', firstName: 'Ricardo',  lastName: 'Almeida',    role: 'porter', initials: 'RA' },
  { id: 'p12', firstName: 'Yasmine',  lastName: 'Haddad',     role: 'porter', initials: 'YH' },
  { id: 'p13', firstName: 'Pierre',   lastName: 'Girard',     role: 'porter', initials: 'PG' },
  { id: 'p14', firstName: 'Elena',    lastName: 'Rossi',      role: 'porter', initials: 'ER' },
  { id: 'p15', firstName: 'Mohamed',  lastName: 'Berrada',    role: 'porter', initials: 'MB' },
  { id: 'p16', firstName: 'Zoé',      lastName: 'Chevalier',  role: 'porter', initials: 'ZC' },
  { id: 'p17', firstName: 'Antoine',  lastName: 'Vidal',      role: 'porter', initials: 'AV' },
  { id: 'p18', firstName: 'Nadia',    lastName: 'Meier',      role: 'porter', initials: 'NM' },
  { id: 'p19', firstName: 'Sofia',    lastName: 'Costa',      role: 'porter', initials: 'SC' },
  { id: 'p20', firstName: 'Léo',      lastName: 'Bonnet',     role: 'porter', initials: 'LB' },
];

// O(1) lookup — porter directory is read on nearly every service-card render,
// `find` is O(n) per call. (Skill: vercel-react-best-practices · js-set-map-lookups)
const PORTER_BY_ID = new Map(PORTERS.map(p => [p.id, p]));

export const findPorter = (id) => (id ? PORTER_BY_ID.get(id) : undefined);

export const porterDisplayName = (p) =>
  p ? `${p.firstName} ${p.lastName.charAt(0)}.` : 'Non assigné';
