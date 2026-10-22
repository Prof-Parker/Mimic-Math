/* UI controller. All state lives in memory only: nothing is stored or sent anywhere. */
(function () {
  'use strict';
  const MM = window.MM;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const app = $('#app');

  const session = { mode: 'mixed', length: 10, deck: [], index: 0, results: [] };
  let cur = null; // current question state

  /* ================= Start screen ================= */
  function showStart() {
    app.innerHTML =
      '<section class="card start">' +
      '<h2>Practice applied medication math</h2>' +
      '<p>Read the order, check the vial or bottle, work out what to give, then <strong>choose the syringe and needle and draw up the dose</strong>. ' +
      'You will see your answer checked step by step, with the dimensional analysis if you miss one.</p>' +
      '<form id="startForm" class="start-form">' +
      '<fieldset><legend>Practice set</legend>' +
      Object.keys(MM.MODES).map((k) => '<label class="choice wide"><input type="radio" name="mode" value="' + k + '"' + (k === session.mode ? ' checked' : '') + '><span>' + esc(MM.MODES[k].label) + '</span></label>').join('') +
      '</fieldset>' +
      '<fieldset><legend>Number of questions</legend><div class="row">' +
      [5, 10, 20].map((n) => '<label class="choice"><input type="radio" name="len" value="' + n + '"' + (n === session.length ? ' checked' : '') + '><span>' + n + '</span></label>').join('') +
      '</div></fieldset>' +
      '<button class="btn primary big" type="submit">Start practice</button></form>' +
      '<p class="muted small">No account, no tracking: your answers stay in this browser tab and disappear when you close or refresh it.</p>' +
      '</section>' + guideHTML();
    $('#startForm').addEventListener('submit', (e) => {
      e.preventDefault();
      session.mode = $('input[name=mode]:checked').value;
      session.length = +$('input[name=len]:checked').value;
      session.deck = MM.makeDeck(session.mode, session.length);
      session.index = 0;
      session.results = [];
      showQuestion();
    });
    window.scrollTo(0, 0);
  }

  function guideHTML() {
    return '<details class="card guide"><summary>Quick reference: syringes &amp; needles</summary>' +
      '<table class="ref"><thead><tr><th>Use</th><th>Syringe</th><th>Needle</th></tr></thead><tbody>' +
      '<tr><td>Insulin (U-100) only</td><td>30, 50 or 100 unit insulin syringe. Marks are <em>units</em> of insulin, never mg or mL of another drug.</td><td>Fixed to syringe</td></tr>' +
      '<tr><td>Subcutaneous, ≤ 1 mL (not insulin)</td><td>1 mL Luer-Lock or 1 mL TB syringe (marked in mL)</td><td>25 G × ⅝" (TB: fixed)</td></tr>' +
      '<tr><td>Intramuscular</td><td>Smallest Luer-Lock syringe that holds the volume (an exact 3 mL or 5 mL may also use the next size up)</td><td>21 G × 1" or 1½"; 25 G × 1" for small adults</td></tr>' +
      '<tr><td>IV push</td><td>Smallest Luer-Lock syringe that holds the volume (an exact 3 mL or 5 mL may also use the next size up)</td><td>None: needleless connector</td></tr>' +
      '<tr><td>Reconstituting a powder vial</td><td>Smallest Luer-Lock syringe that holds the diluent volume</td><td>Blunt fill needle to withdraw diluent and medication; then an injection needle (IM/SQ) or needleless connector (IV)</td></tr>' +
      '<tr><td>Choosing a size</td><td>1 mL ≤ 1 mL · 3 mL ≤ 3 mL · 5 mL ≤ 5 mL · 10 mL ≤ 10 mL</td><td></td></tr>' +
      '</tbody></table><p class="muted small">Practice tool for learning only. Always follow your facility policy and current drug references.</p></details>';
  }

  /* ================= Question screen ================= */
  function showQuestion() {
    const q = session.deck[session.index];
    const oral = q.category === 'po' || q.category === 'poTrap';
    cur = { q, oral, insulin: q.category === 'insulin', stage: q.category === 'recon' ? 1 : 0, prep: null, calc: '', syringe: null, needle: null, tick: 0, decision: null, submitted: false };

    const score = session.results.filter((r) => r.correct).length;
    app.innerHTML =
      '<div class="qhead"><h2 id="qtitle" tabindex="-1">Question ' + (session.index + 1) + ' of ' + session.length + '</h2>' +
      '<div class="progress" aria-hidden="true"><span style="width:' + (session.index / session.length * 100) + '%"></span></div>' +
      '<div class="muted small">Correct so far: ' + score + ' / ' + session.results.length + '</div></div>' +
      '<div class="layout"><div class="col">' + MM.orderCard(q) + MM.productCard(q) + '</div>' +
      '<div class="col"><section class="card work" id="work" aria-label="Your answer"></section>' +
      '<div id="feedback"></div></div></div>';
    renderWork();
    window.scrollTo(0, 0);
    $('#qtitle').focus({ preventScroll: true });
  }

  function partTag(text) { return '<p class="part-tag">' + text + '</p>'; }

  /* (Re)draws the answer card for the current question / stage and wires its controls. */
  function renderWork() {
    const q = cur.q, rc = q.product && q.product.recon;
    let inner;
    if (cur.oral) inner = oralWorkHTML(q);
    else if (cur.stage === 1) inner = partTag('Part 1 of 2 · Prepare the vial') + reconPrepHTML(q);
    else inner = (cur.stage === 2 ? partTag('Part 2 of 2 · Draw up the ordered dose') +
      '<p class="muted small">The vial is now reconstituted with ' + esc(MM.fmt(rc.dil)) + ' mL of ' + esc(rc.diluent) + ': each 1 mL contains ' + esc(MM.fmt(rc.conc)) + ' ' + esc(rc.unit) + '.</p>' : '') + injWorkHTML(q);
    $('#work').innerHTML = '<h2>Your answer</h2>' + inner +
      '<p id="formError" class="error" role="alert" hidden></p>' +
      '<button id="submit" class="btn primary big" type="button">' + (cur.stage === 1 ? 'Check part 1' : 'Check my answer') + '</button>';

    const calcEl = $('#calc');
    if (calcEl) calcEl.addEventListener('input', (e) => { cur.calc = e.target.value; });
    if (cur.oral) {
      $$('input[name=decision]').forEach((r) => r.addEventListener('change', () => { cur.decision = r.value; }));
    } else {
      $$('input[name=syringe]').forEach((r) => r.addEventListener('change', () => onSyringe(r.value)));
      const sl = $('#showSyrLabels'), pk = $('#syrPicker');
      if (sl && pk) sl.addEventListener('change', () => pk.classList.toggle('labels', sl.checked));
      $$('input[name=needle]').forEach((r) => r.addEventListener('change', () => { cur.needle = r.value; updateSteps(); drawSyringe(); }));
      if ($('#syrHost')) setupSyringeHost();
      updateSteps();
      drawSyringe();
    }
    $('#submit').addEventListener('click', onSubmit);
  }

  function stepHead(n, text) { return '<h3 class="step-h"><span class="num">' + n + '</span>' + text + '</h3>'; }

  /* Pictures only: no group headings, names hidden until the student asks for them. Fixed order: smallest to largest. */
  function syringePickerHTML() {
    return '<label class="show-labels"><input type="checkbox" id="showSyrLabels"> Show syringe labels</label>' +
      '<div class="syr-picker" id="syrPicker" role="radiogroup" aria-label="Syringe choices">' +
      MM.SYRINGE_ORDER.map((id) => { const s = MM.SYRINGES[id];
        return '<label class="choice syr-card"><input type="radio" name="syringe" value="' + id + '" aria-label="' + esc(s.label + ' ' + s.sub) + '"><span>' + MM.syringeSVG(id, { picture: true }) +
          '<span class="syr-name"><b>' + esc(s.label) + '</b> <small>' + esc(s.sub) + '</small></span></span></label>'; }).join('') + '</div>';
  }
  function needleListHTML() {
    return MM.NEEDLE_ORDER.filter((id) => id !== 'none').map((id) => { const n = MM.NEEDLES[id];
      return '<label class="choice"><input type="radio" name="needle" value="' + id + '"><span><b>' + esc(n.label) + '</b>' + (n.sub ? '<small>' + esc(n.sub) + '</small>' : '') + '</span></label>'; }).join('');
  }

  /* The draggable syringe (step shown once the syringe / needle choices are made). */
  function drawBlockHTML(title, hint) {
    return '<div id="drawStep" hidden>' + stepHead(0, title) +
      '<p class="muted small">Drag the plunger back (or use the buttons / arrow keys). ' + hint + '</p>' +
      '<div id="syrHost" class="syr-host" tabindex="0" role="slider" aria-label="Syringe plunger"></div>' +
      '<div class="readout">Plunger at <strong id="readout">0</strong></div>' +
      '<div class="nudge" role="group" aria-label="Fine tune plunger">' +
      '<button type="button" class="btn small" data-n="-10" aria-label="Push in 10 marks">« 10</button><button type="button" class="btn small" data-n="-1" aria-label="Push in 1 mark">‹ 1</button>' +
      '<button type="button" class="btn small" data-n="1" aria-label="Pull back 1 mark">1 ›</button><button type="button" class="btn small" data-n="10" aria-label="Pull back 10 marks">10 »</button>' +
      '<button type="button" class="btn small ghost" data-n="reset">Reset</button></div></div>';
  }

  /* Reconstitution, part 1: withdraw the diluent. */
  function reconPrepHTML(q) {
    const rc = q.product.recon;
    return '<p class="muted small">Read the reconstitution directions on the vial label. First prepare the powder vial by withdrawing the diluent.</p>' +
      stepHead(1, 'Type the volume of ' + esc(rc.diluent) + ' to withdraw') +
      '<div class="calc-row"><label for="calc">Diluent</label><input id="calc" type="text" inputmode="decimal" autocomplete="off" placeholder="0.0"><span class="unit-tag">mL</span></div>' +
      stepHead(2, 'Select a syringe') + syringePickerHTML() +
      '<div id="needleStep" hidden>' + stepHead(0, 'Select a needle') + '<div id="needleChoices" class="choices">' + needleListHTML() + '</div></div>' +
      drawBlockHTML('Draw back to the diluent volume', 'Pull the plunger back to the volume you typed in step 1.');
  }

  function injWorkHTML(q) {
    const insulin = q.category === 'insulin';
    const groups = syringePickerHTML(), needles = needleListHTML();
    /* Insulin is ordered and drawn up in units, so it has no volume-calculation step. */
    const n = insulin ? 0 : 1;
    return (insulin ? '' : stepHead(1, 'Calculate the volume to administer') +
      '<div class="calc-row"><label for="calc">Volume</label><input id="calc" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" aria-describedby="calcHint"><span class="unit-tag">mL</span></div>' +
      '<p id="calcHint" class="muted small">The order is written in ' + esc(q.order.dose.u) + '. Your answer is a <strong>volume in mL</strong>.' + (q.category === 'recon' ? ' Use the concentration of the solution <em>after</em> reconstitution.' : '') + '</p>') +
      stepHead(n + 1, 'Select a syringe') + groups +
      '<div id="needleStep" hidden>' + stepHead(0, 'Select a needle') + '<div id="needleChoices" class="choices">' + needles + '</div></div>' +
      drawBlockHTML('Draw up the dose', 'Read the ' + (insulin ? 'units' : 'volume') + ' at the edge of the black stopper nearest the needle.');
  }

  function oralWorkHTML(q) {
    const noun = q.product.kind;
    return stepHead(1, 'Calculate how many ' + noun + 's to give') +
      '<div class="calc-row"><label for="calc">Number</label><input id="calc" type="text" inputmode="decimal" autocomplete="off" placeholder="e.g. 1/2, 1, 1.5" aria-describedby="calcHint"><span class="unit-tag">' + noun + 's</span></div>' +
      '<p id="calcHint" class="muted small">Fractions such as 1/2 or 1 1/2 are fine.</p>' +
      stepHead(2, 'Can you give this dose with the product on hand?') +
      '<div class="choices stack">' +
      '<label class="choice wide"><input type="radio" name="decision" value="give"><span><b>Yes: give the dose as calculated</b></span></label>' +
      '<label class="choice wide"><input type="radio" name="decision" value="hold"><span><b>No: hold the dose and clarify</b><small>with the pharmacist / prescriber</small></span></label></div>';
  }

  /* ---- syringe interaction ---- */
  function onSyringe(id) {
    cur.syringe = id;
    cur.tick = 0;
    const s = MM.SYRINGES[id];
    if (!needsNeedle(s)) { cur.needle = null; $$('input[name=needle]').forEach((r) => { r.checked = false; }); }
    updateSteps();
    drawSyringe();
  }

  /* A separate needle is only chosen for a Luer-Lock syringe used for an IM or subcutaneous injection.
   * Insulin / TB syringes have the needle attached; an IV push uses a needleless connector. */
  function needsNeedle(s) { return !!s && !s.attached && (cur.stage === 1 || cur.q.order.route !== 'IV'); }

  /* Steps cascade: needle appears after a Luer-Lock choice (IM/SQ), the syringe appears once everything before it is done. */
  function updateSteps() {
    const s = cur.syringe && MM.SYRINGES[cur.syringe];
    const ns = $('#needleStep'), ds = $('#drawStep');
    if (!ns) return;
    ns.hidden = !needsNeedle(s);
    if (ds) ds.hidden = !s || (needsNeedle(s) && !cur.needle);
    let n = 0;
    $$('.work .step-h').forEach((h) => { if (!h.closest('[hidden]')) h.querySelector('.num').textContent = ++n; });
  }

  /* IV push on a Luer-Lock syringe shows the needleless connector */
  function currentNeedle() { return cur.needle || (cur.q.order.route === 'IV' && cur.syringe && !MM.SYRINGES[cur.syringe].attached ? 'none' : null); }

  function drawSyringe() {
    const host = $('#syrHost');
    if (!host) return;
    if (!cur.syringe) {
      host.innerHTML = '<div class="placeholder">Select a syringe to see it here.</div>';
      host.removeAttribute('aria-valuenow'); host.setAttribute('aria-disabled', 'true');
      $('#readout').textContent = '—';
      return;
    }
    const s = MM.SYRINGES[cur.syringe];
    host.innerHTML = MM.syringeSVG(cur.syringe, { needle: currentNeedle(), tick: cur.tick });
    host.setAttribute('aria-valuemin', 0); host.setAttribute('aria-valuemax', s.ticks); host.setAttribute('aria-valuenow', cur.tick);
    host.removeAttribute('aria-disabled');
    const val = MM.round(cur.tick * s.minor * s.scale, 3);
    const txt = MM.fmt(val) + ' ' + s.unit;
    host.setAttribute('aria-valuetext', txt);
    $('#readout').textContent = txt;
  }

  function setTick(t) {
    if (cur.submitted || !cur.syringe) return;
    const s = MM.SYRINGES[cur.syringe];
    t = Math.max(0, Math.min(s.ticks, t));
    if (t !== cur.tick) { cur.tick = t; drawSyringe(); }
  }

  function setupSyringeHost() {
    const host = $('#syrHost');
    let dragging = false;
    const toTick = (e) => {
      const svg = host.querySelector('svg');
      if (!svg) return null;
      const r = svg.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * MM.SYRINGE_GEOM.VBW - 14; // centre the stopper under the pointer
      return MM.xToTick(MM.SYRINGES[cur.syringe], x);
    };
    host.addEventListener('pointerdown', (e) => {
      if (!cur.syringe || cur.submitted) return;
      dragging = true; host.setPointerCapture(e.pointerId); host.focus({ preventScroll: true });
      setTick(toTick(e));
    });
    host.addEventListener('pointermove', (e) => { if (dragging) setTick(toTick(e)); });
    const end = () => { dragging = false; };
    host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
    host.addEventListener('keydown', (e) => {
      if (!cur.syringe) return;
      const s = MM.SYRINGES[cur.syringe];
      const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 }[e.key];
      if (k) { e.preventDefault(); setTick(cur.tick + k); }
      else if (e.key === 'Home') { e.preventDefault(); setTick(0); }
      else if (e.key === 'End') { e.preventDefault(); setTick(s.ticks); }
    });
    $$('.nudge button').forEach((b) => b.addEventListener('click', () => {
      const n = b.dataset.n; setTick(n === 'reset' ? 0 : cur.tick + +n);
    }));
  }

  /* ================= Submit & feedback ================= */
  function partsListHTML(parts) {
    return '<ul class="parts">' + parts.map((p) =>
      '<li class="' + (p.ok ? 'ok' : 'bad') + '"><span class="mark" aria-hidden="true">' + (p.ok ? '✓' : '✗') + '</span><div><strong>' + esc(p.label) + ':</strong> ' +
      '<span class="sr-only">' + (p.ok ? 'correct. ' : 'incorrect. ') + '</span>' + esc(p.yours) +
      (p.ok ? '' : ' <span class="muted">→ correct: <strong>' + esc(p.correct) + '</strong></span>') +
      (p.msg ? '<div class="why">' + esc(p.msg) + '</div>' : '') + '</div></li>').join('') + '</ul>';
  }

  /* Reconstitution part 1: check, show the answers, then move on to part 2. */
  function onSubmitPrep() {
    const q = cur.q, rc = q.product.recon, err = $('#formError'), missing = [];
    const dil = MM.parseNumber(cur.calc);
    if (dil == null) missing.push('type the volume of diluent as a number');
    const s = cur.syringe && MM.SYRINGES[cur.syringe];
    if (!s) missing.push('select a syringe');
    else if (needsNeedle(s) && !cur.needle) missing.push('select a needle');
    else if (cur.tick === 0) missing.push('draw the plunger back to the diluent volume');
    if (missing.length) {
      err.hidden = false; err.textContent = 'Please ' + missing.join(', ') + '.';
      if (dil == null) $('#calc').focus();
      return;
    }
    err.hidden = true;
    cur.submitted = true;
    $$('.work input, .work button').forEach((el) => { el.disabled = true; });
    $('#submit').hidden = true;
    cur.prep = MM.gradeRecon1(q, { calc: dil, syringe: cur.syringe, needle: cur.needle, tick: cur.tick });
    const best = MM.SYRINGES[q.answer.prep.best];
    $('#feedback').innerHTML = '<section class="card feedback ' + (cur.prep.correct ? 'ok' : 'bad') + '" aria-live="polite">' +
      '<h2 id="fbtitle" tabindex="-1">' + (cur.prep.correct ? '✓ Part 1 correct' : '✗ Part 1: not quite') + '</h2>' + partsListHTML(cur.prep.parts) +
      '<p class="why-box"><strong>Reconstitution:</strong> add ' + esc(MM.fmt(rc.dil)) + ' mL of ' + esc(rc.diluent) + ' to the ' + esc(MM.fmt(rc.vialAmt)) + ' ' + esc(rc.unit) +
      ' vial, using a ' + esc(best.label) + ' ' + esc(best.sub) + ' syringe with a blunt fill needle. The solution then contains ' + esc(MM.fmt(rc.conc)) + ' ' + esc(rc.unit) + ' in each mL.</p>' +
      '<button id="toPart2" class="btn primary big" type="button">Continue to part 2 →</button></section>';
    $('#toPart2').addEventListener('click', () => {
      cur.stage = 2; cur.submitted = false; cur.calc = ''; cur.syringe = null; cur.needle = null; cur.tick = 0;
      $('#feedback').innerHTML = '';
      renderWork();
      $('#work').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    const ft = $('#fbtitle'); ft.scrollIntoView({ behavior: 'smooth', block: 'start' }); ft.focus({ preventScroll: true });
  }

  function onSubmit() {
    if (cur.stage === 1) return onSubmitPrep();
    if (cur.submitted) return;
    const q = cur.q, err = $('#formError'), missing = [];
    const calc = cur.insulin ? null : MM.parseNumber(cur.calc);
    if (!cur.insulin && calc == null) missing.push('enter your calculated ' + (cur.oral ? 'number of ' + q.product.kind + 's' : 'volume') + ' as a number');
    if (cur.oral) {
      if (!cur.decision) missing.push('say whether the dose can be given');
    } else {
      const s = cur.syringe && MM.SYRINGES[cur.syringe];
      if (!s) missing.push('select a syringe');
      else {
        if (needsNeedle(s) && !cur.needle) missing.push('select a needle');
        if (cur.tick === 0) missing.push('draw the plunger back to the dose');
      }
    }
    if (missing.length) {
      err.hidden = false; err.textContent = 'Please ' + missing.join(', ') + '.';
      if (!cur.insulin && calc == null) $('#calc').focus();
      return;
    }
    err.hidden = true;
    cur.submitted = true;
    $$('.work input, .work button').forEach((el) => { el.disabled = true; });
    $('#submit').hidden = true;

    let result = MM.grade(q, { calc, syringe: cur.syringe, needle: cur.needle, tick: cur.tick, decision: cur.decision });
    if (cur.stage === 2) { const parts = cur.prep.parts.concat(result.parts); result = { parts, correct: parts.every((p) => p.ok) }; }
    session.results.push({ q, correct: result.correct, parts: result.parts });
    renderFeedback(q, result);
  }

  function renderFeedback(q, result) {
    const a = q.answer, oral = cur.oral;
    const last = session.index === session.length - 1;
    let html = '<section class="card feedback ' + (result.correct ? 'ok' : 'bad') + '" aria-live="polite">' +
      '<h2 id="fbtitle" tabindex="-1">' + (result.correct ? '✓ Correct!' : '✗ Not quite') + '</h2>' +
      partsListHTML(result.parts);

    html += '<h3>Dimensional analysis</h3>' + MM.daHTML(a.da);
    if (oral) {
      html += '<p class="answer-line">Answer: <strong>' + MM.fraction(a.qty) + ' ' + q.product.kind + (a.qty > 1 ? 's' : '') + '</strong>' + (a.feasible ? '' : ' <span class="muted">(but this dose cannot be given with this product)</span>') + '</p>' +
        '<p class="why-box">' + esc(a.reason) + '</p>';
    } else {
      const s = MM.SYRINGES[a.best];
      const reads = MM.fmt(MM.round(a.volume * s.scale, 4)) + ' ' + s.unit;
      html += q.category === 'insulin'
        ? '<p class="answer-line">Answer: draw up <strong>' + reads + '</strong> of insulin on a U-100 insulin syringe.</p>'
        : '<p class="answer-line">Answer: draw up <strong>' + MM.fmt(a.volume) + ' mL</strong>' + (s.scale === 100 ? ' = <strong>' + reads + '</strong> on a U-100 insulin syringe' : '') + '.</p>';
    }
    html += '<p class="why-box"><strong>Sense check:</strong> ' + esc(MM.senseCheck(q)) + '</p>';

    if (!oral) {
      const mine = MM.SYRINGES[cur.syringe];
      const needleId = currentNeedle();
      const bestNeedle = a.needles.length ? a.needles[0] : null;
      html += '<div class="compare"><figure><figcaption>Your syringe</figcaption>' + MM.syringeSVG(cur.syringe, { needle: needleId, tick: cur.tick }) + '</figure>' +
        '<figure><figcaption>Correct setup: ' + esc(MM.SYRINGES[a.best].label + ' ' + MM.SYRINGES[a.best].sub) + (bestNeedle ? ', ' + esc(MM.NEEDLES[bestNeedle].label) : '') + '</figcaption>' +
        MM.syringeSVG(a.best, { needle: bestNeedle, tick: a.tick }) + '</figure></div>';
    }
    html += '<button id="next" class="btn primary big" type="button">' + (last ? 'See my results' : 'Next question →') + '</button></section>';
    $('#feedback').innerHTML = html;
    $('#next').addEventListener('click', () => { if (last) showSummary(); else { session.index++; showQuestion(); } });
    const t = $('#fbtitle'); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); t.focus({ preventScroll: true });
  }

  /* ================= Summary ================= */
  function showSummary() {
    const rs = session.results, total = rs.length, right = rs.filter((r) => r.correct).length;
    const skills = {}; // key -> [ok, total]
    const names = { dilVol: 'Reconstitution: diluent volume', dilSyringe: 'Reconstitution: diluent syringe', dilNeedle: 'Reconstitution: blunt fill needle', dilDraw: 'Reconstitution: drawing up the diluent', calc: 'Calculation (dose → volume / tablets)', syringe: 'Syringe selection', needle: 'Needle selection', draw: 'Drawing up the dose', decision: 'Can the dose be given (scored / EC / ER)' };
    rs.forEach((r) => r.parts.forEach((p) => { const k = p.key; skills[k] = skills[k] || [0, 0]; skills[k][1]++; if (p.ok) skills[k][0]++; }));
    const missed = rs.filter((r) => !r.correct);
    app.innerHTML = '<section class="card summary"><h2 id="sumtitle" tabindex="-1">Practice set complete</h2>' +
      '<p class="big-score"><strong>' + right + '</strong> / ' + total + ' fully correct (' + Math.round(right / total * 100) + '%)</p>' +
      '<h3>Skill breakdown</h3><ul class="skills">' + Object.keys(names).filter((k) => skills[k]).map((k) => {
        const pct = Math.round(skills[k][0] / skills[k][1] * 100);
        return '<li><span>' + names[k] + '</span><span class="bar" aria-hidden="true"><i style="width:' + pct + '%"></i></span><span>' + skills[k][0] + '/' + skills[k][1] + '</span></li>'; }).join('') + '</ul>' +
      (missed.length ? '<h3>Review these</h3><ul class="missed">' + missed.map((r) => {
        const o = r.q.order, bad = r.parts.filter((p) => !p.ok).map((p) => p.label).join(', ');
        return '<li><strong>' + esc(o.drug) + ' ' + esc(MM.fmt(o.dose.v)) + ' ' + esc(o.dose.u) + ' ' + esc(o.route) + '</strong> <span class="muted">(missed: ' + esc(bad) + ')</span><div>' + MM.daHTML(r.q.answer.da) + '</div></li>'; }).join('') + '</ul>' : '<p>Perfect set. Nice work!</p>') +
      '<p class="muted small">Results are not saved. Take a screenshot if you want to keep them.</p>' +
      '<div class="row"><button id="again" class="btn primary big" type="button">New practice set</button></div></section>';
    $('#again').addEventListener('click', showStart);
    window.scrollTo(0, 0); $('#sumtitle').focus({ preventScroll: true });
  }

  $('#homeLink').addEventListener('click', (e) => { e.preventDefault(); showStart(); });
  showStart();
})();
