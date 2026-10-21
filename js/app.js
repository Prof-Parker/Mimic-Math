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
      '<tr><td>Intramuscular</td><td>Smallest Luer-Lock syringe that holds the volume</td><td>21 G × 1" or 1½"; 25 G × 1" for small adults</td></tr>' +
      '<tr><td>IV push</td><td>Smallest Luer-Lock syringe that holds the volume</td><td>None: needleless connector</td></tr>' +
      '<tr><td>Choosing a size</td><td>1 mL ≤ 1 mL · 3 mL ≤ 3 mL · 5 mL ≤ 5 mL · 10 mL ≤ 10 mL</td><td></td></tr>' +
      '</tbody></table><p class="muted small">Practice tool for learning only. Always follow your facility policy and current drug references.</p></details>';
  }

  /* ================= Question screen ================= */
  function showQuestion() {
    const q = session.deck[session.index];
    const oral = q.category === 'po' || q.category === 'poTrap';
    cur = { q, oral, insulin: q.category === 'insulin', calc: '', syringe: null, needle: null, tick: 0, decision: null, submitted: false };

    const score = session.results.filter((r) => r.correct).length;
    app.innerHTML =
      '<div class="qhead"><h2 id="qtitle" tabindex="-1">Question ' + (session.index + 1) + ' of ' + session.length + '</h2>' +
      '<div class="progress" aria-hidden="true"><span style="width:' + (session.index / session.length * 100) + '%"></span></div>' +
      '<div class="muted small">Correct so far: ' + score + ' / ' + session.results.length + '</div></div>' +
      '<div class="layout"><div class="col">' + MM.orderCard(q) + MM.productCard(q) + '</div>' +
      '<div class="col"><section class="card work" aria-label="Your answer"><h2>Your answer</h2>' + (oral ? oralWorkHTML(q) : injWorkHTML(q)) +
      '<p id="formError" class="error" role="alert" hidden></p>' +
      '<button id="submit" class="btn primary big" type="button">Check my answer</button></section>' +
      '<div id="feedback"></div></div></div>';

    const calcEl = $('#calc');
    if (calcEl) calcEl.addEventListener('input', (e) => { cur.calc = e.target.value; });
    if (oral) {
      $$('input[name=decision]').forEach((r) => r.addEventListener('change', () => { cur.decision = r.value; }));
    } else {
      $$('input[name=syringe]').forEach((r) => r.addEventListener('change', () => onSyringe(r.value)));
      const sl = $('#showSyrLabels'), pk = $('#syrPicker');
      if (sl && pk) sl.addEventListener('change', () => pk.classList.toggle('labels', sl.checked));
      $$('input[name=needle]').forEach((r) => r.addEventListener('change', () => { cur.needle = r.value; updateSteps(); drawSyringe(); }));
      setupSyringeHost();
      updateSteps();
      drawSyringe();
    }
    $('#submit').addEventListener('click', onSubmit);
    window.scrollTo(0, 0);
    $('#qtitle').focus({ preventScroll: true });
  }

  function stepHead(n, text) { return '<h3 class="step-h"><span class="num">' + n + '</span>' + text + '</h3>'; }

  function injWorkHTML(q) {
    const insulin = q.category === 'insulin';
    /* Pictures only: no group headings, names hidden until the student asks for them. Fixed order: smallest to largest. */
    const order = MM.SYRINGE_ORDER;
    const groups = '<label class="show-labels"><input type="checkbox" id="showSyrLabels"> Show syringe labels</label>' +
      '<div class="syr-picker" id="syrPicker" role="radiogroup" aria-label="Syringe choices">' +
      order.map((id) => { const s = MM.SYRINGES[id];
        return '<label class="choice syr-card"><input type="radio" name="syringe" value="' + id + '" aria-label="' + esc(s.label + ' ' + s.sub) + '"><span>' + MM.syringeSVG(id, { picture: true }) +
          '<span class="syr-name"><b>' + esc(s.label) + '</b> <small>' + esc(s.sub) + '</small></span></span></label>'; }).join('') + '</div>';
    const needles = MM.NEEDLE_ORDER.filter((id) => id !== 'none').map((id) => { const n = MM.NEEDLES[id];
      return '<label class="choice"><input type="radio" name="needle" value="' + id + '"><span><b>' + esc(n.label) + '</b>' + (n.sub ? '<small>' + esc(n.sub) + '</small>' : '') + '</span></label>'; }).join('');
    /* Insulin is ordered and drawn up in units, so it has no volume-calculation step. */
    const n = insulin ? 0 : 1;
    return (insulin ? '' : stepHead(1, 'Calculate the volume to administer') +
      '<div class="calc-row"><label for="calc">Volume</label><input id="calc" type="text" inputmode="decimal" autocomplete="off" placeholder="0.00" aria-describedby="calcHint"><span class="unit-tag">mL</span></div>' +
      '<p id="calcHint" class="muted small">The order is written in ' + esc(q.order.dose.u) + '. Your answer is a <strong>volume in mL</strong>.</p>') +
      stepHead(n + 1, 'Select a syringe') + groups +
      '<div id="needleStep" hidden>' + stepHead(0, 'Select a needle') + '<div id="needleChoices" class="choices">' + needles + '</div></div>' +
      '<div id="drawStep" hidden>' + stepHead(0, 'Draw up the dose') +
      '<p class="muted small">Drag the plunger back (or use the buttons / arrow keys). Read the ' + (insulin ? 'units' : 'volume') + ' at the edge of the black stopper nearest the needle.</p>' +
      '<div id="syrHost" class="syr-host" tabindex="0" role="slider" aria-label="Syringe plunger"></div>' +
      '<div class="readout">Plunger at <strong id="readout">0</strong></div>' +
      '<div class="nudge" role="group" aria-label="Fine tune plunger">' +
      '<button type="button" class="btn small" data-n="-10" aria-label="Push in 10 marks">« 10</button><button type="button" class="btn small" data-n="-1" aria-label="Push in 1 mark">‹ 1</button>' +
      '<button type="button" class="btn small" data-n="1" aria-label="Pull back 1 mark">1 ›</button><button type="button" class="btn small" data-n="10" aria-label="Pull back 10 marks">10 »</button>' +
      '<button type="button" class="btn small ghost" data-n="reset">Reset</button></div></div>';
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
  function needsNeedle(s) { return !!s && !s.attached && cur.q.order.route !== 'IV'; }

  /* Steps cascade: needle appears after a Luer-Lock choice (IM/SQ), the syringe appears once everything before it is done. */
  function updateSteps() {
    const s = cur.syringe && MM.SYRINGES[cur.syringe];
    const ns = $('#needleStep'), ds = $('#drawStep');
    if (!ns || !ds) return;
    ns.hidden = !needsNeedle(s);
    ds.hidden = !s || (needsNeedle(s) && !cur.needle);
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
  function onSubmit() {
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

    const result = MM.grade(q, { calc, syringe: cur.syringe, needle: cur.needle, tick: cur.tick, decision: cur.decision });
    session.results.push({ q, correct: result.correct, parts: result.parts });
    renderFeedback(q, result);
  }

  function renderFeedback(q, result) {
    const a = q.answer, oral = cur.oral;
    const last = session.index === session.length - 1;
    let html = '<section class="card feedback ' + (result.correct ? 'ok' : 'bad') + '" aria-live="polite">' +
      '<h2 id="fbtitle" tabindex="-1">' + (result.correct ? '✓ Correct!' : '✗ Not quite') + '</h2>' +
      '<ul class="parts">' + result.parts.map((p) =>
        '<li class="' + (p.ok ? 'ok' : 'bad') + '"><span class="mark" aria-hidden="true">' + (p.ok ? '✓' : '✗') + '</span><div><strong>' + esc(p.label) + ':</strong> ' +
        '<span class="sr-only">' + (p.ok ? 'correct. ' : 'incorrect. ') + '</span>' + esc(p.yours) +
        (p.ok ? '' : ' <span class="muted">→ correct: <strong>' + esc(p.correct) + '</strong></span>') +
        (p.msg ? '<div class="why">' + esc(p.msg) + '</div>' : '') + '</div></li>').join('') + '</ul>';

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
    const names = { calc: 'Calculation (dose → volume / tablets)', syringe: 'Syringe selection', needle: 'Needle selection', draw: 'Drawing up the dose', decision: 'Can the dose be given (scored / EC / ER)' };
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
