/* Poruwe invitation builder — wizard, autosave, photos, checkout */
(function () {
  'use strict';
  const O = window.ORDER, T = window.TPL;
  const d = O.data || {};
  d.couple = d.couple || {}; d.event = d.event || {}; d.venue = d.venue || {};
  d.story = d.story || []; d.program = d.program || [];
  d.contacts = (d.contacts && d.contacts.length === 2) ? d.contacts : [
    { role: 'The Groom', name: '', phone: '', wa: '' },
    { role: 'The Bride', name: '', phone: '', wa: '' },
  ];
  d.rsvp = d.rsvp || {}; d.customer = d.customer || {}; d.photos = d.photos || {};

  const isWebsite = O.kind === 'website';
  const STEPS = isWebsite
    ? ['couple', 'event', 'venue', 'story', 'program', 'contacts', 'photos', 'review']
    : (O.kind === 'image' ? ['couple', 'event', 'venue', 'rsvp', 'photo', 'review'] : ['couple', 'event', 'venue', 'rsvp', 'review']);
  const LABELS = { couple: 'Couple', event: 'Date & Time', venue: 'Venue', story: 'Your Story', program: 'The Day', contacts: 'Contacts', photos: 'Photos', rsvp: 'RSVP', photo: 'Photo', review: 'Review & Pay' };
  let cur = 0;
  let checkout = null;
  let payMethod = null;

  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 3200); };

  /* ------------------------------ step markup ------------------------------ */
  function fld(label, name, value, opts) {
    const o = opts || {};
    return `<div class="field"><label>${label}</label><input name="${name}" type="${o.type || 'text'}" value="${esc(value)}" placeholder="${esc(o.ph || '')}" ${o.req ? 'required' : ''} />${o.hint ? `<div class="hint">${o.hint}</div>` : ''}</div>`;
  }

  function stepHtml(step) {
    if (step === 'couple') return `
      <h2>The couple</h2><p class="sub">First names work beautifully — they appear across the invitation.</p>
      <div class="frow">${fld("Groom's name", 'couple.groom', d.couple.groom, { ph: 'Sahan', req: 1 })}${fld("Bride's name", 'couple.bride', d.couple.bride, { ph: 'Dilini', req: 1 })}</div>
      <div class="frow">${fld('Your name (for the order)', 'customer.name', d.customer.name, { ph: 'Who is ordering this?' })}${fld('Your WhatsApp number', 'customer.wa', d.customer.wa, { ph: '94771234567', hint: 'We reach you here about your order.' })}</div>`;
    if (step === 'event') return `
      <h2>Date &amp; time</h2><p class="sub">Your invitation link stays live until 3 days after this date, then everything is auto-deleted.</p>
      <div class="frow">${fld('Wedding date', 'event.date', d.event.date, { type: 'date', req: 1 })}${fld('Ceremony time', 'event.time', d.event.time || '10:00', { type: 'time' })}</div>
      <div class="frow">${fld('Guests arrive by', 'event.arriveBy', d.event.arriveBy, { type: 'time', hint: 'Optional — defaults to 30 minutes before.' })}${fld('RSVP by', 'event.rsvpBy', d.event.rsvpBy, { type: 'date', hint: 'Optional deadline shown to guests.' })}</div>`;
    if (step === 'venue') return `
      <h2>The venue</h2><p class="sub">Where the celebration happens.</p>
      ${fld('Venue name', 'venue.name', d.venue.name, { ph: 'The Lakeview Grand', req: 1 })}
      ${fld('Address', 'venue.address', d.venue.address, { ph: 'Temple Road, Kandy 20000, Sri Lanka' })}
      <div class="frow">${fld('Google Maps search (optional)', 'venue.mapQuery', d.venue.mapQuery, { hint: 'Defaults to name + address.' })}${fld('Venue website (optional)', 'venue.website', d.venue.website, { ph: 'https://…' })}</div>`;
    if (step === 'story') return `
      <h2>Your story</h2><p class="sub">Four short chapters of how you got here. Edit freely — or keep our words.</p>
      <div id="storyRows"></div><button class="addrow" data-add="story">+ Add a chapter</button>`;
    if (step === 'program') return `
      <h2>The day ahead</h2><p class="sub">The programme guests will follow.</p>
      <div id="programRows"></div><button class="addrow" data-add="program">+ Add an item</button>`;
    if (step === 'contacts') return `
      <h2>Contacts</h2><p class="sub">Shown on the invitation so guests can reach you.</p>
      ${[0, 1].map((i) => `
        <div class="rowitem">
          <div class="frow">${fld('Role', `contacts.${i}.role`, d.contacts[i].role)}${fld('Name', `contacts.${i}.name`, d.contacts[i].name)}</div>
          <div class="frow">${fld('Phone (display)', `contacts.${i}.phone`, d.contacts[i].phone, { ph: '+94 77 123 4567' })}${fld('WhatsApp number', `contacts.${i}.wa`, d.contacts[i].wa, { ph: '94771234567' })}</div>
        </div>`).join('')}
      ${fld('RSVP WhatsApp number', 'rsvp.wa', d.rsvp.wa, { ph: '94771234567', hint: 'Guest RSVPs open WhatsApp to this number.', req: 1 })}`;
    if (step === 'rsvp') return `
      <h2>RSVP contact</h2><p class="sub">Printed on the invitation for guests.</p>
      ${fld('RSVP WhatsApp number', 'rsvp.wa', d.rsvp.wa, { ph: '94771234567', req: 1 })}`;
    if (step === 'photos') return `
      <h2>Photos</h2><p class="sub">All optional — the design is beautiful with or without them. JPG/PNG, we resize automatically.</p>
      <div class="photo-grid">${photoSlot('groom', "Groom's photo")}${photoSlot('bride', "Bride's photo")}${photoSlot('venue', 'Venue photo')}</div>`;
    if (step === 'photo') return `
      <h2>Photo</h2><p class="sub">Optional — a couple photo makes the card personal.</p>
      <div class="photo-grid">${photoSlot('card', 'Couple photo')}</div>`;
    if (step === 'review') return `
      <h2>Review &amp; ${T.price === 0 ? 'publish' : 'payment'}</h2><p class="sub">Preview your invitation, then ${T.price === 0 ? 'publish it — free' : 'complete payment to go live'}.</p>
      <div class="summary" id="summary"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        <button class="btn btn-line" id="bigPreview">Open full preview</button>
      </div>
      <div class="paybox" id="paybox"><h4>Loading payment options…</h4></div>`;
    return '';
  }

  function photoSlot(kind, label) {
    const id = d.photos[kind];
    return `<div class="photo-slot" data-photo="${kind}">
      ${id ? `<img src="/img/${id}" alt="" />` : `<div class="ph-empty"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-5-4-9 8"/></svg><span style="font-size:.85rem">Tap to upload</span></div>`}
      <div class="lbl">${label}</div>
      <input type="file" accept="image/*" hidden />
    </div>`;
  }

  function rowsHtml(listName) {
    const list = d[listName];
    return list.map((it, i) => listName === 'story'
      ? `<div class="rowitem"><button class="rm" data-rm="${listName}:${i}">Remove</button>
          <div class="frow">${fld('Label', `story.${i}.label`, it.label, { ph: 'The First Hello' })}${fld('Title', `story.${i}.title`, it.title, { ph: 'Where We Met' })}</div>
          <div class="field"><label>Text</label><textarea name="story.${i}.text">${esc(it.text)}</textarea></div></div>`
      : `<div class="rowitem"><button class="rm" data-rm="${listName}:${i}">Remove</button>
          <div class="frow">${fld('Time', `program.${i}.time`, it.time, { ph: '9:00 AM' })}${fld('Title', `program.${i}.title`, it.title, { ph: 'Guest Arrival' })}</div>
          <div class="field"><label>Description</label><textarea name="program.${i}.text">${esc(it.text)}</textarea></div></div>`).join('');
  }

  /* ------------------------------- rendering ------------------------------- */
  function render() {
    $('#progress').innerHTML = STEPS.map((s, i) =>
      `<div class="pstep ${i < cur ? 'done' : ''} ${i === cur ? 'cur' : ''}" data-goto="${i}">${LABELS[s]}</div>`).join('');
    $('#steps').innerHTML = `<div class="step-panel cur">${stepHtml(STEPS[cur])}</div>`;
    if (STEPS[cur] === 'story') $('#storyRows').innerHTML = rowsHtml('story');
    if (STEPS[cur] === 'program') $('#programRows').innerHTML = rowsHtml('program');
    if (STEPS[cur] === 'review') { renderSummary(); loadCheckout(); }
    $('#backBtn').style.visibility = cur === 0 ? 'hidden' : 'visible';
    $('#nextBtn').style.display = STEPS[cur] === 'review' ? 'none' : '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    bindPanel();
  }

  function renderSummary() {
    const rows = [
      ['Couple', `${d.couple.groom || '—'} & ${d.couple.bride || '—'}`],
      ['Date', d.event.date || '—'], ['Time', d.event.time || '—'],
      ['Venue', d.venue.name || '—'], ['Template', `${T.name} (${T.priceDisplay})`],
      ['Order no', O.orderNo],
    ];
    $('#summary').innerHTML = rows.map(([k, v]) => `<div><div class="k">${k}</div><div class="v">${esc(v)}</div></div>`).join('');
  }

  /* ------------------------------ data collect ----------------------------- */
  function collect() {
    document.querySelectorAll('#steps [name]').forEach((el) => {
      const path = el.name.split('.');
      let ref = d;
      for (let i = 0; i < path.length - 1; i++) {
        const k = /^\d+$/.test(path[i]) ? +path[i] : path[i];
        if (ref[k] == null) ref[k] = /^\d+$/.test(path[i + 1]) ? [] : {};
        ref = ref[k];
      }
      ref[path[path.length - 1]] = el.value;
    });
  }

  let saveTimer = null, saving = false;
  function save(now) {
    collect();
    clearTimeout(saveTimer);
    return new Promise((resolve) => {
      saveTimer = setTimeout(async () => {
        if (saving) return resolve();
        saving = true;
        $('#saveState').textContent = 'Saving…';
        try {
          const r = await fetch(`/api/orders/${O.token}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) });
          if (!r.ok) throw new Error();
          $('#saveState').textContent = 'Draft saved automatically';
        } catch { $('#saveState').textContent = 'Save failed — check connection'; }
        saving = false;
        resolve();
      }, now ? 0 : 500);
    });
  }

  /* -------------------------------- photos -------------------------------- */
  function resizeImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const max = 1600;
        let { width: w, height: h } = img;
        if (w > max || h > max) { const k = Math.min(max / w, max / h); w = Math.round(w * k); h = Math.round(h * k); }
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(cv.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async function uploadPhoto(kind, file, slot) {
    try {
      slot.querySelector('.lbl').textContent = 'Uploading…';
      const dataUrl = await resizeImage(file);
      const r = await fetch(`/api/orders/${O.token}/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, dataUrl }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      d.photos[kind] = j.id;
      render();
      toast('Photo uploaded');
    } catch { toast('Upload failed — try a smaller image'); render(); }
  }

  /* ------------------------------- checkout -------------------------------- */
  async function loadCheckout() {
    const box = $('#paybox');
    try {
      const r = await fetch(`/api/orders/${O.token}/checkout`);
      checkout = await r.json();
    } catch { box.innerHTML = '<h4>Could not load payment options — refresh to retry.</h4>'; return; }
    if (checkout.methods.includes('free')) {
      box.innerHTML = `<h4>Free template</h4>
        <p style="margin-bottom:16px">No payment needed. Publish now and share your link straight away.</p>
        <button class="btn btn-gold" id="payBtn" style="width:100%">Publish my invitation</button>`;
      $('#payBtn').onclick = () => submit('free');
      return;
    }
    payMethod = checkout.methods[0];
    box.innerHTML = `
      <div class="price-line"><span class="lbl-t">Total</span><span class="amt">${checkout.priceDisplay}</span></div>
      <div class="method-tabs">${checkout.methods.map((m) => `<div class="mtab ${m === payMethod ? 'sel' : ''}" data-m="${m}">${m === 'manual' ? 'Bank transfer' : 'Card / PayHere'}</div>`).join('')}</div>
      <div id="methodBody"></div>`;
    box.querySelectorAll('.mtab').forEach((t) => t.onclick = () => { payMethod = t.dataset.m; box.querySelectorAll('.mtab').forEach((x) => x.classList.toggle('sel', x === t)); renderMethod(); });
    renderMethod();
  }

  function renderMethod() {
    const el = $('#methodBody');
    if (payMethod === 'manual') {
      const b = checkout.bank || {};
      const hasBank = b.accountNumber;
      el.innerHTML = `
        <h4>Bank transfer</h4>
        ${hasBank ? `
          <div class="bankrow"><span>Account name</span><b>${esc(b.accountName)}</b></div>
          <div class="bankrow"><span>Bank</span><b>${esc(b.bank)}</b></div>
          <div class="bankrow"><span>Branch</span><b>${esc(b.branch)}</b></div>
          <div class="bankrow" style="border-bottom:none"><span>Account number</span><b>${esc(b.accountNumber)}</b></div>`
        : '<p style="margin-bottom:10px">Bank details will be shared with you on WhatsApp right after you submit.</p>'}
        <div class="field" style="margin-top:16px"><label>Transfer reference / your name on the slip</label><input id="payRef" placeholder="e.g. TT-20260831 or your name" /></div>
        <div class="photo-grid" style="grid-template-columns:1fr"><div class="photo-slot" data-photo="slip"><div class="ph-empty" style="height:64px"><span style="font-size:.85rem">Optional: tap to attach the payment slip</span></div><div class="lbl">Payment slip</div><input type="file" accept="image/*" hidden /></div></div>
        <button class="btn btn-gold" id="payBtn" style="width:100%;margin-top:14px">I have paid — submit for verification</button>
        <p class="hint" style="margin-top:10px">We verify transfers within a few hours and your invitation goes live immediately after.</p>`;
      $('#payBtn').onclick = () => {
        const ref = $('#payRef').value.trim();
        if (!ref) return toast('Please add your transfer reference');
        submit('manual', ref);
      };
      bindPhotoSlots(el);
    } else if (payMethod === 'payhere') {
      el.innerHTML = `<h4>Pay online with PayHere</h4>
        <p style="margin-bottom:16px">Cards, eZ Cash, mCash and bank apps. Your invitation activates automatically the moment payment succeeds.</p>
        <button class="btn btn-gold" id="payBtn" style="width:100%">Pay ${checkout.priceDisplay} securely</button>`;
      $('#payBtn').onclick = () => submit('payhere');
    }
  }

  async function submit(method, reference) {
    await save(true);
    const req = { groom: d.couple.groom, bride: d.couple.bride, date: d.event.date };
    if (!req.groom || !req.bride || !req.date) return toast('Couple names and wedding date are required');
    if (T.kind === 'website' && !d.rsvp.wa) return toast('Please add the RSVP WhatsApp number (Contacts step)');
    const btn = $('#payBtn');
    btn.disabled = true;
    try {
      const r = await fetch(`/api/orders/${O.token}/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ method, reference }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || j.error);
      if (j.checkout) { // PayHere redirect
        const f = document.createElement('form');
        f.method = 'POST'; f.action = j.checkout.action;
        Object.entries(j.checkout.fields).forEach(([k, v]) => {
          const i = document.createElement('input');
          i.type = 'hidden'; i.name = k; i.value = v; f.appendChild(i);
        });
        document.body.appendChild(f);
        f.submit();
        return;
      }
      location.href = `/status/${O.token}`;
    } catch (e) { toast(e.message || 'Something went wrong'); btn.disabled = false; }
  }

  /* -------------------------------- binding -------------------------------- */
  function bindPhotoSlots(scope) {
    (scope || document).querySelectorAll('.photo-slot').forEach((slot) => {
      const input = slot.querySelector('input[type=file]');
      slot.onclick = (e) => { if (e.target !== input) input.click(); };
      input.onchange = () => { if (input.files[0]) uploadPhoto(slot.dataset.photo, input.files[0], slot); };
    });
  }

  function bindPanel() {
    document.querySelectorAll('#steps [name]').forEach((el) => el.addEventListener('input', () => save()));
    document.querySelectorAll('[data-add]').forEach((b) => b.onclick = () => {
      collect();
      const l = b.dataset.add;
      if (l === 'story' && d.story.length < 6) d.story.push({ label: '', title: '', text: '' });
      if (l === 'program' && d.program.length < 8) d.program.push({ time: '', title: '', text: '' });
      render();
    });
    document.querySelectorAll('[data-rm]').forEach((b) => b.onclick = () => {
      collect();
      const [l, i] = b.dataset.rm.split(':');
      d[l].splice(+i, 1);
      save();
      render();
    });
    document.querySelectorAll('[data-goto]').forEach((p) => p.onclick = () => { collect(); save(); cur = +p.dataset.goto; render(); });
    bindPhotoSlots($('#steps'));
    const bp = $('#bigPreview');
    if (bp) bp.onclick = async () => { await save(true); window.open(`/p/${O.token}`, '_blank'); };
  }

  $('#backBtn').onclick = () => { collect(); save(); if (cur > 0) { cur--; render(); } };
  $('#nextBtn').onclick = () => { collect(); save(); if (cur < STEPS.length - 1) { cur++; render(); } };
  $('#previewBtn').onclick = async () => { collect(); await save(true); window.open(`/p/${O.token}`, '_blank'); };

  render();
})();
