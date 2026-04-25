#!/usr/bin/env node
/**
 * Build the French pitch deck for CGS leadership.
 * Output: presentation/CGS-Porter-Pitch.pptx
 *
 * Design follows the anthropics/skills@pptx guidelines:
 * - 16:9 widescreen
 * - Brand-driven palette (CGS magenta + navy)
 * - Visual motif: magenta accent rectangle on titles + cards
 * - Dark cover/closing, light interior ("sandwich" structure)
 * - Every slide has a visual element (screenshot, icon area, or callout cards)
 *
 * Run: node scripts/build-deck.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import pptxgen from 'pptxgenjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SHOTS = path.join(ROOT, 'presentation', 'screenshots');
const LOGO = path.join(ROOT, 'public', 'logo-cgs.png');
const OUT = path.join(ROOT, 'presentation', 'CGS-Porter-Pitch.pptx');

// ── Palette (no # — pptxgenjs requires bare 6-char hex) ────────────
const C = {
  magenta:    'E91E8C',
  magentaDk:  'C2185B',
  magentaLt:  'F8BBD0',
  navy:       '1A1A5E',
  navyLt:     '4A4A8A',
  ink:        '0F172A',
  muted:      '64748B',
  bg:         'FAFAF7',
  card:       'FFFFFF',
  white:      'FFFFFF',
  amber:      'F59E0B',
  emerald:    '10B981',
};

const FONTS = { head: 'Calibri', body: 'Calibri' };

// Slide dimensions (LAYOUT_16x9 = 10 × 5.625 in)
const SW = 10, SH = 5.625;

const pres = new pptxgen();
pres.layout = 'LAYOUT_16x9';
pres.author = 'Mate Torgvaidze';
pres.company = 'CGS Geneva';
pres.title = 'CGS Porter — Pitch interne';
pres.subject = 'Présentation à la direction CGS';

// ── Factory helpers ───────────────────────────────────────────────
const shadowSoft = () => ({ type: 'outer', blur: 12, offset: 3, angle: 90, color: '000000', opacity: 0.10 });
const shadowCard = () => ({ type: 'outer', blur: 8,  offset: 2, angle: 90, color: '000000', opacity: 0.08 });

function pageNumber(slide, num, total) {
  // Bottom-right page indicator with magenta dot
  slide.addShape(pres.shapes.OVAL, {
    x: SW - 1.25, y: SH - 0.32, w: 0.10, h: 0.10,
    fill: { color: C.magenta }, line: { color: C.magenta },
  });
  slide.addText(`${num} / ${total}`, {
    x: SW - 1.05, y: SH - 0.40, w: 0.80, h: 0.25,
    fontFace: FONTS.body, fontSize: 9, color: C.muted, align: 'left', valign: 'middle',
    margin: 0,
  });
}

// Absolute slide index tracker (used for footer page numbers).
// Reset to 0 before composition; every slide builder calls bumpSlide()
// before drawing so cover=1, partie-1=2, etc.
let _slideIdx = 0;
const TOTAL_SLIDES = 29;
const bumpSlide = () => ++_slideIdx;

function footerBrand(slide) {
  slide.addText('CGS Porter', {
    x: 0.4, y: SH - 0.40, w: 2.0, h: 0.25,
    fontFace: FONTS.head, fontSize: 9, color: C.magenta,
    bold: true, charSpacing: 4, margin: 0,
  });
}

function magentaAccent(slide, x, y, h = 0.6) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 0.08, h,
    fill: { color: C.magenta }, line: { color: C.magenta },
  });
}

function slideTitle(slide, title, kicker) {
  // Magenta accent + kicker (small uppercase label) + big title
  if (kicker) {
    slide.addText(kicker, {
      x: 0.55, y: 0.35, w: 9, h: 0.25,
      fontFace: FONTS.head, fontSize: 10, color: C.magenta,
      bold: true, charSpacing: 6, margin: 0,
    });
    slide.addText(title, {
      x: 0.5, y: 0.62, w: 9, h: 0.7,
      fontFace: FONTS.head, fontSize: 28, color: C.navy,
      bold: true, margin: 0,
    });
  } else {
    slide.addText(title, {
      x: 0.5, y: 0.4, w: 9, h: 0.8,
      fontFace: FONTS.head, fontSize: 30, color: C.navy,
      bold: true, margin: 0,
    });
  }
}

// ── Slide builders ────────────────────────────────────────────────

function coverSlide() {
  bumpSlide();
  const slide = pres.addSlide();
  slide.background = { color: C.navy };

  // Magenta full-bleed left strip
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 3.2, h: SH,
    fill: { color: C.magenta }, line: { color: C.magenta },
  });

  // Logo (top-left in the magenta strip)
  if (fs.existsSync(LOGO)) {
    slide.addImage({ path: LOGO, x: 0.5, y: 0.5, w: 1.1, h: 1.1 });
  }

  // Strip kicker
  slide.addText('PROJET INTERNE', {
    x: 0.5, y: 4.7, w: 2.5, h: 0.3,
    fontFace: FONTS.head, fontSize: 11, color: C.white,
    bold: true, charSpacing: 8, margin: 0,
  });
  slide.addText('CGS Geneva', {
    x: 0.5, y: 5.0, w: 2.5, h: 0.3,
    fontFace: FONTS.body, fontSize: 11, color: C.magentaLt, margin: 0,
  });

  // Right side — title block
  slide.addText('CGS Porter', {
    x: 3.7, y: 1.5, w: 6.0, h: 0.9,
    fontFace: FONTS.head, fontSize: 54, color: C.white,
    bold: true, margin: 0,
  });
  slide.addText('L\'outil interne pour notre équipe au sol à GVA', {
    x: 3.7, y: 2.45, w: 6.0, h: 0.55,
    fontFace: FONTS.head, fontSize: 18, color: C.magentaLt, margin: 0,
  });

  // Divider line
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 3.7, y: 3.3, w: 0.7, h: 0.04,
    fill: { color: C.magenta }, line: { color: C.magenta },
  });

  slide.addText([
    { text: 'Présenté par ', options: { color: 'B0B0CF', fontSize: 12 } },
    { text: 'Mate Torgvaidze', options: { color: C.white, fontSize: 12, bold: true } },
    { text: '   ·   Chef d\'équipe CGS Porter', options: { color: 'B0B0CF', fontSize: 12, breakLine: true } },
    { text: 'Avril 2026', options: { color: 'B0B0CF', fontSize: 11, italic: true } },
  ], {
    x: 3.7, y: 3.55, w: 6.0, h: 0.9,
    fontFace: FONTS.body, margin: 0,
  });

  // No page number on cover
}

function sectionBreak(label, sub) {
  bumpSlide();
  const slide = pres.addSlide();
  slide.background = { color: C.navy };

  // Small magenta accent rule (contained, not bleeding off slide edge)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: SH/2 - 0.06, w: 0.9, h: 0.06,
    fill: { color: C.magenta }, line: { color: C.magenta },
  });

  slide.addText(label.toUpperCase(), {
    x: 1.6, y: SH/2 - 0.6, w: 8, h: 0.5,
    fontFace: FONTS.head, fontSize: 12, color: C.magenta,
    bold: true, charSpacing: 8, margin: 0,
  });
  slide.addText(sub, {
    x: 1.6, y: SH/2 - 0.05, w: 8, h: 1.0,
    fontFace: FONTS.head, fontSize: 36, color: C.white,
    bold: true, margin: 0,
  });

  // Bottom-right: small CGS logo
  if (fs.existsSync(LOGO)) {
    slide.addImage({ path: LOGO, x: SW - 0.95, y: SH - 0.95, w: 0.6, h: 0.6, transparency: 30 });
  }
}

function bulletTextSlide(kicker, title, bullets, accentColor = C.magenta) {
  const num = bumpSlide();
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  slideTitle(slide, title, kicker);
  magentaAccent(slide, 0, 0, SH);  // tiny left edge motif

  // Cards row of 3 if 3 bullets, otherwise vertical list
  if (bullets.length === 3) {
    const cardW = 2.85, cardH = 2.6, gap = 0.25;
    const startX = (SW - (cardW * 3 + gap * 2)) / 2;
    bullets.forEach((b, i) => {
      const x = startX + i * (cardW + gap);
      const y = 1.7;
      slide.addShape(pres.shapes.RECTANGLE, {
        x, y, w: cardW, h: cardH,
        fill: { color: C.card }, line: { color: 'E2E8F0', width: 0.5 },
        shadow: shadowCard(),
      });
      // Number badge
      slide.addShape(pres.shapes.OVAL, {
        x: x + 0.3, y: y + 0.3, w: 0.55, h: 0.55,
        fill: { color: accentColor }, line: { color: accentColor },
      });
      slide.addText(String(i + 1), {
        x: x + 0.3, y: y + 0.3, w: 0.55, h: 0.55,
        fontFace: FONTS.head, fontSize: 18, color: C.white,
        bold: true, align: 'center', valign: 'middle', margin: 0,
      });
      slide.addText(b.title, {
        x: x + 0.3, y: y + 1.0, w: cardW - 0.6, h: 0.45,
        fontFace: FONTS.head, fontSize: 16, color: C.navy,
        bold: true, margin: 0,
      });
      slide.addText(b.desc, {
        x: x + 0.3, y: y + 1.5, w: cardW - 0.6, h: cardH - 1.7,
        fontFace: FONTS.body, fontSize: 11, color: C.muted, margin: 0,
      });
    });
  } else {
    // Vertical bulleted list
    slide.addText(
      bullets.map((b, i) => ({
        text: typeof b === 'string' ? b : `${b.title}. ${b.desc || ''}`,
        options: { bullet: true, breakLine: i < bullets.length - 1, color: C.ink, fontSize: 14 },
      })),
      {
        x: 0.7, y: 1.6, w: SW - 1.4, h: SH - 2.4,
        fontFace: FONTS.body, paraSpaceAfter: 12, valign: 'top',
      }
    );
  }

  footerBrand(slide);
  pageNumber(slide, num, TOTAL_SLIDES);
}

function statsSlide(kicker, title, stats) {
  const num = bumpSlide();
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  slideTitle(slide, title, kicker);
  magentaAccent(slide, 0, 0, SH);

  const cardW = (SW - 1.0 - 0.3 * (stats.length - 1)) / stats.length;
  const y = 1.85;
  stats.forEach((s, i) => {
    const x = 0.5 + i * (cardW + 0.3);
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: 2.5,
      fill: { color: C.card }, line: { color: 'E2E8F0', width: 0.5 },
      shadow: shadowCard(),
    });
    // Magenta accent strip on top
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w: cardW, h: 0.08,
      fill: { color: s.color || C.magenta }, line: { color: s.color || C.magenta },
    });
    slide.addText(s.value, {
      x: x + 0.2, y: y + 0.4, w: cardW - 0.4, h: 1.0,
      fontFace: FONTS.head, fontSize: 44, color: s.color || C.magenta,
      bold: true, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(s.label, {
      x: x + 0.2, y: y + 1.4, w: cardW - 0.4, h: 0.4,
      fontFace: FONTS.head, fontSize: 13, color: C.navy,
      bold: true, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(s.sub, {
      x: x + 0.2, y: y + 1.8, w: cardW - 0.4, h: 0.6,
      fontFace: FONTS.body, fontSize: 10, color: C.muted,
      align: 'center', valign: 'top', margin: 0,
    });
  });

  footerBrand(slide);
  pageNumber(slide, num, TOTAL_SLIDES);
}

function screenshotSlide(kicker, title, imgFile, captions) {
  const num = bumpSlide();
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  slideTitle(slide, title, kicker);
  magentaAccent(slide, 0, 0, SH);

  // Right-side big screenshot — 5.4" wide × ~3.6" tall, vertically centered in body
  const imgX = 4.3, imgY = 1.5, imgW = 5.5, imgH = 3.5;

  // Subtle shadow behind image (rectangle slightly offset)
  slide.addShape(pres.shapes.RECTANGLE, {
    x: imgX + 0.05, y: imgY + 0.06, w: imgW, h: imgH,
    fill: { color: '000000', transparency: 80 }, line: { color: '000000', transparency: 100 },
  });
  slide.addImage({
    path: path.join(SHOTS, imgFile),
    x: imgX, y: imgY, w: imgW, h: imgH,
    sizing: { type: 'contain', w: imgW, h: imgH },
  });
  // Border around image
  slide.addShape(pres.shapes.RECTANGLE, {
    x: imgX, y: imgY, w: imgW, h: imgH,
    fill: { color: 'FFFFFF', transparency: 100 },
    line: { color: C.muted, width: 0.5, transparency: 60 },
  });

  // Left-side captions (icon + bold + desc rows)
  const startY = 1.7;
  const rowH = 0.85;
  captions.forEach((c, i) => {
    const y = startY + i * rowH;
    slide.addShape(pres.shapes.OVAL, {
      x: 0.6, y: y + 0.08, w: 0.35, h: 0.35,
      fill: { color: C.magenta }, line: { color: C.magenta },
    });
    slide.addText(String(i + 1), {
      x: 0.6, y: y + 0.08, w: 0.35, h: 0.35,
      fontFace: FONTS.head, fontSize: 11, color: C.white,
      bold: true, align: 'center', valign: 'middle', margin: 0,
    });
    slide.addText(c.title, {
      x: 1.05, y: y, w: 3.1, h: 0.3,
      fontFace: FONTS.head, fontSize: 13, color: C.navy,
      bold: true, margin: 0,
    });
    slide.addText(c.desc, {
      x: 1.05, y: y + 0.32, w: 3.1, h: rowH - 0.32,
      fontFace: FONTS.body, fontSize: 10.5, color: C.muted, margin: 0,
    });
  });

  footerBrand(slide);
  pageNumber(slide, num, TOTAL_SLIDES);
}

function dualScreenshotSlide(kicker, title, imgLeft, imgRight, caption, mode = 'landscape') {
  const num = bumpSlide();
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  slideTitle(slide, title, kicker);
  magentaAccent(slide, 0, 0, SH);

  // Landscape mode: 4.4×3.4 boxes (admin screenshots).
  // Mobile mode: portrait 9:19.5 ratio → 1.85×4.0 boxes side-by-side, centered.
  // Mixed mode: landscape laptop on left, portrait phone on right.
  let placements;
  if (mode === 'mobile') {
    const w = 1.85, h = 4.0;
    placements = [
      { x: SW/2 - w - 0.25, y: 1.4, w, h, file: imgLeft },
      { x: SW/2 + 0.25,     y: 1.4, w, h, file: imgRight },
    ];
  } else if (mode === 'mixed') {
    placements = [
      { x: 0.5, y: 1.4, w: 5.0, h: 3.5, file: imgLeft },                 // landscape laptop
      { x: 7.0, y: 1.2, w: 1.85, h: 3.9, file: imgRight },               // portrait phone
    ];
  } else {
    placements = [
      { x: 0.5,            y: 1.4, w: 4.4, h: 3.4, file: imgLeft },
      { x: SW - 0.5 - 4.4, y: 1.4, w: 4.4, h: 3.4, file: imgRight },
    ];
  }

  placements.forEach(({ x, y, w, h, file }) => {
    slide.addImage({
      path: path.join(SHOTS, file),
      x, y, w, h,
      sizing: { type: 'contain', w, h },
    });
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y, w, h,
      fill: { color: 'FFFFFF', transparency: 100 },
      line: { color: C.muted, width: 0.5, transparency: 60 },
    });
  });

  if (caption) {
    slide.addText(caption, {
      x: 0.7, y: SH - 0.85, w: SW - 1.4, h: 0.45,
      fontFace: FONTS.body, fontSize: 12, color: C.muted,
      italic: true, align: 'center', margin: 0,
    });
  }

  footerBrand(slide);
  pageNumber(slide, num, TOTAL_SLIDES);
}

function mobileTripleSlide(kicker, title, imgs, caption) {
  // Three mobile screenshots side by side, portrait 9:19.5 ratio
  const num = bumpSlide();
  const slide = pres.addSlide();
  slide.background = { color: C.bg };
  slideTitle(slide, title, kicker);
  magentaAccent(slide, 0, 0, SH);

  const imgY = 1.4, imgH = 4.0, imgW = 1.85, gap = 0.3;
  const startX = (SW - (imgW * 3 + gap * 2)) / 2;
  imgs.forEach((file, i) => {
    const x = startX + i * (imgW + gap);
    slide.addImage({
      path: path.join(SHOTS, file),
      x, y: imgY, w: imgW, h: imgH,
      sizing: { type: 'contain', w: imgW, h: imgH },
    });
  });

  if (caption) {
    slide.addText(caption, {
      x: 0.7, y: SH - 0.85, w: SW - 1.4, h: 0.45,
      fontFace: FONTS.body, fontSize: 12, color: C.muted,
      italic: true, align: 'center', margin: 0,
    });
  }

  footerBrand(slide);
  pageNumber(slide, num, TOTAL_SLIDES);
}

function closingSlide() {
  bumpSlide();
  const slide = pres.addSlide();
  slide.background = { color: C.magenta };

  // Big text
  slide.addText('Merci', {
    x: 0.5, y: 1.5, w: 9, h: 1.4,
    fontFace: FONTS.head, fontSize: 96, color: C.white,
    bold: true, align: 'center', valign: 'middle', margin: 0,
  });
  slide.addText('Questions, idées, retours bienvenus.', {
    x: 0.5, y: 3.0, w: 9, h: 0.5,
    fontFace: FONTS.head, fontSize: 18, color: C.white,
    align: 'center', italic: true, margin: 0,
  });

  // Contact card
  const cardW = 5.0, cardH = 0.7;
  const cx = (SW - cardW) / 2, cy = 4.0;
  slide.addShape(pres.shapes.RECTANGLE, {
    x: cx, y: cy, w: cardW, h: cardH,
    fill: { color: C.white }, line: { color: C.white },
    shadow: shadowSoft(),
  });
  slide.addText([
    { text: 'Mate Torgvaidze', options: { bold: true, color: C.navy, fontSize: 13 } },
    { text: '   ·   ', options: { color: C.muted, fontSize: 13 } },
    { text: 'mate.torgvaidze@cgs-ltd.com', options: { color: C.magenta, fontSize: 13, bold: true } },
  ], {
    x: cx, y: cy, w: cardW, h: cardH,
    fontFace: FONTS.body, align: 'center', valign: 'middle', margin: 0,
  });

  if (fs.existsSync(LOGO)) {
    slide.addImage({
      path: LOGO,
      x: (SW - 0.8) / 2, y: SH - 0.95, w: 0.8, h: 0.8,
      transparency: 25,
    });
  }
}

// ─────────────────────────────────────────────────────────────────
// Build the deck — slide order matters; bumpSlide() handles numbering.
// ─────────────────────────────────────────────────────────────────

// 1. Cover
coverSlide();

// 2. Section: Le problème
sectionBreak('Partie 1', 'Le problème : aujourd\'hui, on perd du temps');

// 3. État actuel
bulletTextSlide('CONSTAT TERRAIN', 'Aujourd\'hui : papier, WhatsApp, Excel', [
  { title: 'Plannings papier', desc: 'Le tournus arrive imprimé. On perd les feuilles, on n\'a pas l\'historique.' },
  { title: 'Assignations WhatsApp', desc: 'Le chef envoie les services par message. Pas de suivi qui a fait quoi.' },
  { title: 'Facturation Excel', desc: 'Tarifs DNATA, Swissport, Privé saisis à la main chaque jour. Erreurs fréquentes.' },
]);

// 4. Conséquences (stats — unified magenta accent)
statsSlide('IMPACT', 'Ce que ça nous coûte', [
  { value: '~40 min', label: 'par jour', sub: 'à compter et facturer manuellement', color: C.magenta },
  { value: '5–8 %', label: 'd\'erreurs', sub: 'sur les factures clients', color: C.magenta },
  { value: '0', label: 'visibilité', sub: 'temps réel sur l\'équipe et la charge', color: C.magenta },
]);

// 5. Section: La solution
sectionBreak('Partie 2', 'La solution : une seule app, deux interfaces');

// 6. Solution overview — admin landscape + mobile portrait. Use mobile mode
// since the right image is portrait; admin will be cropped to fit.
dualScreenshotSlide('VISION', 'Un panel pour les chefs, une PWA pour les porteurs',
  'admin-02-dashboard.png', 'mobile-03-chef-home.png',
  'À gauche : panel web pour les chefs et la direction · À droite : application mobile pour les porteurs et chefs sur le terrain',
  'mixed');

// 7. Architecture
bulletTextSlide('ARCHITECTURE', 'Comment c\'est construit', [
  { title: 'React PWA', desc: 'Hébergée sur Vercel · 0 install client · installable sur iPhone et Android comme une vraie app native.' },
  { title: 'Supabase backend', desc: 'Postgres + Auth + Realtime · données chiffrées · isolement Row-Level Security par rôle.' },
  { title: 'Auto-déploiement', desc: 'Chaque commit Git pousse une nouvelle version en production en ~60 secondes.' },
]);

// 8. Section: Admin
sectionBreak('Partie 3', 'Le panel d\'administration');

// 9. Login
screenshotSlide('ACCÈS', 'Connexion sécurisée', 'admin-01-login.png', [
  { title: 'Auth réelle', desc: 'Email + mot de passe via Supabase, sessions chiffrées.' },
  { title: 'RBAC', desc: 'Seuls les chefs accèdent au panel. Les porteurs sont bloqués.' },
  { title: 'SSO Vercel désactivé', desc: 'Accessible directement, sans VPN ni proxy.' },
]);

// 10. Dashboard
screenshotSlide('VUE D\'ENSEMBLE', 'Dashboard temps réel', 'admin-02-dashboard.png', [
  { title: 'KPIs en haut', desc: 'Services du jour, CA jour, services mois, CA mois — calculés en live.' },
  { title: 'Graphiques', desc: 'Volume par jour (30 j), répartition par source (DNATA / Swissport / Privé / Web).' },
  { title: 'Top 5 porteurs', desc: 'Classement du mois — utile pour primes et reconnaissance.' },
]);

// 11. Services list
screenshotSlide('OPÉRATIONS', 'Tableau des services du jour', 'admin-03-services-list.png', [
  { title: 'Recherche + filtres', desc: 'Par vol, client, statut, source, porteur — instantané.' },
  { title: 'Tri + pagination', desc: 'Sur n\'importe quelle colonne. Tableau pensé pour 100+ services / jour.' },
  { title: 'Édition inline', desc: 'Crayon sur la ligne → modale d\'édition rapide.' },
]);

// 12. Service modal
screenshotSlide('CRÉATION', 'Saisie d\'un service en 30 secondes', 'admin-04-services-modal.png', [
  { title: 'Source segmentée', desc: 'DNATA / Swissport / Privé / Web — un seul appui, le tarif s\'adapte.' },
  { title: 'Tarif automatique', desc: 'CHF 15 base + 4/bag (DNATA & Swissport) ou 25+5 (Privé). Plus de saisie manuelle.' },
  { title: 'Direction toggle', desc: 'Arrivée ou Départ. Indispensable pour le pickup au terminal.' },
]);

// 13. Importer dual (landscape)
dualScreenshotSlide('IMPORT QUOTIDIEN', 'Charger le planning du jour en 1 clic',
  'admin-05-importer-empty.png', 'admin-06-importer-preview.png',
  'CSV du jour glissé-déposé → preview ligne par ligne → validation → 22 services créés en base. Cœur du workflow quotidien.',
  'landscape');

// 14. Employés grid
screenshotSlide('ÉQUIPE', 'Annuaire des 24 employés', 'admin-07-employes-grid.png', [
  { title: 'Vraies données', desc: 'Les 24 vrais membres de l\'équipe CGS Porter avec ID payroll.' },
  { title: '6 chefs + 20 porteurs', desc: '3 chefs matin (Aftak, Khalid, Safet), 3 chefs soir (Mate, Andrei, Dercio).' },
  { title: 'Recherche instantanée', desc: 'Tape un nom → la grille filtre en temps réel.' },
]);

// 15. Employé detail (FIX typo: controls → contrôles)
screenshotSlide('FICHE EMPLOYÉ', 'KPIs par personne, sur le mois', 'admin-08-employe-detail.png', [
  { title: 'Services + CA généré', desc: 'Compteurs du mois en cours, à jour en temps réel.' },
  { title: 'Heures estimées', desc: '≈ 30 min / service — utile pour pointer les heures sup.' },
  { title: 'Historique 10 derniers services', desc: 'Pour les retours et les contrôles.' },
]);

// 16. Employee modal
screenshotSlide('GESTION RH', 'Modifier un employé', 'admin-09-employe-modal.png', [
  { title: 'Toggle rôle', desc: 'Promouvoir un porteur → chef en un seul appui.' },
  { title: 'Coordonnées', desc: 'Téléphone, email, ID CGS — sources pour la paie.' },
  { title: 'Sauvegarde immédiate', desc: 'Aucun rechargement, la liste se met à jour seule.' },
]);

// 17. Planning dual (landscape)
dualScreenshotSlide('TOURNUS', 'Le planning des shifts (CQ1, CO2, TR13…)',
  'admin-10-planning.png', 'admin-11-planning-import.png',
  'Visualisation jour par jour à gauche · import CSV roster à droite. Pris depuis la feuille papier hebdomadaire en 1 minute.',
  'landscape');

// 18. CRM
screenshotSlide('COMMERCIAL', 'CRM — clients récurrents', 'admin-12-crm.png', [
  { title: 'Top clients', desc: 'Agrégés depuis l\'historique des services. Pas de double-saisie.' },
  { title: 'CA cumulé', desc: 'Pour identifier les VIP et adapter la prise en charge.' },
  { title: 'Téléphones + dernières dates', desc: 'Pratique pour les rappels et fidélisation.' },
]);

// 19. Rapports
screenshotSlide('ANALYTICS', 'Rapports & visualisations', 'admin-13-rapports.png', [
  { title: 'Vues mois / semaine / jour', desc: 'Sélecteur en haut, données recalculées instantanément.' },
  { title: 'Export PDF / Excel', desc: 'Pour la facturation client et les revues internes.' },
  { title: 'Filtres par source', desc: 'Cibler les analytics sur DNATA, Privé, etc.' },
]);

// 20. Paramètres
screenshotSlide('CONFIGURATION', 'Paramètres + tarifs par source', 'admin-14-parametres.png', [
  { title: 'Tarifs centralisés', desc: 'Source unique de vérité. Modification → effet immédiat dans toute l\'app.' },
  { title: 'Coordonnées société', desc: 'Affichées sur les exports PDF et factures.' },
  { title: 'Webhook (optionnel)', desc: 'Notifier un système externe quand un service est terminé.' },
]);

// 21. Section: Mobile
sectionBreak('Partie 4', 'L\'application mobile (PWA)');

// 22-24. Mobile dual slides — portrait mode
dualScreenshotSlide('PWA', 'Installable comme une vraie app native',
  'mobile-01-login-porter.png', 'mobile-02-login-chef.png',
  'Toggle Porteur / Chef d\'équipe au login · interface adaptée au rôle · fonctionne aussi offline (PWA cache).',
  'mobile');

dualScreenshotSlide('CHEF MOBILE', 'Vue chef — assigner en 2 appuis',
  'mobile-03-chef-home.png', 'mobile-05-chef-assign-sheet.png',
  'Liste des services du jour · appui sur "Assigner" → bottom sheet avec photos et noms des porteurs disponibles · le porteur reçoit la notification.',
  'mobile');

dualScreenshotSlide('CHEF MOBILE', 'Mon équipe + tous les services',
  'mobile-04-chef-team.png', 'mobile-06-chef-services.png',
  'Section "Mon équipe" : qui travaille aujourd\'hui · onglet "Services" : tous les services du jour avec statut live.',
  'mobile');

// 25. Mobile porter (triple)
mobileTripleSlide('PORTEUR MOBILE', 'Vue porteur — son seul outil de la journée',
  ['mobile-07-porter-home.png', 'mobile-09-porter-services.png', 'mobile-10-porter-profile.png'],
  'Home (services qui lui sont assignés) · onglet Services (vue calendrier) · onglet Profil (déconnexion + ID employé).');

// 26. Section: Conclusion
sectionBreak('Partie 5', 'Pourquoi on doit l\'adopter');

// 27. Avantages — unified emerald (positive outcomes)
statsSlide('BÉNÉFICES', 'Ce qu\'on gagne, mesurable', [
  { value: '−40 min', label: 'temps perdu / jour', sub: 'gestion + facturation', color: C.emerald },
  { value: '0', label: 'erreurs tarifaires', sub: 'tarifs centralisés', color: C.emerald },
  { value: '100 %', label: 'visibilité', sub: 'pour les chefs et la direction', color: C.emerald },
]);

// 28. Coûts
bulletTextSlide('INVESTISSEMENT', 'Mise en place — chiffres réels', [
  { title: 'CHF ~50 / mois', desc: 'Hébergement Vercel + Supabase. Aucun matériel à acheter, aucune licence par utilisateur.' },
  { title: '0 install client', desc: 'PWA = lien partagé par WhatsApp. Les porteurs cliquent et l\'app s\'installe.' },
  { title: '1 jour de formation', desc: 'Démo de 30 min suffit pour les chefs. Les porteurs comprennent en 5 min.' },
]);

// 29. Q&A / Closing (no page number)
closingSlide();

console.log(`\n→ ${_slideIdx} slides composed (TOTAL_SLIDES = ${TOTAL_SLIDES})`);
const wf = await pres.writeFile({ fileName: OUT });
const stat = fs.statSync(wf);
console.log(`✅ Wrote ${wf} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
