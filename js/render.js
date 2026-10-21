/* HTML/SVG rendering helpers: order card, vial, pill bottle, syringe, dimensional analysis. */
(function (g) {
  'use strict';
  const MM = (g.MM = g.MM || {});
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- Order ---------- */
  MM.orderCard = function (q) {
    const o = q.order;
    const rows = [
      ['Medication', '<strong>' + esc(o.drug) + '</strong>'],
      ['Dose', '<strong>' + esc(MM.fmt(o.dose.v)) + ' ' + esc(o.dose.u) + '</strong>'],
      ['Route', esc(o.route) + (o.routeLabel && o.routeLabel !== o.route ? ' <span class="muted">(' + esc(o.routeLabel) + ')</span>' : '')],
      ['Frequency', esc(o.freq) + (o.prn ? ' <strong class="prn">PRN</strong>' : '')]
    ];
    if (o.prn) rows.push(['Indication', esc(o.prn)]);
    else if (o.indic) rows.push(['Indication', esc(o.indic)]);
    return '<section class="card order" aria-label="Medication order"><h2>Medication order</h2>' +
      '<dl class="order-grid">' + rows.map((r) => '<dt>' + r[0] + '</dt><dd>' + r[1] + '</dd>').join('') + '</dl>' +
      '<p class="muted small">Adult patient of average build. Assume the order is complete and correct.</p></section>';
  };

  /* ---------- Vial / ampule ---------- */
  MM.vialHTML = function (q) {
    const p = q.product, c = p.conc;
    const concMain = MM.fmt(c.amt) + ' ' + c.unit + (c.vol === 1 ? '/mL' : '/' + MM.fmt(c.vol) + ' mL');
    const concSub = c.vol !== 1 ? '(' + MM.fmt(c.amt / c.vol) + ' ' + c.unit + '/mL)' : '';
    const isAmp = /ampule/.test(p.pack);
    const route = p.insulin ? 'For subcutaneous use' : 'For ' + (p.route === 'SQ' ? 'subcutaneous' : p.route) + ' use';
    const name = p.insulin ? esc(q.order.drug) + ' injection' : esc(q.order.drug) + ' injection, USP';
    return '<div class="vial-wrap" role="img" aria-label="' + esc(q.order.drug) + ' ' + esc(concMain) + ' ' + esc(p.pack) + '">' +
      '<div class="vial' + (isAmp ? ' ampule' : '') + '">' +
      '<div class="vial-cap" style="background:' + p.cap + '"></div><div class="vial-neck"></div>' +
      '<div class="vial-body"><div class="vial-label">' +
      (p.sched ? '<span class="sched">' + esc(p.sched) + '</span>' : '') +
      '<div class="vl-drug">' + name + '</div>' +
      '<div class="vl-conc">' + esc(concMain) + '</div>' +
      (concSub ? '<div class="vl-sub">' + esc(concSub) + '</div>' : '') +
      (p.insulin ? '<div class="vl-u100">U-100</div>' : '') +
      '<div class="vl-small">' + esc(MM.fmt(p.total)) + ' mL ' + esc(p.pack) + '</div>' +
      '<div class="vl-small">' + route + '</div>' +
      '<div class="vl-tiny">Practice label · not for patient use</div>' +
      '</div></div></div></div>';
  };

  /* ---------- Pills ---------- */
  function pillSVG(p) {
    const stroke = '#6b7280', fill = p.color || '#fff';
    let body = '';
    if (p.shape === 'capsule') {
      body = '<g transform="rotate(-25 60 40)"><rect x="12" y="24" width="96" height="32" rx="16" fill="' + (p.color2 || '#eee') + '" stroke="' + stroke + '" stroke-width="2"/>' +
        '<path d="M60 24 H28 A16 16 0 0 0 28 56 H60 Z" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>' +
        '<path d="M70 30 H100" stroke="#fff" stroke-opacity=".6" stroke-width="3" stroke-linecap="round"/></g>';
    } else if (p.shape === 'oval') {
      body = '<ellipse cx="60" cy="40" rx="46" ry="22" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>';
      if (p.scored) body += '<line x1="60" y1="20" x2="60" y2="60" stroke="' + stroke + '" stroke-width="2"/>';
    } else {
      body = '<circle cx="60" cy="40" r="30" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>';
      if (p.scored) body += '<line x1="30" y1="40" x2="90" y2="40" stroke="' + stroke + '" stroke-width="3"/>';
    }
    if (p.coat === 'EC' || p.coat === 'ER') body += (p.shape === 'capsule' ? '' : '<path d="M42 24 Q58 16 76 22" stroke="#fff" stroke-opacity=".75" stroke-width="4" fill="none" stroke-linecap="round"/>');
    return '<svg class="pill-svg" viewBox="0 0 120 80" aria-hidden="true">' + body + '</svg>';
  }
  function pillDescription(p) {
    const shape = p.shape === 'capsule' ? 'capsule' : (p.shape === 'oval' ? 'oval tablet' : 'round tablet');
    const bits = [shape];
    if (p.scored) bits.push('with a score line');
    if (p.coat === 'EC') bits.push('enteric-coated');
    if (p.coat === 'ER') bits.push('extended-release');
    return bits.join(', ');
  }
  MM.bottleHTML = function (q) {
    const p = q.product, st = p.strength;
    const strength = st.label || (MM.fmt(st.amt) + ' ' + st.unit);
    return '<div class="bottle-wrap"><div class="bottle" role="img" aria-label="' + esc(p.name) + ' ' + esc(strength) + '">' +
      '<div class="bottle-cap"></div><div class="bottle-body"><div class="bottle-label">' +
      (p.sched ? '<span class="sched">' + esc(p.sched) + '</span>' : '') +
      '<div class="vl-drug">' + esc(p.name.toUpperCase()) + '</div>' +
      '<div class="vl-conc">' + esc(strength) + '</div>' +
      '<div class="vl-small">Each ' + esc(p.kind) + ' contains ' + esc(MM.fmt(st.amt)) + ' ' + esc(st.unit) + '</div>' +
      '<div class="vl-small">' + p.count + ' ' + esc(p.kind) + 's · Take as directed</div>' +
      '<div class="vl-tiny">Practice label · not for patient use</div></div></div></div>' +
      '<figure class="pill">' + pillSVG(p) + '<figcaption>' + esc(pillDescription(p)) + '</figcaption></figure></div>';
  };
  MM.productCard = function (q) {
    const oral = q.category === 'po' || q.category === 'poTrap';
    return '<section class="card product" aria-label="Medication on hand"><h2>' + (oral ? 'Medication on hand' : 'Vial on hand') + '</h2>' +
      (oral ? MM.bottleHTML(q) : MM.vialHTML(q)) + '</section>';
  };

  /* ---------- Syringe icon for the picker ---------- */
  MM.syringeIcon = function (s) {
    const barrelW = 30 + (s.ticks >= 100 ? 40 : s.ticks / 100 * 40) + (s.group === 'luer' ? 10 : 0);
    const h = Math.round(s.h / 3.2) + 6;
    const x0 = 22, cy = 16;
    return '<svg viewBox="0 0 ' + (x0 + barrelW + 34) + ' 32" class="syr-icon" aria-hidden="true">' +
      '<line x1="1" y1="' + cy + '" x2="' + (x0 - 4) + '" y2="' + cy + '" stroke="#6b7280" stroke-width="1.4"/>' +
      '<rect x="' + x0 + '" y="' + (cy - h / 2) + '" width="' + barrelW + '" height="' + h + '" rx="2" fill="#e8f3f6" stroke="#4b5563" stroke-width="1.4"/>' +
      (s.group === 'insulin' ? '<rect x="' + (x0 + barrelW) + '" y="' + (cy - 2) + '" width="22" height="4" fill="#f28c28"/>' : '<rect x="' + (x0 + barrelW) + '" y="' + (cy - 2) + '" width="22" height="4" fill="#9ca3af"/>') +
      '<rect x="' + (x0 + barrelW + 22) + '" y="' + (cy - 7) + '" width="3" height="14" fill="#4b5563"/></svg>';
  };

  /* ---------- Syringe drawing ---------- */
  const VBW = 760, VBH = 176, X0 = 170, W = 440, CY = 84;
  MM.SYRINGE_GEOM = { VBW, VBH, X0, W };

  MM.tickToX = (s, tick) => X0 + (tick / s.ticks) * W;
  MM.xToTick = (s, x) => Math.max(0, Math.min(s.ticks, Math.round(((x - X0) / W) * s.ticks)));

  function labelText(s, i) {
    const v = i * s.minor * s.scale;
    return String(Math.round(v * 100) / 100);
  }

  /* opts: {needle: needleId|null, tick, readOnly, fluid} */
  MM.syringeSVG = function (syrId, opts) {
    const s = MM.SYRINGES[syrId];
    opts = opts || {};
    const tick = opts.tick || 0, h = s.h, top = CY - h / 2, bot = CY + h / 2;
    const sx = MM.tickToX(s, tick);
    let out = '<svg class="syringe" viewBox="0 0 ' + VBW + ' ' + VBH + '" role="img" aria-label="' + esc(s.label + ' ' + s.sub + ' syringe, plunger at ' + labelText(s, tick) + ' ' + s.unit) + '">';

    /* needle / hub / collar */
    const needle = s.attached ? { len: s.needle.len, gauge: s.needle.gauge, hub: s.group === 'insulin' ? '#f5b041' : '#f28c28', fixed: true }
      : (opts.needle && opts.needle !== 'none' ? MM.NEEDLES[opts.needle] : null);
    const PX_IN = 38;
    let tipX = X0;
    if (s.group === 'luer') {
      const collarL = X0 - 38;
      out += '<rect x="' + collarL + '" y="' + (CY - h * 0.34) + '" width="38" height="' + (h * 0.68) + '" rx="3" class="syr-collar"/>';
      for (let k = 1; k < 5; k++) out += '<line x1="' + (collarL + k * 7) + '" y1="' + (CY - h * 0.34 + 3) + '" x2="' + (collarL + k * 7) + '" y2="' + (CY + h * 0.34 - 3) + '" class="syr-thread"/>';
      tipX = collarL;
      if (opts.needle === 'none') {
        out += '<rect x="' + (collarL - 34) + '" y="' + (CY - 11) + '" width="34" height="22" rx="4" fill="#e5e7eb" stroke="#6b7280" stroke-width="1.5"/>' +
          '<rect x="' + (collarL - 40) + '" y="' + (CY - 7) + '" width="8" height="14" rx="2" fill="#cbd5e1" stroke="#6b7280" stroke-width="1.5"/>';
      } else if (needle) {
        out += '<path d="M' + collarL + ' ' + (CY - 9) + ' L' + (collarL - 22) + ' ' + (CY - 6) + ' L' + (collarL - 22) + ' ' + (CY + 6) + ' L' + collarL + ' ' + (CY + 9) + ' Z" fill="' + needle.hub + '" stroke="#4b5563" stroke-width="1.3"/>';
        tipX = collarL - 22;
      } else {
        out += '<rect x="' + (collarL - 8) + '" y="' + (CY - 4) + '" width="8" height="8" class="syr-collar"/>';
      }
    } else {
      out += '<path d="M' + X0 + ' ' + (CY - 6) + ' L' + (X0 - 14) + ' ' + (CY - 4) + ' L' + (X0 - 14) + ' ' + (CY + 4) + ' L' + X0 + ' ' + (CY + 6) + ' Z" fill="' + needle.hub + '" stroke="#4b5563" stroke-width="1.2"/>';
      tipX = X0 - 14;
    }
    if (needle && needle.len) {
      const len = needle.len * PX_IN, gw = needle.gauge >= 30 ? 1.6 : needle.gauge >= 25 ? 2.6 : needle.gauge >= 21 ? 4 : 5.5;
      out += '<polygon points="' + tipX + ',' + (CY - gw / 2) + ' ' + (tipX - len + 6) + ',' + (CY - gw / 2) + ' ' + (tipX - len) + ',' + (CY + gw / 2) + ' ' + tipX + ',' + (CY + gw / 2) + '" class="syr-needle"/>';
    }

    /* fluid, plunger, barrel */
    const flangeX = X0 + W, padX = flangeX + 6 + Math.min(sx - X0, 100);
    const padH = Math.max(h + 34, 62);
    if (tick > 0) out += '<rect x="' + X0 + '" y="' + top + '" width="' + (sx - X0) + '" height="' + h + '" class="syr-fluid"/>';
    out += '<rect x="' + (sx + 26) + '" y="' + (CY - h * 0.22) + '" width="' + (padX - sx - 26) + '" height="' + (h * 0.44) + '" class="syr-rod"/>';
    out += '<rect x="' + sx + '" y="' + (top + 1.5) + '" width="9" height="' + (h - 3) + '" rx="1.5" class="syr-stopper"/>' +
      '<rect x="' + (sx + 9) + '" y="' + (top + 5) + '" width="19" height="' + (h - 10) + '" rx="1.5" class="syr-stopper"/>';
    out += '<rect x="' + X0 + '" y="' + top + '" width="' + W + '" height="' + h + '" rx="3" class="syr-barrel"/>';
    out += '<rect x="' + flangeX + '" y="' + (CY - h / 2 - 12) + '" width="9" height="' + (h + 24) + '" rx="2" class="syr-flange"/>';
    out += '<rect x="' + padX + '" y="' + (CY - padH / 2) + '" width="14" height="' + padH + '" rx="4" class="syr-pad"/>';

    /* graduations */
    for (let i = 0; i <= s.ticks; i++) {
      const x = X0 + (i / s.ticks) * W;
      const major = i % s.labelStep === 0, mid = i % s.midStep === 0;
      const len = major ? h * 0.52 : mid ? h * 0.38 : h * 0.24;
      out += '<line x1="' + x.toFixed(2) + '" y1="' + bot + '" x2="' + x.toFixed(2) + '" y2="' + (bot - len) + '" class="syr-tick' + (major ? ' major' : '') + '"/>';
      if (major) out += '<text x="' + x.toFixed(2) + '" y="' + (bot + 24) + '" class="syr-num" text-anchor="middle">' + labelText(s, i) + '</text>';
    }
    out += '<text x="' + (X0 + 4) + '" y="' + (top - 8) + '" class="syr-unit">' + (s.unit === 'mL' ? 'mL' : 'UNITS') + '</text>';

    /* reading line at the stopper's leading edge */
    out += '<line x1="' + sx + '" y1="' + (top - 6) + '" x2="' + sx + '" y2="' + (bot + 4) + '" class="syr-read"/>';
    out += '</svg>';
    return out;
  };

  /* ---------- Dimensional analysis ---------- */
  MM.daHTML = function (da) {
    const cancelled = MM.cancelUnits(da);
    const u = (unit, key) => '<span class="u' + (cancelled[key] ? ' cancel' : '') + '">' + esc(MM.unitNoun(unit)) + '</span>';
    const term = (t, key) => '<span class="t">' + esc(MM.fmt(t.v)) + ' ' + u(t.u, key) + '</span>';
    let html = '<div class="da" role="math">' +
      '<span class="da-start">' + term(da.start, 's') + '</span>';
    da.factors.forEach((f, i) => {
      html += '<span class="da-times">×</span><span class="da-frac"><span class="top">' + term(f.num, 'n' + i) + '</span><span class="bot">' + term(f.den, 'd' + i) + '</span></span>';
    });
    html += '<span class="da-eq">=</span><span class="da-result">' + esc(MM.fmt(da.result.v)) + ' ' + esc(MM.unitNoun(da.result.u)) + '</span></div>';
    return html;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
