// Official PDF receipt for an order (pdfkit).
'use strict';
const PDFDocument = require('pdfkit');
const { FONTS } = require('./pdfcard');
const { formatLKR } = require('../format');

const FOREST = '#1A2C25', GOLD = '#C8A24B', GOLDDEEP = '#9E7B2F', MUTED = '#6D736E', INK = '#13251F', CREAM = '#F6F3ED';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo' });
}

function buildReceiptPdf(order, template, settings) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 56, info: { Title: `Receipt ${order.order_no}`, Author: 'Poruwe' } });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    const W = doc.page.width;
    const pay = order.payment || {};
    const customer = (order.data && order.data.customer) || {};
    const couple = (order.data && order.data.couple) || {};
    const paid = !!pay.paidAt;

    // header band
    doc.rect(0, 0, W, 110).fill(FOREST);
    doc.font(FONTS.serifIt).fontSize(30).fillColor(GOLD).text('Poruwe', 56, 32);
    doc.font(FONTS.sansSb).fontSize(8).fillColor(CREAM).text('WEDDING INVITATIONS · SEALED WITH LOVE', 56, 70, { characterSpacing: 2.4 });
    doc.font(FONTS.sansSb).fontSize(11).fillColor(CREAM).text('OFFICIAL RECEIPT', 0, 40, { width: W - 56, align: 'right', characterSpacing: 3 });
    doc.font(FONTS.sans).fontSize(10).fillColor(GOLD).text(order.order_no, 0, 60, { width: W - 56, align: 'right', characterSpacing: 1 });

    let y = 150;
    const row = (label, value) => {
      doc.font(FONTS.sansSb).fontSize(7.5).fillColor(GOLDDEEP).text(label.toUpperCase(), 56, y, { characterSpacing: 2 });
      doc.font(FONTS.serif).fontSize(13).fillColor(INK).text(value || '—', 200, y - 3, { width: W - 256 });
      y += 30;
    };
    row('Receipt no', order.order_no);
    row('Issued', fmtDate(new Date()));
    row('Billed to', customer.name ? `${customer.name}${customer.wa ? ` (+${customer.wa})` : ''}` : '—');
    row('Wedding of', `${couple.groom || '—'} & ${couple.bride || '—'}`);
    y += 10;

    // items table
    doc.moveTo(56, y).lineTo(W - 56, y).lineWidth(0.8).strokeColor(GOLD).stroke();
    y += 14;
    doc.font(FONTS.sansSb).fontSize(8).fillColor(MUTED).text('ITEM', 56, y, { characterSpacing: 2 });
    doc.text('AMOUNT', 0, y, { width: W - 56, align: 'right', characterSpacing: 2 });
    y += 22;
    doc.font(FONTS.serifSb).fontSize(14).fillColor(INK).text(`${template.name} — ${template.kind === 'website' ? 'Invitation Website' : template.kind === 'pdf' ? 'Printable PDF Invitation' : 'Invitation Image'}`, 56, y, { width: 330 });
    doc.font(FONTS.serifSb).fontSize(14).fillColor(INK).text(formatLKR(pay.amount != null ? pay.amount : template.price_lkr), 0, y, { width: W - 56, align: 'right' });
    y += 34;
    doc.moveTo(56, y).lineTo(W - 56, y).lineWidth(0.4).strokeColor(GOLD).stroke();
    y += 14;
    doc.font(FONTS.sansSb).fontSize(9).fillColor(MUTED).text('TOTAL', 56, y, { characterSpacing: 2 });
    doc.font(FONTS.serifSb).fontSize(18).fillColor(GOLDDEEP).text(formatLKR(pay.amount != null ? pay.amount : template.price_lkr), 0, y - 4, { width: W - 56, align: 'right' });
    y += 44;

    row('Payment method', pay.method === 'manual' ? 'Bank transfer' : pay.method === 'payhere' ? 'PayHere (online)' : pay.method === 'free' ? 'Free template' : pay.method || '—');
    if (pay.reference) row('Reference', pay.reference);
    row('Payment date', pay.paidAt ? fmtDate(pay.paidAt) : 'Pending');

    // status stamp
    const stampY = y + 16;
    doc.save().rotate(-8, { origin: [W - 150, stampY + 20] });
    doc.roundedRect(W - 226, stampY, 152, 44, 4).lineWidth(2).strokeColor(paid ? GOLDDEEP : MUTED).stroke();
    doc.font(FONTS.sansSb).fontSize(15).fillColor(paid ? GOLDDEEP : MUTED)
      .text(paid ? 'PAID' : 'PENDING', W - 226, stampY + 13, { width: 152, align: 'center', characterSpacing: 5 });
    doc.restore();

    doc.font(FONTS.sans).fontSize(8).fillColor(MUTED)
      .text('Privacy: all invitation content and personal data are automatically and permanently deleted 3 days after the wedding date.', 56, 720, { width: W - 112 });
    doc.font(FONTS.sansSb).fontSize(7).fillColor(GOLD)
      .text('PORUWE · GENERATED ELECTRONICALLY — VALID WITHOUT SIGNATURE', 56, 760, { width: W - 112, align: 'center', characterSpacing: 2 });

    doc.end();
  });
}

module.exports = { buildReceiptPdf };
