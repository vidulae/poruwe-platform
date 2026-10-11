// Printable A5 invitation PDFs (pdfkit): Classic Card + Royal Crest.
'use strict';
const path = require('path');
const PDFDocument = require('pdfkit');

const F = (n) => path.join(__dirname, '..', '..', 'assets', 'fonts', n);
const FONTS = {
  serif: F('CormorantGaramond-Regular.ttf'),
  serifIt: F('CormorantGaramond-Italic.ttf'),
  serifSb: F('CormorantGaramond-SemiBold.ttf'),
  sans: F('Montserrat-Regular.ttf'),
  sansSb: F('Montserrat-SemiBold.ttf'),
};

const CREAM = '#F6F3ED', FOREST = '#1A2C25', GOLD = '#C8A24B', GOLDDEEP = '#9E7B2F', MUTED = '#6D736E', INK = '#13251F';

function buildInvitationPdf(derived, opts = {}) {
  const renderer = opts.template && opts.template.renderer;
  if (renderer === 'pdf-crest') return buildCrestPdf(derived, opts);
  return buildClassicPdf(derived, opts);
}

// Royal Crest — burgundy and antique gold, ornate ceremonial card
function buildCrestPdf(derived, { preview = false } = {}) {
  return new Promise((resolve, reject) => {
    const W = 420, H = 595;
    const MAROON = '#4A1518', MAROON_D = '#380F12', GOLD2 = '#D4AF5E', GOLD_SOFT = '#E8CD8C', CREAM2 = '#F2E6CE', DIM = 'rgba(242,230,206,.72)';
    const doc = new PDFDocument({ size: [W, H], margins: { top: 0, left: 0, right: 0, bottom: 0 }, info: { Title: `${derived.coupleTitle} — Wedding Invitation`, Author: 'Poruwe' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // deep burgundy ground with darker vignette band
    doc.rect(0, 0, W, H).fill(MAROON);
    doc.rect(0, 0, W, 90).fill(MAROON_D);
    doc.rect(0, H - 90, W, 90).fill(MAROON_D);
    doc.rect(0, 0, W, H).fillOpacity(0).fill(MAROON).fillOpacity(1);

    // ornate double frame with diamond studs
    doc.lineWidth(1.6).strokeColor(GOLD2).rect(18, 18, W - 36, H - 36).stroke();
    doc.lineWidth(0.6).strokeColor(GOLD2).rect(26, 26, W - 52, H - 52).stroke();
    const diamond = (x, y, r) => doc.save().translate(x, y).rotate(45).rect(-r / 2, -r / 2, r, r).fill(GOLD2).restore();
    diamond(W / 2, 18, 7); diamond(W / 2, H - 18, 7); diamond(18, H / 2, 7); diamond(W - 18, H / 2, 7);
    diamond(26, 26, 5); diamond(W - 26, 26, 5); diamond(26, H - 26, 5); diamond(W - 26, H - 26, 5);

    let y = 58;
    // crest: circle + laurel strokes + initials
    const cx = W / 2, cy = y + 32;
    doc.circle(cx, cy, 30).lineWidth(1.2).strokeColor(GOLD2).stroke();
    doc.circle(cx, cy, 25).lineWidth(0.5).strokeColor(GOLD2).stroke();
    // laurel hints
    doc.lineWidth(0.9).strokeColor(GOLD2);
    doc.moveTo(cx - 44, cy + 16).bezierCurveTo(cx - 40, cy - 2, cx - 36, cy - 12, cx - 33, cy - 18).stroke();
    doc.moveTo(cx + 44, cy + 16).bezierCurveTo(cx + 40, cy - 2, cx + 36, cy - 12, cx + 33, cy - 18).stroke();
    for (let i = 0; i < 4; i++) {
      const t = i / 3.2;
      doc.circle(cx - 42 + 4 * t, cy + 12 - 10 * t - 8 * i * 0.9, 1.6).fill(GOLD2);
      doc.circle(cx + 42 - 4 * t, cy + 12 - 10 * t - 8 * i * 0.9, 1.6).fill(GOLD2);
    }
    doc.font(FONTS.serifSb).fontSize(21).fillColor(GOLD_SOFT)
      .text(`${derived.gi}·${derived.bi}`, cx - 40, cy - 10, { width: 80, align: 'center' });
    y = cy + 48;

    doc.font(FONTS.sansSb).fontSize(7.2).fillColor(GOLD2)
      .text('TOGETHER WITH THEIR FAMILIES', 40, y, { width: W - 80, align: 'center', characterSpacing: 3.6 });
    y += 28;

    doc.font(FONTS.serifSb).fontSize(34).fillColor(CREAM2)
      .text(derived.groom.toUpperCase(), 30, y, { width: W - 60, align: 'center', characterSpacing: 4 });
    y += 42;
    // deco ampersand row
    doc.moveTo(W / 2 - 64, y + 8).lineTo(W / 2 - 22, y + 8).lineWidth(0.7).strokeColor(GOLD2).stroke();
    doc.moveTo(W / 2 + 22, y + 8).lineTo(W / 2 + 64, y + 8).stroke();
    doc.font(FONTS.serifIt).fontSize(17).fillColor(GOLD_SOFT).text('weds', W / 2 - 30, y, { width: 60, align: 'center' });
    y += 26;
    doc.font(FONTS.serifSb).fontSize(34).fillColor(CREAM2)
      .text(derived.bride.toUpperCase(), 30, y, { width: W - 60, align: 'center', characterSpacing: 4 });
    y += 52;

    doc.font(FONTS.serifIt).fontSize(12).fillColor(DIM)
      .text('request the honour of your gracious presence', 40, y, { width: W - 80, align: 'center' });
    y += 16;
    doc.font(FONTS.serifIt).fontSize(12).fillColor(DIM)
      .text('at their poruwa ceremony & wedding celebration', 40, y, { width: W - 80, align: 'center' });
    y += 30;

    diamond(W / 2, y + 2, 5);
    y += 18;

    doc.font(FONTS.serif).fontSize(15.5).fillColor(CREAM2)
      .text(derived.dateLong, 40, y, { width: W - 80, align: 'center' });
    y += 23;
    doc.font(FONTS.sans).fontSize(8.6).fillColor(GOLD_SOFT)
      .text(`CEREMONY AT ${derived.timeDisplay.toUpperCase()} · ARRIVE BY ${derived.arriveDisplay.toUpperCase()}`, 40, y, { width: W - 80, align: 'center', characterSpacing: 1.8 });
    y += 30;

    doc.font(FONTS.serifSb).fontSize(16.5).fillColor(GOLD_SOFT)
      .text(derived.venueName, 40, y, { width: W - 80, align: 'center' });
    y += 21;
    if (derived.venueAddress) {
      doc.font(FONTS.sans).fontSize(8.4).fillColor(DIM)
        .text(derived.venueAddress, 60, y, { width: W - 120, align: 'center' });
      y += 30;
    }

    if (derived.rsvpWa) {
      doc.font(FONTS.sans).fontSize(7.8).fillColor(CREAM2)
        .text(`RSVP · +${derived.rsvpWa}${derived.rsvpByDisplay ? `  ·  BY ${derived.rsvpByDisplay.toUpperCase()}` : ''}`, 40, y, { width: W - 80, align: 'center', characterSpacing: 1.6 });
    }

    doc.font(FONTS.sansSb).fontSize(6.2).fillColor(GOLD2)
      .text('SEALED WITH LOVE · PORUWE', 40, H - 44, { width: W - 80, align: 'center', characterSpacing: 2.8 });

    if (preview) {
      doc.save().rotate(-32, { origin: [W / 2, H / 2] })
        .font(FONTS.sansSb).fontSize(44).fillColor(GOLD_SOFT).opacity(0.1)
        .text('PREVIEW — PORUWE', -80, H / 2 - 24, { width: W + 160, align: 'center', characterSpacing: 4 })
        .opacity(1).restore();
    }

    doc.end();
  });
}

function buildClassicPdf(derived, { preview = false } = {}) {
  return new Promise((resolve, reject) => {
    const W = 420, H = 595; // A5 (pt)
    const doc = new PDFDocument({ size: [W, H], margins: { top: 0, left: 0, right: 0, bottom: 0 }, info: { Title: `${derived.coupleTitle} — Wedding Invitation`, Author: 'Poruwe' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // background + double gold frame
    doc.rect(0, 0, W, H).fill(CREAM);
    doc.lineWidth(1.4).strokeColor(GOLD).rect(16, 16, W - 32, H - 32).stroke();
    doc.lineWidth(0.5).strokeColor(GOLD).rect(24, 24, W - 48, H - 48).stroke();

    // corner accents
    const ca = (x, y, dx, dy) => {
      doc.lineWidth(0.8).strokeColor(GOLD)
        .moveTo(x, y + 14 * dy).lineTo(x, y).lineTo(x + 14 * dx, y).stroke();
    };
    ca(34, 34, 1, 1); ca(W - 34, 34, -1, 1); ca(34, H - 34, 1, -1); ca(W - 34, H - 34, -1, -1);

    let y = 62;
    // monogram circle
    doc.circle(W / 2, y + 24, 24).lineWidth(1).strokeColor(GOLD).stroke();
    doc.font(FONTS.serifIt).fontSize(20).fillColor(GOLDDEEP)
      .text(`${derived.gi}&${derived.bi}`, W / 2 - 40, y + 13, { width: 80, align: 'center' });
    y += 74;

    doc.font(FONTS.sansSb).fontSize(7.5).fillColor(GOLDDEEP)
      .text('TOGETHER WITH THEIR FAMILIES', 40, y, { width: W - 80, align: 'center', characterSpacing: 3.4 });
    y += 30;

    doc.font(FONTS.serifSb).fontSize(38).fillColor(FOREST)
      .text(derived.groom.toUpperCase(), 30, y, { width: W - 60, align: 'center', characterSpacing: 3 });
    y += 46;
    doc.font(FONTS.serifIt).fontSize(19).fillColor(GOLD).text('&', 30, y, { width: W - 60, align: 'center' });
    y += 27;
    doc.font(FONTS.serifSb).fontSize(38).fillColor(FOREST)
      .text(derived.bride.toUpperCase(), 30, y, { width: W - 60, align: 'center', characterSpacing: 3 });
    y += 58;

    doc.font(FONTS.serifIt).fontSize(12.5).fillColor(MUTED)
      .text('request the honour of your presence', 40, y, { width: W - 80, align: 'center' });
    y += 17;
    doc.font(FONTS.serifIt).fontSize(12.5).fillColor(MUTED)
      .text('at the celebration of their marriage', 40, y, { width: W - 80, align: 'center' });
    y += 30;

    // divider
    doc.moveTo(W / 2 - 60, y).lineTo(W / 2 - 12, y).lineWidth(0.6).strokeColor(GOLD).stroke();
    doc.moveTo(W / 2 + 12, y).lineTo(W / 2 + 60, y).stroke();
    doc.circle(W / 2, y, 2).fill(GOLD);
    y += 24;

    doc.font(FONTS.serif).fontSize(16).fillColor(INK)
      .text(derived.dateLong, 40, y, { width: W - 80, align: 'center' });
    y += 24;
    doc.font(FONTS.sans).fontSize(9).fillColor(MUTED)
      .text(`CEREMONY AT ${derived.timeDisplay.toUpperCase()}`, 40, y, { width: W - 80, align: 'center', characterSpacing: 2.4 });
    y += 32;

    doc.font(FONTS.serifSb).fontSize(17).fillColor(GOLDDEEP)
      .text(derived.venueName, 40, y, { width: W - 80, align: 'center' });
    y += 22;
    doc.font(FONTS.sans).fontSize(8.6).fillColor(MUTED)
      .text(derived.venueAddress, 60, y, { width: W - 120, align: 'center' });
    y += 34;

    if (derived.rsvpWa) {
      doc.font(FONTS.sans).fontSize(8).fillColor(INK)
        .text(`RSVP · +${derived.rsvpWa}${derived.rsvpByDisplay ? `  ·  BY ${derived.rsvpByDisplay.toUpperCase()}` : ''}`, 40, y, { width: W - 80, align: 'center', characterSpacing: 1.6 });
    }

    doc.font(FONTS.sansSb).fontSize(6.4).fillColor(GOLD)
      .text('SEALED WITH LOVE · PORUWE', 40, H - 46, { width: W - 80, align: 'center', characterSpacing: 2.6 });

    if (preview) {
      doc.save().rotate(-32, { origin: [W / 2, H / 2] })
        .font(FONTS.sansSb).fontSize(44).fillColor(FOREST).opacity(0.08)
        .text('PREVIEW — PORUWE', -80, H / 2 - 24, { width: W + 160, align: 'center', characterSpacing: 4 })
        .opacity(1).restore();
    }

    doc.end();
  });
}

module.exports = { buildInvitationPdf, FONTS };
