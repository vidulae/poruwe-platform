// Date/display derivations for renderers. Pure functions, Sri Lanka time (+05:30).
'use strict';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

function pad2(n) { return String(n).padStart(2, '0'); }

function parseISODate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return { y, mo, d, date: new Date(Date.UTC(y, mo - 1, d)) };
}

function t12(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return '';
  let h = +m[1]; const min = m[2];
  const mer = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${min} ${mer}`;
}

function minusMinutes(hhmm, mins) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return '';
  let total = (+m[1]) * 60 + (+m[2]) - mins;
  if (total < 0) total += 1440;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

function initialsOf(name) {
  const s = String(name || '').trim();
  return s ? s[0].toUpperCase() : '·';
}

function longDate(iso) {
  const p = parseISODate(iso);
  if (!p) return '';
  return `${DAYS[p.date.getUTCDay()]}, ${pad2(p.d)} ${MONTHS[p.mo - 1]} ${p.y}`;
}

function mediumDate(iso) {
  const p = parseISODate(iso);
  if (!p) return '';
  return `${pad2(p.d)} ${MONTHS[p.mo - 1]} ${p.y}`;
}

// All display strings a renderer needs, derived from order.data
function derive(data) {
  const d = data || {};
  const couple = d.couple || {};
  const event = d.event || {};
  const venue = d.venue || {};
  const rsvp = d.rsvp || {};

  const groom = String(couple.groom || 'Groom').trim();
  const bride = String(couple.bride || 'Bride').trim();
  const p = parseISODate(event.date);
  const time = /^\d{1,2}:\d{2}$/.test(event.time || '') ? event.time : '10:00';
  const arriveBy = /^\d{1,2}:\d{2}$/.test(event.arriveBy || '') ? event.arriveBy : minusMinutes(time, 30);

  const venueName = String(venue.name || 'The Venue').trim();
  const nameParts = venueName.split(/\s+/);
  const venueFirst = nameParts[0] || venueName;
  const venueRest = nameParts.slice(1).join(' ');

  let expiresAt = null;
  if (p) {
    const end = new Date(`${event.date}T23:59:59+05:30`);
    end.setUTCDate(end.getUTCDate() + 3);
    expiresAt = end;
  }

  let rsvpBy = event.rsvpBy;
  if (!parseISODate(rsvpBy) && p) {
    const r = new Date(p.date);
    r.setUTCDate(r.getUTCDate() - 18);
    rsvpBy = `${r.getUTCFullYear()}-${pad2(r.getUTCMonth() + 1)}-${pad2(r.getUTCDate())}`;
  }

  return {
    groom, bride,
    gi: initialsOf(groom), bi: initialsOf(bride),
    coupleTitle: `${groom} & ${bride}`,
    dDots: p ? `${pad2(p.d)} · ${MONTHS[p.mo - 1]} · ${p.y}` : '',
    dateLong: p ? longDate(event.date) : '',
    dateMedium: p ? mediumDate(event.date) : '',
    dateShort: p ? `${pad2(p.d)}.${pad2(p.mo)}.${p.y}` : '',
    countdownISO: p ? `${event.date}T${pad2(+time.split(':')[0])}:${time.split(':')[1]}:00+05:30` : '',
    timeDisplay: t12(time),
    arriveDisplay: t12(arriveBy),
    arriveNote: String(d.arriveNote || '').trim() ||
      (t12(arriveBy) ? `Kindly arrive by ${t12(arriveBy)} so we can begin the ceremony together, right on time.` : ''),
    accommodation: String(d.accommodation || '').trim() || 'On-site rooms available for guests travelling from afar. Please contact us for reservations.',
    rsvpByDisplay: mediumDate(rsvpBy),
    venueName, venueFirst, venueRest,
    venueAddress: String(venue.address || '').trim(),
    mapQuery: String(venue.mapQuery || '').trim() || `${venueName} ${venue.address || ''}`.trim(),
    venueWebsite: String(venue.website || '').trim(),
    rsvpWa: String(rsvp.wa || '').replace(/\D/g, ''),
    expiresAt,
    year: p ? p.y : new Date().getFullYear(),
  };
}

function formatLKR(n) {
  const v = Math.round(Number(n) || 0);
  if (v === 0) return 'FREE';
  return 'LKR ' + v.toLocaleString('en-US');
}

module.exports = { derive, formatLKR, parseISODate, longDate, mediumDate, t12 };
