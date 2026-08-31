// Classic Card — printable A5 invitation PDF (pdfkit).
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

function buildInvitationPdf(derived, { preview = false } = {}) {
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
