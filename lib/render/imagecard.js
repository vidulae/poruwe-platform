// Shareable 1080x1350 invitation images (satori -> resvg -> PNG): WhatsApp Card + Story Card.
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

// Story Card — editorial left-aligned announcement on a dusk-plum gradient
function storyTree(derived, photoDataUri, preview) {
  const NIGHT = '#1C1420', PLUM = '#3A2335', CREAMY = '#F0E4D8', FLAME = '#E0A458', DIM = 'rgba(240,228,216,.62)';
  const label = (s, extra = {}) => txt({ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 19, letterSpacing: 8, color: FLAME, ...extra }, s);
  const left = [];
  left.push(label('WE ARE GETTING MARRIED'));
  left.push(el('div', { display: 'flex', flexDirection: 'column', marginTop: 44 }, [
    txt({ fontFamily: 'Cormorant', fontWeight: 600, fontSize: 118, lineHeight: 1.02, color: CREAMY }, derived.groom),
    el('div', { display: 'flex', alignItems: 'center', marginTop: 10, marginBottom: 10 }, [
      el('div', { display: 'flex', width: 90, height: 1, backgroundColor: FLAME }, []),
      txt({ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 52, color: FLAME, marginLeft: 22 }, '&'),
    ]),
    txt({ fontFamily: 'Cormorant', fontWeight: 600, fontSize: 118, lineHeight: 1.02, color: CREAMY }, derived.bride),
  ]));
  left.push(el('div', { display: 'flex', flexDirection: 'column', marginTop: 58 }, [
    txt({ fontFamily: 'Cormorant', fontStyle: 'italic', fontSize: 44, color: CREAMY }, derived.dateLong),
    txt({ fontFamily: 'Montserrat', fontWeight: 400, fontSize: 19, letterSpacing: 5, color: DIM, marginTop: 14 }, `CEREMONY AT ${derived.timeDisplay.toUpperCase()}`),
  ]));
  left.push(el('div', { display: 'flex', flexDirection: 'column', marginTop: 46 }, [
    txt({ fontFamily: 'Cormorant', fontWeight: 600, fontSize: 40, color: FLAME }, derived.venueName),
    derived.venueAddress ? txt({ fontFamily: 'Montserrat', fontWeight: 400, fontSize: 18, color: DIM, marginTop: 8 }, derived.venueAddress) : txt({ display: 'none' }, ''),
  ]));

  const bottomBar = el('div', {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    borderTop: `1px solid rgba(224,164,88,.4)`, paddingTop: 30, marginTop: 40, width: '100%',
  }, [
    derived.rsvpWa
      ? txt({ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 20, letterSpacing: 3, color: CREAMY }, `RSVP ON WHATSAPP · +${derived.rsvpWa}`)
      : txt({ display: 'none' }, ''),
    txt({ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 15, letterSpacing: 7, color: 'rgba(224,164,88,.6)' }, 'PORUWE'),
  ]);

  const overlay = preview ? [el('div', {
    position: 'absolute', top: 600, left: -100, width: 1280, height: 90,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(224,164,88,.85)', transform: 'rotate(-24deg)',
  }, [txt({ fontFamily: 'Montserrat', fontWeight: 600, fontSize: 40, letterSpacing: 12, color: NIGHT }, 'PREVIEW · PORUWE')])] : [];

  const photo = photoDataUri ? [el('div', {
    position: 'absolute', top: 64, right: 64, width: 210, height: 210, borderRadius: 999,
    border: `3px solid ${FLAME}`, overflow: 'hidden', display: 'flex',
  }, [{ type: 'img', props: { src: photoDataUri, width: 210, height: 210, style: { objectFit: 'cover' } } }])] : [];

  return el('div', {
    display: 'flex', width: 1080, height: 1350, padding: 64, position: 'relative',
    background: `linear-gradient(165deg, ${NIGHT} 0%, ${PLUM} 55%, #171017 100%)`,
  }, [
    el('div', { display: 'flex', position: 'absolute', top: 36, left: 36, right: 36, bottom: 36, border: '1px solid rgba(224,164,88,.35)' }, []),
    el('div', { display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', width: 952, height: 1222, padding: 40, position: 'relative' }, [
      el('div', { display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }, left),
      bottomBar,
      ...photo,
      ...overlay,
    ]),
  ]);
}

async function buildInvitationImage(derived, photoDataUri, opts = {}) {
  const { preview = false, template } = opts;
  const satori = (await import('satori')).default;
  const { Resvg } = require('@resvg/resvg-js');
  const pick = template && template.renderer === 'image-story' ? storyTree : tree;
  const svg = await satori(pick(derived, photoDataUri, preview), { width: 1080, height: 1350, fonts: fonts() });
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1080 } }).render().asPng();
  return Buffer.from(png);
}

module.exports = { buildInvitationImage };
