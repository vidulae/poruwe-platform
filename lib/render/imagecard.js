// WhatsApp Card — 1080x1350 shareable invitation image (satori -> resvg -> PNG).
'use strict';
const fs = require('fs');
const path = require('path');

const F = (n) => fs.readFileSync(path.join(__dirname, '..', '..', 'assets', 'fonts', n));
let fontsCache = null;
function fonts() {
  if (!fontsCache) {
    fontsCache = [
      { name: 'Cormorant', data: F('CormorantGaramond-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Cormorant', data: F('CormorantGaramond-Italic.ttf'), weight: 400, style: 'italic' },
      { name: 'Cormorant', data: F('CormorantGaramond-SemiBold.ttf'), weight: 600, style: 'normal' },
      { name: 'Montserrat', data: F('Montserrat-Regular.ttf'), weight: 400, style: 'normal' },
      { name: 'Montserrat', data: F('Montserrat-SemiBold.ttf'), weight: 600, style: 'normal' },
    ];
  }
  return fontsCache;
}

const CREAM = '#F6F3ED', FOREST = '#14231C', GOLD = '#C8A24B', GOLDLIGHT = '#E2C97E', MUTED = '#A9B4AA';
const el = (type, style, children) => ({ type, props: { style, children } });
const txt = (style, s) => ({ type: 'div', props: { style, children: s } });

function tree(derived, photoDataUri, preview) {
  const label = (s, extra = {}) => txt({ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 21, letterSpacing: 7, color: GOLD, ...extra }, s);

  const children = [];
  if (photoDataUri) {
    children.push(el('div', { display: 'flex', width: 250, height: 250, borderRadius: 999, border: `3px solid ${GOLD}`, overflow: 'hidden', marginBottom: 34 }, [
      { type: 'img', props: { src: photoDataUri, width: 250, height: 250, style: { objectFit: 'cover' } } },
    ]));
  } else {
    children.push(el('div', { display: 'flex', width: 130, height: 130, borderRadius: 999, border: `2px solid ${GOLD}`, alignItems: 'center', justifyContent: 'center', marginBottom: 34 }, [
      txt({ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 52, color: GOLDLIGHT }, `${derived.gi}&${derived.bi}`),
    ]));
  }

  children.push(label('TOGETHER WITH THEIR FAMILIES'));
  children.push(el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 30, marginBottom: 30 }, [
    txt({ fontFamily: 'Cormorant', fontWeight: 600, fontSize: 88, letterSpacing: 10, color: CREAM, textTransform: 'uppercase' }, derived.groom),
    txt({ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 44, color: GOLD, marginTop: 6, marginBottom: 6 }, '&'),
    txt({ fontFamily: 'Cormorant', fontWeight: 600, fontSize: 88, letterSpacing: 10, color: CREAM, textTransform: 'uppercase' }, derived.bride),
  ]));
  children.push(label('INVITE YOU TO CELEBRATE THEIR WEDDING', { fontSize: 17, letterSpacing: 5, color: MUTED }));

  children.push(el('div', { display: 'flex', width: 180, height: 1, backgroundColor: GOLD, marginTop: 40, marginBottom: 40 }, []));

  children.push(txt({ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 40, color: CREAM }, derived.dateLong));
  children.push(txt({ fontFamily: 'Montserrat', fontWeight: 400, fontSize: 20, letterSpacing: 5, color: MUTED, marginTop: 14 }, `CEREMONY AT ${derived.timeDisplay.toUpperCase()}`));

  children.push(el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 42 }, [
    txt({ fontFamily: 'Cormorant', fontWeight: 600, fontSize: 42, color: GOLDLIGHT }, derived.venueName),
    txt({ fontFamily: 'Montserrat', fontWeight: 400, fontSize: 19, color: MUTED, marginTop: 10, textAlign: 'center' }, derived.venueAddress),
  ]));

  const bottom = [];
  if (derived.rsvpWa) bottom.push(txt({ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 20, letterSpacing: 3, color: CREAM }, `RSVP · +${derived.rsvpWa}`));
  bottom.push(txt({ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 15, letterSpacing: 8, color: 'rgba(200,162,75,.65)', marginTop: 14 }, 'PORUWE'));

  const overlay = preview ? [el('div', {
    position: 'absolute', top: 600, left: -100, width: 1280, height: 90,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(200,162,75,.85)', transform: 'rotate(-24deg)',
  }, [txt({ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 40, letterSpacing: 12, color: FOREST }, 'PREVIEW · PORUWE')])] : [];

  return el('div', { display: 'flex', width: 1080, height: 1350, backgroundColor: FOREST, padding: 44 }, [
    el('div', {
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      width: 992, height: 1262, border: `2px solid ${GOLD}`, position: 'relative', padding: 50,
    }, [
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, justifyContent: 'center' }, children),
      el('div', { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 8 }, bottom),
      ...overlay,
    ]),
  ]);
}

async function buildInvitationImage(derived, photoDataUri, { preview = false } = {}) {
  const satori = (await import('satori')).default;
  const { Resvg } = require('@resvg/resvg-js');
  const svg = await satori(tree(derived, photoDataUri, preview), { width: 1080, height: 1350, fonts: fonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } }).render().asPng();
  return Buffer.from(png);
}

module.exports = { buildInvitationImage };
