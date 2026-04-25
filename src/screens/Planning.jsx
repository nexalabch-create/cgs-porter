import React from 'react';
import { Icon } from '../components/Icons.jsx';

const SHIFTS = {
  1:  { code: 'CQ1', start: '06:00', end: '14:30', pause: 30 },
  2:  'weekend-off',
  3:  'weekend-off',
  4:  { code: 'CQ2', start: '14:15', end: '23:30', pause: 45 },
  5:  { code: 'CQ2', start: '14:15', end: '23:30', pause: 45 },
  6:  'off',
  7:  { code: 'TR5', start: '07:00', end: '15:00', pause: 30 },
  8:  { code: 'TR5', start: '07:00', end: '15:00', pause: 30 },
  9:  'weekend',
  10: 'weekend',
  11: { code: 'CQ1', start: '06:00', end: '14:30', pause: 30 },
  12: { code: 'CQ1', start: '06:00', end: '14:30', pause: 30 },
  13: { code: 'TR6', start: '15:00', end: '23:00', pause: 30 },
  14: { code: 'TR6', start: '15:00', end: '23:00', pause: 30 },
  15: 'off',
  16: 'weekend',
  17: 'weekend',
  18: { code: 'CQ2', start: '14:15', end: '23:30', pause: 45 },
  19: { code: 'CQ2', start: '14:15', end: '23:30', pause: 45 },
  20: { code: 'CQ2', start: '14:15', end: '23:30', pause: 45 },
  21: 'off',
  22: { code: 'TR5', start: '07:00', end: '15:00', pause: 30 },
  23: 'weekend',
  24: 'weekend',
  25: { code: 'CQ1', start: '06:00', end: '14:30', pause: 30 },
  26: { code: 'CQ1', start: '06:00', end: '14:30', pause: 30 },
  27: { code: 'CQ1', start: '06:00', end: '14:30', pause: 30 },
  28: { code: 'TR6', start: '15:00', end: '23:00', pause: 30 },
  29: { code: 'TR6', start: '15:00', end: '23:00', pause: 30 },
  30: 'weekend',
  31: 'weekend',
};

export default function PlanningScreen() {
  const TODAY_DAY = 25;
  const DAYS_IN_MONTH = 31;
  const FIRST_DOW = 4; // Mon=0 ... Fri=4
  const [selected, setSelected] = React.useState(TODAY_DAY);
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const cells = [];
  for (let i = 0; i < FIRST_DOW; i++) cells.push({ blank: true, key: 'b' + i });
  for (let d = 1; d <= DAYS_IN_MONTH; d++) cells.push({ day: d, key: 'd' + d });
  while (cells.length % 7 !== 0) cells.push({ blank: true, key: 'b2-' + cells.length });

  const onPick = (d) => { setSelected(d); setSheetOpen(true); };
  const sel = SHIFTS[selected];

  const dayCell = (cell) => {
    if (cell.blank) return <div key={cell.key} style={{ aspectRatio: '1' }}/>;
    const d = cell.day;
    const data = SHIFTS[d];
    const dow = (FIRST_DOW + d - 1) % 7;
    const isWeekend = dow === 5 || dow === 6;
    const isToday = d === TODAY_DAY;
    const isSelected = d === selected;
    const hasShift = typeof data === 'object';
    const isOff = data === 'off';

    let bg = '#fff', fg = 'var(--ink)', border = '1px solid #ececf1', shadow = '0 1px 2px rgba(15,15,40,.03)';
    if (isWeekend && !hasShift) { bg = '#fdeef6'; fg = '#a8527a'; border = '1px solid #fadce9'; shadow = 'none'; }
    else if (isOff) { bg = '#f1f1f5'; fg = '#9b9bab'; border = '1px solid #ececf1'; shadow = 'none'; }
    if (isSelected) { bg = 'var(--magenta)'; fg = '#fff'; border = '1px solid var(--magenta)'; shadow = '0 6px 14px -6px rgba(233,30,140,.55)'; }
    else if (isToday) { border = '2px solid var(--magenta)'; }

    return (
      <button key={cell.key} onClick={() => onPick(d)} className="tappable" style={{
        aspectRatio: '1', background: bg, color: fg, border, boxShadow: shadow,
        borderRadius: 10, padding: 4, cursor: 'pointer', fontFamily: 'inherit',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'space-between',
        position: 'relative',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>{d}</span>
        {hasShift && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: '.04em',
              color: isSelected ? '#fff' : 'var(--ink)',
            }}>{data.code}</span>
            <span style={{
              width: 5, height: 5, borderRadius: 999,
              background: isSelected ? '#fff' : 'var(--magenta)',
            }}/>
          </div>
        )}
      </button>
    );
  };

  return (
    <div className="fade-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f7f7fb', position: 'relative', minHeight: 0 }}>
      <div style={{
        background: '#fff',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 20px 16px',
        borderBottom: '1px solid #ececf1',
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--magenta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Planning</div>

        <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="tappable" style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid #ececf1', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink)',
          }}><Icon.ChevronLeft size={20}/></button>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)', whiteSpace: 'nowrap' }}>Mai&nbsp;2026</div>
          <button className="tappable" style={{
            width: 36, height: 36, borderRadius: 10, border: '1px solid #ececf1', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink)',
          }}><Icon.ChevronRight size={20}/></button>
        </div>

        <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'].map((d, i) => (
            <div key={d} style={{
              fontSize: 11, fontWeight: 700, textAlign: 'center',
              color: i >= 5 ? '#c98aaa' : 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase',
            }}>{d}</div>
          ))}
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 200px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {cells.map(dayCell)}
        </div>

        <div style={{ marginTop: 16, padding: '12px 14px', background: '#fff', border: '1px solid #ececf1', borderRadius: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Légende</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 14, height: 14, borderRadius: 4, background: '#fff', border: '1px solid #ececf1', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--magenta)' }}/>
              </span> Service
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 4, background: '#f1f1f5' }}/> Repos</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 4, background: '#fdeef6' }}/> Week-end</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 14, height: 14, borderRadius: 4, border: '2px solid var(--magenta)' }}/> Aujourd'hui</div>
          </div>
        </div>
      </div>

      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        padding: '14px 16px 14px',
        background: 'linear-gradient(to top, #fff 70%, rgba(255,255,255,0))',
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto' }}>
          <div style={{
            background: '#fff', border: '1px solid #ececf1', borderRadius: 14,
            padding: '12px 14px', boxShadow: '0 4px 12px rgba(15,15,40,.06)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Planifiées</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>155.75h</div>
            </div>
            <div style={{ width: 1, height: 30, background: '#ececf1' }}/>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Effectuées</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--magenta)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>89.5h</div>
            </div>
          </div>
          <button className="tappable" style={{
            marginTop: 10, width: '100%', height: 50, border: 0, borderRadius: 14,
            background: 'var(--magenta)', color: '#fff',
            fontFamily: 'inherit', fontWeight: 700, fontSize: 15,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 8px 20px -8px rgba(233,30,140,.55)',
          }}>
            Importer mon roster PDF
          </button>
        </div>
      </div>

      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{
            position: 'absolute', inset: 0, background: 'rgba(15,15,40,.35)', zIndex: 10,
            animation: 'sheetFade .2s ease',
          }}/>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
            padding: '10px 22px calc(env(safe-area-inset-bottom, 0px) + 24px)', zIndex: 11,
            animation: 'sheetUp .25s cubic-bezier(.2,.8,.2,1)',
          }}>
            <div style={{ width: 44, height: 5, background: '#e0e0ea', borderRadius: 999, margin: '0 auto 14px' }}/>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                  {selected} mai 2026
                </div>
                <div style={{ marginTop: 4, fontSize: 22, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em' }}>
                  {typeof sel === 'object' ? `Shift ${sel.code}` : sel === 'off' ? 'Jour de repos' : 'Week-end'}
                </div>
              </div>
              {typeof sel === 'object' && (
                <span style={{
                  background: 'var(--magenta)', color: '#fff', fontSize: 12, fontWeight: 800,
                  padding: '6px 10px', borderRadius: 8, letterSpacing: '.06em',
                }}>{sel.code}</span>
              )}
            </div>

            {typeof sel === 'object' ? (
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Beginn', value: sel.start },
                  { label: 'Ende',   value: sel.end },
                  { label: 'Pause',  value: `${sel.pause} min` },
                ].map(x => (
                  <div key={x.label} style={{
                    background: '#fafafd', border: '1px solid #ececf1', borderRadius: 12, padding: '10px 12px',
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.08em', textTransform: 'uppercase' }}>{x.label}</div>
                    <div style={{ marginTop: 4, fontSize: 18, fontWeight: 800, color: 'var(--ink)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{x.value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 14, fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
                Profitez de votre journée — aucun service planifié.
              </div>
            )}

            <button onClick={() => setSheetOpen(false)} className="tappable" style={{
              marginTop: 18, width: '100%', height: 46, border: '1.5px solid #e7e7ee', background: '#fff',
              borderRadius: 12, fontFamily: 'inherit', fontWeight: 700, fontSize: 14, color: 'var(--ink)', cursor: 'pointer',
            }}>Fermer</button>
          </div>
        </>
      )}
    </div>
  );
}
