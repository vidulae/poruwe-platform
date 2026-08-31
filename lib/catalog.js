// Template catalog: what Poruwe sells. Prices/active are editable in the admin
// panel (stored in DB); everything else re-seeds from here on boot.
'use strict';

const MIDNIGHT_THEME = {
  vars: {
    '--cream': '#0F1A15',
    '--ivory': '#131F19',
    '--white': '#15231C',
    '--ink': '#F1ECDF',
    '--muted': '#A9B4AA',
    '--gold': '#D4AF5E',
    '--gold-deep': '#E0C273',
    '--gold-rich': '#D4AF5E',
    '--gold-light': '#EBD9A0',
    '--border': 'rgba(212,175,94,.4)',
    '--shadow': '0 24px 60px -30px rgba(0,0,0,.6)',
  },
  extraCss: `
    body.theme-midnight-poruwa .hero-bg::after{background:linear-gradient(180deg,rgba(15,26,21,.62),rgba(15,26,21,.38) 38%,rgba(15,26,21,.6) 76%,rgba(15,26,21,.96))}
    body.theme-midnight-poruwa .hero-names{color:var(--ink);text-shadow:0 2px 30px rgba(0,0,0,.55)}
    body.theme-midnight-poruwa .hero-loc em{color:var(--ink);text-shadow:none}
    body.theme-midnight-poruwa .hero-loc span{color:var(--muted);text-shadow:none}
    body.theme-midnight-poruwa .hero-date{text-shadow:none}
    body.theme-midnight-poruwa .hero-countdown{background:rgba(15,26,21,.82)}
    body.theme-midnight-poruwa .cd-num{color:var(--ink)}
    body.theme-midnight-poruwa .btn-outline{border-color:var(--ink);color:var(--ink)}
    body.theme-midnight-poruwa .btn-outline:hover{background:var(--ink);color:var(--cream)}
    body.theme-midnight-poruwa header.nav{background:rgba(15,26,21,.4)}
    body.theme-midnight-poruwa header.nav.scrolled{background:rgba(15,26,21,.92)}
    body.theme-midnight-poruwa .opening-card{background:rgba(19,31,25,.82);border-color:rgba(212,175,94,.4)}
    body.theme-midnight-poruwa .op-name{color:var(--ink)}
    body.theme-midnight-poruwa .program{background:linear-gradient(180deg,var(--cream),#0B1511)}
    body.theme-midnight-poruwa .tl-icon{background:var(--ivory)}
    body.theme-midnight-poruwa .timeline::before{background:var(--gold)}
    body.theme-midnight-poruwa ::selection{background:var(--gold);color:#0F1A15}
  `,
};

const TEMPLATES = [
  {
    id: 'simple-scroll', kind: 'website', renderer: 'simple-scroll',
    name: 'Simple Scroll', tier: 'free', price_lkr: 0, sort: 1,
    tagline: 'A graceful single-page invitation with countdown and WhatsApp RSVP — free forever.',
  },
  {
    id: 'classic-card', kind: 'pdf', renderer: 'pdf-classic',
    name: 'Classic Card', tier: 'essential', price_lkr: 400, sort: 2,
    tagline: 'An elegant printable A5 invitation card, delivered as a crisp PDF.',
  },
  {
    id: 'whatsapp-card', kind: 'image', renderer: 'image-card',
    name: 'WhatsApp Card', tier: 'essential', price_lkr: 900, sort: 3,
    tagline: 'A share-ready invitation image, sized beautifully for WhatsApp and socials.',
  },
  {
    id: 'golden-seal', kind: 'website', renderer: 'golden-seal',
    name: 'Golden Seal', tier: 'premium', price_lkr: 2900, sort: 4,
    tagline: 'Our flagship — wax-seal opening, cinematic animations, live countdown and WhatsApp RSVP.',
  },
  {
    id: 'midnight-poruwa', kind: 'website', renderer: 'golden-seal', theme: MIDNIGHT_THEME,
    name: 'Midnight Poruwa', tier: 'premium', price_lkr: 3900, sort: 5,
    tagline: 'The Golden Seal experience recast in deep midnight green and brushed gold.',
  },
  {
    id: 'poruwe-royale', kind: 'website', renderer: 'golden-seal',
    name: 'Poruwe Royale', tier: 'pro', price_lkr: 7900, sort: 6,
    tagline: 'Golden Seal plus a designer session — bespoke palette, photo curation and priority support.',
  },
];

const DEFAULT_SETTINGS = {
  currency: 'LKR',
  bank: { accountName: '', bank: '', branch: '', accountNumber: '' },
  payhere: { merchantId: '', merchantSecret: '', sandbox: true },
  stripe: { enabled: false, note: 'Planned — will be plugged in via a US Stripe account.' },
  supportWhatsapp: '',
  autoPurgeDays: 3,
};

function defaultStory() {
  return [
    { label: 'The First Hello', title: 'Where We Met', text: 'A chance meeting turned an ordinary day into the start of something extraordinary. One conversation, and we both knew this was different.' },
    { label: 'Falling In Love', title: 'Becoming Us', text: 'Late-night talks, shared dreams and a thousand little moments. Friendship grew into a love that felt like coming home.' },
    { label: 'The Proposal', title: 'She Said Yes', text: 'Under a sky full of stars, a question was asked and answered with happy tears. The beginning of our forever was sealed.' },
    { label: '', title: 'The Big Day', text: 'Now we invite you to celebrate the day we say "I do" — surrounded by the people who mean the most to us.' },
  ];
}

function defaultProgram() {
  return [
    { time: '9:00 AM', title: 'Guest Arrival', text: 'Welcome drinks and gentle music as guests gather.' },
    { time: '10:00 AM', title: 'The Ceremony', text: 'The moment we\'ve waited for — vows exchanged before family and friends.' },
    { time: '11:30 AM', title: 'Reception & Toasts', text: 'Heartfelt words, warm wishes and a toast to the newlyweds.' },
    { time: '12:30 PM', title: 'Wedding Lunch', text: 'A relaxed feast of Sri Lankan and continental favourites.' },
    { time: '2:00 PM', title: 'First Dance', text: 'The couple\'s first dance, followed by dancing for everyone.' },
    { time: '3:30 PM', title: 'Cake & Farewell', text: 'Cutting of the cake and fond farewells as the celebration winds down.' },
  ];
}

function defaultContacts() {
  return [
    { role: 'The Groom', name: 'Sahan', phone: '+94 77 000 0001', wa: '94770000001' },
    { role: 'The Bride', name: 'Dilini', phone: '+94 76 000 0002', wa: '94760000002' },
  ];
}

function sampleData() {
  return {
    couple: { groom: 'Sahan', bride: 'Dilini' },
    event: { date: '2027-12-12', time: '10:00', arriveBy: '09:30', rsvpBy: '2027-11-20' },
    venue: { name: 'The Lakeview Grand', address: 'Temple Road, Kandy 20000, Sri Lanka', mapQuery: 'Lakeview Grand Kandy', website: '' },
    story: defaultStory(),
    program: defaultProgram(),
    contacts: defaultContacts(),
    rsvp: { wa: '94770000001' },
    customer: { name: 'Demo', wa: '' },
    photos: {},
  };
}

module.exports = { TEMPLATES, DEFAULT_SETTINGS, defaultStory, defaultProgram, defaultContacts, sampleData };
