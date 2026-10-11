/* Poruwe invitation builder — wizard, autosave, photo cropping, checkout */
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

  // Sample defaults seeded by the server — used to auto-sync with the couple's real names
  const SAMPLE = { groom: 'Sahan', bride: 'Dilini', groomWa: '94770000001', brideWa: '94760000002' };

  const isWebsite = O.kind === 'website';
  const isLive = O.status === 'active'; // published orders: same wizard, edits go straight to the live invitation
  const finalStep = isLive ? 'live' : 'review';
  const STEPS = isWebsite
    ? ['couple', 'event', 'venue', 'story', 'program', 'contacts', 'photos', finalStep]
    : (O.kind === 'image' ? ['couple', 'event', 'venue', 'rsvp', 'photo', finalStep] : ['couple', 'event', 'venue', 'rsvp', finalStep]);
  const LABELS = { couple: 'Couple', event: 'Date & Time', venue: 'Venue', story: 'Your Story', program: 'The Day', contacts: 'Contacts', photos: 'Photos', rsvp: 'RSVP', photo: 'Photo', review: 'Review & Pay', live: 'Live' };
  const CROP_ASPECT = { groom: 1, bride: 1, card: 1, venue: 1.6 }; // slip is never cropped
  let cur = 0;
  let checkout = null;
  let payMethod = null;
  let payRefVal = '';   // survives payment-box re-renders
  let slipId = null;

  const $ = (s, el) => (el || document).querySelector(s);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const toast = (m, ms) => { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), ms || 3200); };

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
      <h2>Your story</h2><p class="sub">Four short chapters, pre-written for you — edit the words, or keep ours. Add or remove chapters freely.</p>
      <div id="storyRows"></div><button type="button" class="addrow" data-add="story">+ Add a chapter</button>`;
    if (step === 'program') return `
      <h2>The day ahead</h2><p class="sub">A ready-made programme — tweak times and titles to match your day.</p>
      <div id="programRows"></div><button type="button" class="addrow" data-add="program">+ Add an item</button>`;
    if (step === 'contacts') return `
      <h2>Contacts</h2><p class="sub">Pre-filled from the sample invitation — replace the numbers with your own. Names follow what you typed in step one.</p>
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
      <h2>Photos</h2><p class="sub">All optional — the design is beautiful with or without them. You'll crop each photo right here after choosing it.</p>
      <div class="photo-grid">${photoSlot('groom', "Groom's photo")}${photoSlot('bride', "Bride's photo")}${photoSlot('venue', 'Venue photo')}</div>`;
    if (step === 'photo') return `
      <h2>Photo</h2><p class="sub">Optional — a couple photo makes the card personal. You'll crop it after choosing.</p>
      <div class="photo-grid">${photoSlot('card', 'Couple photo')}</div>`;
    if (step === 'review') return `
      <h2>Review &amp; ${T.price === 0 ? 'publish' : 'payment'}</h2><p class="sub">Preview your invitation, then ${T.price === 0 ? 'publish it — free' : 'complete payment to go live'}.</p>
      <div class="summary" id="summary"></div>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:8px">
        <button type="button" class="btn btn-line" id="bigPreview">Open full preview</button>
      </div>
      <div class="paybox" id="paybox"><h4>Loading payment options…</h4></div>`;
    if (step === 'live') return `
      <h2>Your invitation is live</h2><p class="sub">Everything you change here is saved automatically and appears on your invitation straight away — no need to pay again.</p>
      <div class="summary" id="summary"></div>
      <div class="paybox">
        <h4>Your live invitation</h4>
        ${isWebsite && O.slug ? `<p style="margin-bottom:14px;word-break:break-all"><a href="/i/${esc(O.slug)}" target="_blank" rel="noopener">${esc(location.origin + '/i/' + O.slug)}</a></p>` : ''}
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${isWebsite && O.slug ? `<button type="button" class="btn btn-gold" id="openLive">Open live invitation</button>` : ''}
          ${O.kind === 'pdf' ? `<a class="btn btn-gold" href="/d/${O.token}/invitation.pdf">Download fresh PDF</a>` : ''}
          ${O.kind === 'image' ? `<a class="btn btn-gold" href="/d/${O.token}/card.png">Download fresh image</a>` : ''}
          <a class="btn btn-line" href="/status/${O.token}">Order status</a>
        </div>
      </div>`;
    return '';
  }

  function photoSlot(kind, label, thumbId) {
    const id = thumbId || d.photos[kind];
    return `<div class="photo-slot" data-photo="${kind}">
      ${id ? `<img src="/img/${id}" alt="" />` : `<div class="ph-empty"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 15l-5-4-9 8"/></svg><span>Tap to choose &amp; crop</span></div>`}
      <div class="lbl">${label}</div>
      <input type="file" accept="image/*" hidden />
    </div>`;
  }

  function rowsHtml(listName) {
    const list = d[listName];
    if (!list.length) return '<p class="hint" style="margin-bottom:12px">No items — add one below.</p>';
    return list.map((it, i) => listName === 'story'
      ? `<div class="rowitem"><button type="button" class="rm" data-rm="story:${i}">✕ Remove</button>
          <div class="frow">${fld('Label', `story.${i}.label`, it.label, { ph: 'The First Hello' })}${fld('Title', `story.${i}.title`, it.title, { ph: 'Where We Met' })}</div>
          <div class="field"><label>Text</label><textarea name="story.${i}.text">${esc(it.text)}</textarea></div></div>`
      : `<div class="rowitem"><button type="button" class="rm" data-rm="program:${i}">✕ Remove</button>
          <div class="frow">${fld('Time', `program.${i}.time`, it.time, { ph: '9:00 AM' })}${fld('Title', `program.${i}.title`, it.title, { ph: 'Guest Arrival' })}</div>
          <div class="field"><label>Description</label><textarea name="program.${i}.text">${esc(it.text)}</textarea></div></div>`).join('');
  }

  /* ------------------------------- rendering ------------------------------- */
  function render() {
    $('#progress').innerHTML = STEPS.map((s, i) =>
      `<button type="button" class="pstep ${i < cur ? 'done' : ''} ${i === cur ? 'cur' : ''}" data-goto="${i}">${LABELS[s]}</button>`).join('');
    $('#steps').innerHTML = `<div class="step-panel cur">${stepHtml(STEPS[cur])}</div>`;
    if (STEPS[cur] === 'story') $('#storyRows').innerHTML = rowsHtml('story');
    if (STEPS[cur] === 'program') $('#programRows').innerHTML = rowsHtml('program');
    if (STEPS[cur] === 'review') { renderSummary(); loadCheckout(); }
    if (STEPS[cur] === 'live') renderSummary();
    $('#backBtn').style.visibility = cur === 0 ? 'hidden' : 'visible';
    $('#nextBtn').style.display = ['review', 'live'].includes(STEPS[cur]) ? 'none' : '';
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    syncDefaults();
    // show synced values in the inputs the user is looking at (contacts step holds all three)
    [['contacts.0.name', d.contacts[0].name], ['contacts.1.name', d.contacts[1].name], ['rsvp.wa', d.rsvp.wa]].forEach(([n, v]) => {
      const el = document.querySelector(`#steps [name="${n}"]`);
      if (el && v != null && el.value !== v) el.value = v;
    });
  }

  // Contact names (and the RSVP number) follow the couple step while still on sample defaults.
  // The RSVP number mirrors the groom's WhatsApp until the user edits the RSVP field itself.
  let rsvpAuto = !d.rsvp.wa || d.rsvp.wa === SAMPLE.groomWa || d.rsvp.wa === (d.contacts[0].wa || '').replace(/\D/g, '');
  function syncDefaults() {
    const g = (d.couple.groom || '').trim(), b = (d.couple.bride || '').trim();
    if (g && g !== SAMPLE.groom && (d.contacts[0].name === SAMPLE.groom || !d.contacts[0].name)) d.contacts[0].name = g;
    if (b && b !== SAMPLE.bride && (d.contacts[1].name === SAMPLE.bride || !d.contacts[1].name)) d.contacts[1].name = b;
    const gw = (d.contacts[0].wa || '').replace(/\D/g, '');
    if (gw && gw !== SAMPLE.groomWa && rsvpAuto) d.rsvp.wa = gw;
  }

  /* ------------------------- serialized autosave queue ---------------------- */
  let saveTimer = null, saving = false, saveAgain = false;
  function doSave() {
    if (saving) { saveAgain = true; return Promise.resolve(); }
    saving = true;
    $('#saveState').textContent = 'Saving…';
    return fetch(`/api/orders/${O.token}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: d }) })
      .then((r) => { if (!r.ok) throw new Error(); $('#saveState').textContent = isLive ? 'Saved — your live invitation is updated' : 'Draft saved automatically'; })
      .catch(() => { $('#saveState').textContent = 'Save failed — check connection'; })
      .finally(() => {
        saving = false;
        if (saveAgain) { saveAgain = false; return doSave(); }
      });
  }
  function save(now) {
    collect();
    clearTimeout(saveTimer);
    if (now) return doSave();
    return new Promise((resolve) => { saveTimer = setTimeout(() => doSave().then(resolve), 500); });
  }

  /* ------------------------------ photo cropper ----------------------------- */
  function openCropper(file, aspect) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => { URL.revokeObjectURL(url); resolve(null); toast('Could not read that image'); };
      img.onload = () => {
        const modal = $('#cropModal'), frame = $('#cropFrame'), pic = $('#cropImg'), zoom = $('#cropZoom');
        const fw = Math.min(window.innerWidth - 64, 340);
        const fh = Math.round(fw / aspect);
        frame.style.width = fw + 'px';
        frame.style.height = fh + 'px';
        pic.src = url;
        modal.classList.add('on');

        const base = Math.max(fw / img.naturalWidth, fh / img.naturalHeight); // cover
        let z = 1, tx = 0, ty = 0;
        const scale = () => base * z;
        function clamp() {
          const w = img.naturalWidth * scale(), h = img.naturalHeight * scale();
          tx = Math.min(0, Math.max(fw - w, tx));
          ty = Math.min(0, Math.max(fh - h, ty));
        }
        function center() { tx = (fw - img.naturalWidth * scale()) / 2; ty = (fh - img.naturalHeight * scale()) / 2; clamp(); }
        function paint() { pic.style.transform = `translate(${tx}px,${ty}px) scale(${scale()})`; }
        pic.style.width = img.naturalWidth + 'px';
        pic.style.transformOrigin = '0 0';
        zoom.value = 1;
        center(); paint();

        let drag = null;
        const down = (e) => { drag = { x: e.clientX, y: e.clientY, tx, ty }; frame.setPointerCapture(e.pointerId); };
        const move = (e) => { if (!drag) return; tx = drag.tx + (e.clientX - drag.x); ty = drag.ty + (e.clientY - drag.y); clamp(); paint(); };
        const up = () => { drag = null; };
        const onZoom = () => {
          const old = scale();
          z = +zoom.value;
          const nw = scale();
          // keep the frame centre fixed while zooming
          tx = fw / 2 - ((fw / 2 - tx) / old) * nw;
          ty = fh / 2 - ((fh / 2 - ty) / old) * nw;
          clamp(); paint();
        };
        frame.addEventListener('pointerdown', down);
        frame.addEventListener('pointermove', move);
        frame.addEventListener('pointerup', up);
        frame.addEventListener('pointercancel', up);
        zoom.addEventListener('input', onZoom);

        function finish(result) {
          frame.removeEventListener('pointerdown', down);
          frame.removeEventListener('pointermove', move);
          frame.removeEventListener('pointerup', up);
          frame.removeEventListener('pointercancel', up);
          zoom.removeEventListener('input', onZoom);
          $('#cropUse').onclick = null; $('#cropCancel').onclick = null;
          modal.classList.remove('on');
          URL.revokeObjectURL(url);
          resolve(result);
        }
        $('#cropCancel').onclick = () => finish(null);
        $('#cropUse').onclick = () => {
          const s = scale();
          const sx = -tx / s, sy = -ty / s, sw = fw / s, sh = fh / s;
          const outW = Math.min(aspect === 1 ? 900 : 1440, Math.round(sw));
          const outH = Math.round(outW / aspect);
          const cv = document.createElement('canvas');
          cv.width = outW; cv.height = outH;
          cv.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
          finish(cv.toDataURL('image/jpeg', 0.87));
        };
      };
      img.src = url;
    });
  }

  function resizePlain(file) { // slips: no crop, just downscale
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
      let dataUrl;
      if (kind === 'slip') {
        dataUrl = await resizePlain(file);
      } else {
        dataUrl = await openCropper(file, CROP_ASPECT[kind] || 1);
        if (!dataUrl) return; // cancelled
      }
      slot.querySelector('.lbl').textContent = 'Uploading…';
      const r = await fetch(`/api/orders/${O.token}/image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, dataUrl }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (kind === 'slip') {
        slipId = j.id;
        // update the slot in place — never re-render the payment box (it would wipe the reference)
        slot.innerHTML = `<img src="/img/${j.id}" alt="" /><div class="lbl">Payment slip attached ✓</div><input type="file" accept="image/*" hidden />`;
        toast('Payment slip attached');
      } else {
        d.photos[kind] = j.id;
        render();
        toast('Photo cropped & uploaded');
      }
    } catch (e) {
      toast('Upload failed — try a different image');
      if (kind !== 'slip') render();
    }
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
        <button type="button" class="btn btn-gold" id="payBtn" style="width:100%">Publish my invitation</button>`;
      $('#payBtn').onclick = () => submit('free');
      return;
    }
    payMethod = payMethod && checkout.methods.includes(payMethod) ? payMethod : checkout.methods[0];
    box.innerHTML = `
      <div class="price-line"><span class="lbl-t">Total</span><span class="amt">${checkout.priceDisplay}</span></div>
      <div class="method-tabs">
        ${checkout.methods.map((m) => `<div class="mtab ${m === payMethod ? 'sel' : ''}" data-m="${m}">${m === 'manual' ? 'Bank transfer' : 'Card / PayHere'}</div>`).join('')}
        ${checkout.payhereComingSoon ? '<div class="mtab soon">Card payments<small>PayHere — coming soon</small></div>' : ''}
      </div>
      <div id="methodBody"></div>`;
    box.querySelectorAll('.mtab[data-m]').forEach((t) => t.onclick = () => { payMethod = t.dataset.m; box.querySelectorAll('.mtab').forEach((x) => x.classList.toggle('sel', x === t)); renderMethod(); });
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
          <p style="margin-bottom:12px">Transfer <b>${checkout.priceDisplay}</b> to this account — now or after submitting. Your order stays editable the whole time.</p>
          <div class="bankrow"><span>Account name</span><b>${esc(b.accountName)}</b></div>
          <div class="bankrow"><span>Bank</span><b>${esc(b.bank)}</b></div>
          <div class="bankrow"><span>Branch</span><b>${esc(b.branch)}</b></div>
          <div class="bankrow" style="border-bottom:none"><span>Account number</span><b>${esc(b.accountNumber)}</b></div>`
        : '<p style="margin-bottom:10px">Submit your order first — the bank details and every next step arrive on your WhatsApp right away.</p>'}
        <div class="field" style="margin-top:16px"><label>Your WhatsApp number</label><input id="payWa" inputmode="numeric" placeholder="9477xxxxxxx" value="${esc(d.customer.wa || '')}" />
          <div class="hint">Payment details, order updates and your finished link are sent here.</div></div>
        <div class="field"><label>Transfer reference <span class="opt">optional — add it once you've transferred</span></label><input id="payRef" placeholder="e.g. TT-20261011 or your name" value="${esc(payRefVal)}" /></div>
        <div class="photo-grid" style="grid-template-columns:1fr">
          ${slipId
            ? `<div class="photo-slot" data-photo="slip"><img src="/img/${slipId}" alt="" /><div class="lbl">Payment slip attached ✓</div><input type="file" accept="image/*" hidden /></div>`
            : `<div class="photo-slot" data-photo="slip"><div class="ph-empty" style="height:64px"><span>Tap to attach your payment slip — now or after you transfer</span></div><div class="lbl">Payment slip <span class="opt">optional at this step</span></div><input type="file" accept="image/*" hidden /></div>`}
        </div>
        <button type="button" class="btn btn-gold" id="payBtn" style="width:100%;margin-top:14px">${hasBank ? 'Submit order for verification' : 'Submit my order'}</button>
        <p class="hint" style="margin-top:10px">After submitting: transfer the amount, then add the slip here or send it on WhatsApp. We verify within a few hours and your invitation goes live.</p>`;
      $('#payRef').addEventListener('input', () => { payRefVal = $('#payRef').value; });
      $('#payWa').addEventListener('input', () => { d.customer.wa = $('#payWa').value.replace(/\D/g, ''); save(); });
      $('#payBtn').onclick = () => {
        payRefVal = $('#payRef').value.trim();
        d.customer.wa = $('#payWa').value.replace(/\D/g, '');
        if (!d.customer.wa) { $('#payWa').focus(); return toast('Add your WhatsApp number — payment details are sent there'); }
        submit('manual', payRefVal);
      };
    } else if (payMethod === 'payhere') {
      el.innerHTML = `<h4>Pay online with PayHere</h4>
        <p style="margin-bottom:16px">Cards, eZ Cash, mCash and bank apps. Your invitation activates automatically the moment payment succeeds.</p>
        <button type="button" class="btn btn-gold" id="payBtn" style="width:100%">Pay ${checkout.priceDisplay} securely</button>`;
      $('#payBtn').onclick = () => submit('payhere');
    }
  }

  async function submit(method, reference) {
    await save(true);
    const req = { groom: d.couple.groom, bride: d.couple.bride, date: d.event.date };
    if (!req.groom || !req.bride || !req.date) return toast('Couple names and wedding date are required');
    if (T.kind === 'website' && !d.rsvp.wa) return toast('Please add the RSVP WhatsApp number (Contacts step)');
    const btn = $('#payBtn');
    if (btn) btn.disabled = true;
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
    } catch (e) { toast(e.message || 'Something went wrong — please try again'); if (btn) btn.disabled = false; }
  }

  /* --------------------------- delegated event wiring ----------------------- */
  document.addEventListener('input', (e) => {
    if (e.target.name === 'rsvp.wa') rsvpAuto = false; // the user took over the RSVP number
    if (e.target.closest('#steps') && e.target.name) save();
  });

  document.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) {
      collect();
      const [list, idx] = rm.dataset.rm.split(':');
      d[list].splice(+idx, 1);
      render();
      save(true);
      toast('Removed');
      return;
    }
    const add = e.target.closest('[data-add]');
    if (add) {
      collect();
      const list = add.dataset.add;
      if (list === 'story' && d.story.length < 6) d.story.push({ label: '', title: '', text: '' });
      else if (list === 'program' && d.program.length < 8) d.program.push({ time: '', title: '', text: '' });
      else return toast('Maximum items reached');
      render();
      save(true);
      return;
    }
    const go = e.target.closest('[data-goto]');
    if (go) { collect(); save(); cur = +go.dataset.goto; render(); return; }
    const slot = e.target.closest('.photo-slot');
    if (slot) {
      const input = slot.querySelector('input[type=file]');
      if (input && e.target !== input) input.click();
      return;
    }
    if (e.target.closest('#bigPreview')) { save(true).then(() => window.open(`/p/${O.token}`, '_blank')); }
    if (e.target.closest('#openLive')) { save(true).then(() => window.open(`/i/${O.slug}`, '_blank')); }
  });

  document.addEventListener('change', (e) => {
    const input = e.target;
    const slot = input.closest && input.closest('.photo-slot');
    if (slot && input.type === 'file' && input.files && input.files[0]) {
      uploadPhoto(slot.dataset.photo, input.files[0], slot);
      input.value = '';
    }
  });

  $('#backBtn').onclick = () => { collect(); save(); if (cur > 0) { cur--; render(); } };
  $('#nextBtn').onclick = () => { collect(); save(); if (cur < STEPS.length - 1) { cur++; render(); } };
  $('#previewBtn').onclick = async () => { await save(true); window.open(isLive && isWebsite && O.slug ? `/i/${O.slug}` : `/p/${O.token}`, '_blank'); };

  if (isLive) $('#previewBtn').textContent = 'View live';
  render();
})();
