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

const SUNSET_THEME = {
  vars: {
    '--paper': '#FBF3E8',
    '--card': '#FFF9F0',
    '--ink': '#4A2C1E',
    '--soft': '#8A6A55',
    '--leaf': '#C96F4A',
    '--leaf-deep': '#A54E2E',
    '--bloom': '#E2A17B',
    '--accent': '#B8754F',
    '--line': 'rgba(201,111,74,.35)',
  },
  extraCss: `
    body.theme-sunset-veranda .hero-wash{background:
      radial-gradient(130% 90% at 50% -10%, rgba(226,161,123,.4), transparent 60%),
      radial-gradient(90% 70% at 85% 100%, rgba(201,111,74,.22), transparent 65%),
      linear-gradient(180deg,#FBF3E8,#F7E7D4)}
    body.theme-sunset-veranda .petal{color:#C96F4A}
  `,
};

const TEMPLATES = [
  {
    id: 'simple-scroll', kind: 'website', renderer: 'simple-scroll',
    name: 'Simple Scroll', tier: 'free', price_lkr: 0, sort: 1,
    tagline: 'A graceful single-page invitation with countdown and WhatsApp RSVP — free forever.',
    thumb: { bg: 'linear-gradient(160deg,#EFE8D9,#F7F4EE 55%,#E8DFC9)', ink: '#13251F', accent: '#C8A24B' },
  },
  {
    id: 'classic-card', kind: 'pdf', renderer: 'pdf-classic',
    name: 'Classic Card', tier: 'essential', price_lkr: 400, sort: 2,
    tagline: 'An elegant printable A5 invitation card, delivered as a crisp PDF.',
    thumb: { bg: 'linear-gradient(160deg,#F3EFE4,#EDE4CE)', ink: '#13251F', accent: '#9E7B2F' },
  },
  {
    id: 'royal-crest', kind: 'pdf', renderer: 'pdf-crest',
    name: 'Royal Crest', tier: 'essential', price_lkr: 700, sort: 3,
    tagline: 'A stately printable A5 card — ornate double borders and a crest monogram in deep burgundy.',
    thumb: { bg: 'linear-gradient(160deg,#4A1518,#6B2026 60%,#3B1013)', ink: '#F2E6CE', accent: '#D4AF5E', frameBg: 'rgba(59,16,19,.55)', dark: true },
  },
  {
    id: 'whatsapp-card', kind: 'image', renderer: 'image-card',
    name: 'WhatsApp Card', tier: 'essential', price_lkr: 900, sort: 4,
    tagline: 'A share-ready invitation image, sized beautifully for WhatsApp and socials.',
    thumb: { bg: 'linear-gradient(160deg,#14231C,#1E332A)', ink: '#F6F3ED', accent: '#C8A24B', frameBg: 'rgba(20,35,28,.5)', dark: true },
  },
  {
    id: 'story-card', kind: 'image', renderer: 'image-story',
    name: 'Story Card', tier: 'essential', price_lkr: 1400, sort: 5,
    tagline: 'A premium portrait announcement image — editorial type over a dusk gradient, made for stories and statuses.',
    thumb: { bg: 'linear-gradient(170deg,#1C1420,#3A2335 55%,#171017)', ink: '#F0E4D8', accent: '#E0A458', frameBg: 'rgba(23,16,23,.5)', dark: true },
  },
  {
    id: 'pearl-letter', kind: 'website', renderer: 'pearl-letter',
    name: 'Pearl Letter', tier: 'essential', price_lkr: 1900, sort: 6,
    tagline: 'An intimate invitation written as a letter — one graceful column, a wax monogram, your story in your own words.',
    thumb: { bg: 'linear-gradient(160deg,#FAF7F0,#F1EADD)', ink: '#3E3A33', accent: '#A8927B' },
  },
  {
    id: 'sunset-veranda', kind: 'website', renderer: 'lotus-garden', theme: SUNSET_THEME,
    name: 'Sunset Veranda', tier: 'premium', price_lkr: 2400, sort: 7,
    tagline: 'The Lotus Garden layout recast in terracotta and golden-hour warmth — made for coastal evenings.',
    thumb: { bg: 'linear-gradient(160deg,#FBF3E8,#F2D9BE 60%,#E8B48C)', ink: '#4A2C1E', accent: '#C96F4A' },
  },
  {
    id: 'golden-seal', kind: 'website', renderer: 'golden-seal',
    name: 'Golden Seal', tier: 'premium', price_lkr: 2900, sort: 8,
    tagline: 'Our signature — wax-seal opening, cinematic animations, live countdown and WhatsApp RSVP.',
    thumb: { bg: 'linear-gradient(160deg,#EFE8D9,#F7F4EE 55%,#E8DFC9)', ink: '#13251F', accent: '#C8A24B' },
  },
  {
    id: 'lotus-garden', kind: 'website', renderer: 'lotus-garden',
    name: 'Lotus Garden', tier: 'premium', price_lkr: 3400, sort: 9,
    tagline: 'Airy botanical romance — hand-drawn lotus linework, sage and blush washes, soft garden light.',
    thumb: { bg: 'linear-gradient(160deg,#FBFAF6,#EAF0E4 60%,#F7E8E4)', ink: '#44503F', accent: '#7C8B74' },
  },
  {
    id: 'midnight-poruwa', kind: 'website', renderer: 'golden-seal', theme: MIDNIGHT_THEME,
    name: 'Midnight Poruwa', tier: 'premium', price_lkr: 3900, sort: 10,
    tagline: 'The Golden Seal experience recast in deep midnight green and brushed gold.',
    thumb: { bg: 'linear-gradient(160deg,#0F1A15,#16261E 60%,#0C1511)', ink: '#F1ECDF', accent: '#D4AF5E', frameBg: 'rgba(15,26,21,.55)', dark: true },
  },
  {
    id: 'moonstone', kind: 'website', renderer: 'moonstone',
    name: 'Moonstone', tier: 'premium', price_lkr: 4400, sort: 11,
    tagline: 'Stark editorial minimalism — monumental type, generous silence, one cool moonstone accent.',
    thumb: { bg: 'linear-gradient(160deg,#FAFAF7,#EFEFEA)', ink: '#141412', accent: '#7F93A8' },
  },
  {
    id: 'ceylon-heritage', kind: 'website', renderer: 'ceylon-heritage',
    name: 'Ceylon Heritage', tier: 'premium', price_lkr: 4900, sort: 12,
    tagline: 'A ceremonial invitation in maroon and antique gold — liya-vela flourishes, oil-lamp motifs, poruwa tradition.',
    thumb: { bg: 'linear-gradient(160deg,#4E1A1A,#701919 60%,#3F1212)', ink: '#F2E3C8', accent: '#C9A227', frameBg: 'rgba(63,18,18,.5)', dark: true },
  },
  {
    id: 'candlelight', kind: 'website', renderer: 'candlelight',
    name: 'Candlelight', tier: 'premium', price_lkr: 5400, sort: 13,
    tagline: 'An evening romance — warm candle-glow on deep plum, glowing timelines, after-dark elegance.',
    thumb: { bg: 'radial-gradient(90% 70% at 50% 30%, #3A2335, #171013 75%)', ink: '#E8D9C3', accent: '#E0A458', frameBg: 'rgba(23,16,19,.55)', dark: true },
  },
  {
    id: 'gilded-arch', kind: 'website', renderer: 'gilded-arch',
    name: 'Gilded Arch', tier: 'pro', price_lkr: 5900, sort: 14,
    tagline: 'Art-deco grandeur — champagne geometry, gilded arches and stepped frames on midnight black.',
    thumb: { bg: 'linear-gradient(160deg,#101014,#1A1A22 60%,#0C0C10)', ink: '#EFE3C8', accent: '#D6B86B', frameBg: 'rgba(16,16,20,.55)', dark: true },
  },
  {
    id: 'poruwe-royale', kind: 'website', renderer: 'royale',
    name: 'Poruwe Royale', tier: 'pro', price_lkr: 7900, sort: 15,
    tagline: 'The grand editorial — a magazine-grade invitation with frontispiece typography, plus a designer session and priority support.',
    thumb: { bg: 'linear-gradient(160deg,#F7F4EC,#EFE9DB 55%,#E6DDC8)', ink: '#191C18', accent: '#A8894E' },
  },
];

const DEFAULT_SETTINGS = {
  currency: 'LKR',
  bank: { accountName: '', bank: '', branch: '', accountNumber: '' },
  payhere: { merchantId: '', merchantSecret: '', sandbox: true, enabled: false },
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
