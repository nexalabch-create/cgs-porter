import React from 'react';
import { Icon } from '../components/Icons.jsx';
import { StatusPill } from './Services.jsx';
import { findPorter, porterDisplayName } from '../data/porters.js';
import { totalChfFor, DEFAULT_TARIFF } from '../lib/pricing.js';

function fmtTimer(sec) {
  const h = String(Math.floor(sec / 3600)).padStart(2, '0');
  const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
  const s = String(sec % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function InfoRow({ icon: Ico, label, value, mono = false, accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderTop: '1px solid #f1f1f5' }}>
      <div style={{
        width: 36, height: 36, borderRadius: 10, background: '#fcecf4',
        color: 'var(--magenta)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Ico size={17} stroke={2}/>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.08em' }}>{label}</div>
        <div style={{
          marginTop: 2, fontSize: 15, fontWeight: 600,
          color: accent || 'var(--ink)', letterSpacing: '-.005em',
          fontFamily: mono ? 'JetBrains Mono, monospace' : 'inherit',
        }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function Stepper({ value, onChange, min = 0, max = 99 }) {
  const btn = (disabled) => ({
    width: 40, height: 40, border: '1.5px solid #e7e7ee', background: '#fff',
    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? .4 : 1, color: 'var(--ink)',
  });
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button className="tappable" disabled={value <= min} onClick={() => onChange(Math.max(min, value - 1))} style={btn(value <= min)}>
        <Icon.Minus/>
      </button>
      <div style={{
        minWidth: 56, textAlign: 'center',
        fontSize: 22, fontWeight: 800, letterSpacing: '-.02em',
        color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
      }}>{value}</div>
      <button className="tappable" disabled={value >= max} onClick={() => onChange(Math.min(max, value + 1))} style={btn(value >= max)}>
        <Icon.Plus/>
      </button>
    </div>
  );
}

export default function DetailScreen({ service, user, onBack, onUpdate, onAssign, onSelfAssign }) {
  const isChef = user?.role === 'chef';
  const isAssignedToMe = service.assignedPorterId === user?.id;
  const assignedPorter = findPorter(service.assignedPorterId);
  // Chef sees the porter timer/CTA flow only on services they took themselves.
  const showPorterControls = !isChef || isAssignedToMe;

  const [bags, setBags] = React.useState(service.bags);
  const [remarques, setRemarques] = React.useState(service.remarques || '');
  const [status, setStatus] = React.useState(service.status);
  const [elapsed, setElapsed] = React.useState(service.elapsed || 0);
  const [savedTick, setSavedTick] = React.useState(false);

  // Per-source pricing — see src/lib/pricing.js for the source-of-truth.
  const isPrivateLike = ['prive', 'web', 'guichet'].includes(service.source);
  const BASE = isPrivateLike ? DEFAULT_TARIFF.prive_base_chf : DEFAULT_TARIFF.dnata_swissport_base_chf;
  const PRICE_PER_BAG = isPrivateLike ? DEFAULT_TARIFF.prive_extra_bag_chf : DEFAULT_TARIFF.dnata_swissport_extra_bag_chf;
  const INCLUDED = DEFAULT_TARIFF.bags_included_in_base;
  const price = totalChfFor({ source: service.source, bags });

  React.useEffect(() => {
    if (status !== 'active') return;
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [status]);

  React.useEffect(() => {
    onUpdate && onUpdate({ ...service, bags, price, remarques, status, elapsed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bags, remarques, status, elapsed]);

  const remarqueTimer = React.useRef(null);
  const onRemarqueChange = (v) => {
    setRemarques(v);
    clearTimeout(remarqueTimer.current);
    remarqueTimer.current = setTimeout(() => {
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 1200);
    }, 400);
  };

  const start = () => { setStatus('active'); setElapsed(0); };
  const end = () => { setStatus('done'); };

  return (
    <div className="fade-enter" style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f7f7fb', minHeight: 0 }}>
      <div style={{
        background: '#fff',
        padding: 'calc(env(safe-area-inset-top, 0px) + 14px) 8px 18px 8px',
        borderBottom: '1px solid #ececf1',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="tappable" onClick={onBack} style={{
            width: 40, height: 40, borderRadius: 10, border: 0, background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--ink)',
          }}>
            <Icon.ChevronLeft/>
          </button>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.1em', textTransform: 'uppercase' }}>Service</div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: '-.01em', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
              {service.flight} · {service.time}
            </div>
          </div>
          <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <StatusPill status={status}/>
          </div>
        </div>
      </div>

      <div className="scroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 24px' }}>
        <div style={{
          position: 'relative', background: '#fff', borderRadius: 18,
          border: '1px solid #ececf1', padding: '18px 18px 16px 22px', overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(15,15,40,.04)',
        }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: 'var(--magenta)' }}/>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--magenta)', letterSpacing: '.14em', textTransform: 'uppercase' }}>Client</div>
          <div className="display" style={{ marginTop: 6, fontSize: 28, fontWeight: 700, letterSpacing: '-.035em', color: 'var(--ink)', lineHeight: 1.05 }}>
            {service.client}
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f6f6fa', color: 'var(--ink)', fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 8 }}>
              <Icon.Plane size={12}/> {service.flight}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f6f6fa', color: 'var(--ink)', fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 8 }}>
              <Icon.Clock size={12}/> {service.time}
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eaeaf3', color: 'var(--navy)', fontSize: 12, fontWeight: 700, padding: '4px 8px', borderRadius: 8 }}>
              {service.flow}
            </span>
          </div>

          {status === 'active' && (
            <div style={{
              marginTop: 14, padding: '12px 14px', borderRadius: 12,
              background: '#e8f8f1', border: '1px solid #b9ecd2',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--green)' }} className="pulse"/>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#047857', letterSpacing: '.1em', textTransform: 'uppercase' }}>En cours</div>
              <div style={{
                marginLeft: 'auto',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: 24, fontWeight: 700,
                color: '#047857', letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums',
              }}>{fmtTimer(elapsed)}</div>
            </div>
          )}
          {status === 'done' && (
            <div style={{
              marginTop: 14, padding: '10px 14px', borderRadius: 12,
              background: '#eaeaf3', border: '1px solid #d3d3e6',
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, fontWeight: 600, color: 'var(--navy)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: 'var(--navy)' }}/>
              Terminé en {fmtTimer(elapsed)}
            </div>
          )}
        </div>

        <div style={{
          marginTop: 12, background: '#fff', borderRadius: 18,
          border: '1px solid #ececf1', padding: '4px 18px',
          boxShadow: '0 1px 2px rgba(15,15,40,.04)',
        }}>
          <InfoRow icon={Icon.Pin} label="Point de rencontre" value={service.meeting}/>
          <InfoRow icon={Icon.Bag} label="Bagages" value={`${bags} pièce${bags > 1 ? 's' : ''}`}/>
          <InfoRow icon={Icon.Cash} label="Prix" value={`CHF ${price}.–`} accent="var(--navy)" mono/>
          <InfoRow icon={Icon.Building} label="Agence" value={service.agency}/>
          <InfoRow icon={Icon.Phone} label="Téléphone" value={service.phone} mono/>
        </div>

        {isChef && (
          <div style={{
            marginTop: 12, background: '#fff', borderRadius: 18,
            border: '1px solid #ececf1', padding: '16px 18px',
            boxShadow: '0 1px 2px rgba(15,15,40,.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', letterSpacing: '.14em', textTransform: 'uppercase' }}>
                Assignation
              </div>
              {assignedPorter ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#fafafd', border: '1px solid #ececf1',
                  fontSize: 11, fontWeight: 700, color: 'var(--ink)',
                  padding: '3px 8px 3px 3px', borderRadius: 999, letterSpacing: '-.005em',
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 999,
                    background: 'linear-gradient(135deg, #fce0ee, #fcb6da)',
                    color: 'var(--magenta)', fontSize: 9, fontWeight: 800,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  }}>{assignedPorter.initials}</span>
                  {porterDisplayName(assignedPorter)}
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#fee2e2', color: '#b91c1c',
                  fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 8,
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: '#dc2626' }}/>
                  Non assigné
                </span>
              )}
            </div>

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button onClick={() => onAssign && onAssign(service.id)} className="tappable" style={{
                flex: 1, height: 44, border: 0, borderRadius: 12,
                background: 'var(--magenta)', color: '#fff',
                fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                boxShadow: '0 6px 14px -8px rgba(233,30,140,.55)',
              }}>
                {assignedPorter ? 'Réassigner' : 'Assigner un porteur'}
              </button>
              {!isAssignedToMe && (
                <button onClick={() => onSelfAssign && onSelfAssign(service.id)} className="tappable" style={{
                  flex: 1, height: 44, border: '1.5px solid var(--navy)', background: '#fff',
                  color: 'var(--navy)', borderRadius: 12,
                  fontFamily: 'inherit', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                }}>
                  Je le fais
                </button>
              )}
            </div>
          </div>
        )}


        {showPorterControls && (
        <div style={{
          marginTop: 12, background: '#fff', borderRadius: 18,
          border: '1px solid #ececf1', padding: '16px 18px',
          boxShadow: '0 1px 2px rgba(15,15,40,.04)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>Ajustements</div>
            <div style={{
              fontSize: 11, fontWeight: 600, color: savedTick ? 'var(--green)' : '#aaaab8',
              transition: 'color .2s', letterSpacing: '.06em', textTransform: 'uppercase',
            }}>{savedTick ? '✓ Enregistré' : 'Auto-sauvegarde'}</div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Nombre de bagages</div>
              <div style={{ marginTop: 2, fontSize: 12, color: 'var(--muted)' }}>
                {isPrivateLike ? 'Privé' : 'DNATA / Swissport'} · {INCLUDED} bagages inclus dès {BASE} CHF, +{PRICE_PER_BAG} CHF par bagage
              </div>
            </div>
            <Stepper value={bags} onChange={setBags} min={1} max={20}/>
          </div>

          <div style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 12,
            background: '#fafafd', border: '1px solid #ececf1',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>
              {bags <= INCLUDED
                ? `Forfait ${INCLUDED} bagages`
                : `${BASE} + ${bags - INCLUDED} × ${PRICE_PER_BAG}`}
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy)', letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>
              CHF {price}.–
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Remarques</div>
            <textarea
              value={remarques}
              onChange={(e) => onRemarqueChange(e.target.value)}
              placeholder="Bagage fragile, fauteuil roulant, allergie…"
              rows={3}
              style={{
                marginTop: 8, width: '100%', resize: 'none',
                fontFamily: 'inherit', fontSize: 14, color: 'var(--ink)',
                padding: '10px 12px', borderRadius: 12,
                border: '1.5px solid #e7e7ee', outline: 'none', background: '#fff',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--magenta)'}
              onBlur={(e) => e.target.style.borderColor = '#e7e7ee'}
            />
          </div>
        </div>
        )}

        {showPorterControls && (
        <div style={{ marginTop: 18 }}>
          {status === 'todo' && (
            <button onClick={start} className="tappable" style={{
              width: '100%', height: 58, border: 0, borderRadius: 16,
              background: 'var(--green)', color: '#fff',
              fontFamily: 'inherit', fontSize: 17, fontWeight: 800, letterSpacing: '.02em',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 10px 24px -10px rgba(16,185,129,.6), 0 2px 4px rgba(16,185,129,.2)',
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: '#fff' }}/>
              DÉMARRER LE SERVICE
            </button>
          )}
          {status === 'active' && (
            <button onClick={end} className="tappable" style={{
              width: '100%', height: 58, border: 0, borderRadius: 16,
              background: 'var(--red)', color: '#fff',
              fontFamily: 'inherit', fontSize: 17, fontWeight: 800, letterSpacing: '.02em',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              boxShadow: '0 10px 24px -10px rgba(239,68,68,.6), 0 2px 4px rgba(239,68,68,.2)',
            }}>
              <span style={{ width: 12, height: 12, borderRadius: 2, background: '#fff' }}/>
              TERMINER LE SERVICE
            </button>
          )}
          {status === 'done' && (
            <button onClick={onBack} className="tappable" style={{
              width: '100%', height: 56, border: 0, borderRadius: 16,
              background: 'var(--navy)', color: '#fff',
              fontFamily: 'inherit', fontSize: 16, fontWeight: 700,
              cursor: 'pointer',
            }}>
              Retour aux services
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
