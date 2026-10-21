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
    /* white text on dark band colours, dark text on light ones */
    const hex = String(p.cap || '#2e7d32').replace('#', '');
    const lum = (parseInt(hex.slice(0, 2), 16) * 299 + parseInt(hex.slice(2, 4), 16) * 587 + parseInt(hex.slice(4, 6), 16) * 114) / 1000;
    const bandInk = lum > 150 ? '#14272d' : '#fff';
    const pack = String(p.pack).replace(/^./, (c) => c.toUpperCase());
    return '<div class="vial-wrap" role="img" aria-label="' + esc(q.order.drug) + ' ' + esc(concMain) + ' ' + esc(p.pack) + '">' +
      '<div class="vial' + (isAmp ? ' ampule' : '') + '">' +
      '<div class="vial-flip" style="background:' + p.cap + '"></div><div class="vial-seal"></div><div class="vial-neck"></div>' +
      '<div class="vial-body"><div class="vial-label">' +
      '<div class="vl-top"><span>' + esc(pack) + '</span>' + (p.sched ? '<span class="sched">' + esc(p.sched) + '</span>' : '') + '</div>' +
      '<div class="vl-band" style="background:' + p.cap + ';color:' + bandInk + '">' + name + '</div>' +
      '<div class="vl-strength">' + esc(concMain) + '</div>' +
      (concSub ? '<div class="vl-sub">' + esc(concSub) + '</div>' : '') +
      (p.insulin ? '<div class="vl-u100">U-100</div>' : '') +
      '<div class="vl-small vl-route">' + route + '</div>' +
      '<div class="vl-small">' + esc(MM.fmt(p.total)) + ' mL ' + esc(p.pack) + '</div>' +
      '<div class="vl-foot"><span class="rx">℞ only</span><span class="vl-tiny">Practice label · not for patient use</span></div>' +
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
    const luer = s.group === 'luer', ins = s.group === 'insulin';
    const barrelW = 30 + (s.ticks >= 100 ? 40 : s.ticks / 100 * 40) + (luer ? 10 : 0);
    const h = Math.min(22, Math.round(s.h / 3.2) + 4), cy = 16;
    const nl = 14, hubW = luer ? 12 : 6, x0 = nl + hubW, bx = x0 + barrelW;
    const top = cy - h / 2, fh = h + (ins ? 6 : 9);
    let o = '<svg viewBox="0 0 ' + (bx + 34) + ' 32" class="syr-icon" aria-hidden="true">';
    /* needle (tip at the left), hub, optional luer collar */
    o += '<polygon points="1,' + (cy + 0.5) + ' 5,' + (cy - 0.6) + ' ' + nl + ',' + (cy - 0.6) + ' ' + nl + ',' + (cy + 0.6) + ' 5,' + (cy + 0.6) + '" fill="#9aa8ae" stroke="#6b7280" stroke-width=".5"/>';
    if (luer) {
      o += '<rect x="' + (nl - 3) + '" y="' + (cy - 3.5) + '" width="6" height="7" rx="1" fill="#f28c28" stroke="#4b5563" stroke-width=".9"/>' +
        '<rect x="' + (nl + 3) + '" y="' + (cy - h * 0.34) + '" width="' + (hubW - 3) + '" height="' + (h * 0.68) + '" rx="1.5" fill="#f4f8fa" stroke="#6b7a80" stroke-width="1"/>' +
        '<path d="M' + (nl + 5.5) + ' ' + (cy - h * 0.34 + 1) + ' l1.5 ' + (h * 0.68 - 2) + ' M' + (nl + 8) + ' ' + (cy - h * 0.34 + 1) + ' l1.5 ' + (h * 0.68 - 2) + '" stroke="#9aa8ae" stroke-width=".8"/>';
    } else {
      o += '<rect x="' + (nl - 1) + '" y="' + (cy - 2.6) + '" width="' + (hubW + 1) + '" height="5.2" rx="1" fill="' + (ins ? '#f5b041' : '#f28c28') + '" stroke="#4b5563" stroke-width=".9"/>';
    }
    /* plunger rod and thumb pad behind the barrel */
    o += '<rect x="' + (x0 + 14) + '" y="' + (cy - 1.4) + '" width="' + (barrelW + 8) + '" height="2.8" fill="#dbe4e8" stroke="#7b8a91" stroke-width=".7"/>' +
      '<rect x="' + (bx + 14) + '" y="' + (cy - h / 2 - 3) + '" width="3" height="' + (h + 6) + '" rx="1.2" fill="#fff" stroke="#6b7a80" stroke-width="1"/>';
    /* barrel with a black stopper near the tip and a highlight */
    o += '<rect x="' + x0 + '" y="' + top + '" width="' + barrelW + '" height="' + h + '" rx="1.5" fill="#e3f0f4" stroke="#4b5563" stroke-width="1.2"/>' +
      '<rect x="' + (x0 + 11) + '" y="' + (top + 0.8) + '" width="2.5" height="' + (h - 1.6) + '" fill="#1c1f22"/>' +
      '<rect x="' + (x0 + 14) + '" y="' + (top + 2) + '" width="4" height="' + (h - 4) + '" fill="#1c1f22"/>' +
      '<line x1="' + (x0 + 3) + '" y1="' + (top + 2) + '" x2="' + (bx - 3) + '" y2="' + (top + 2) + '" stroke="#fff" stroke-width="1" stroke-linecap="round"/>';
    /* graduations along the bottom edge, longer every tenth */
    const n = Math.min(s.ticks, 20);
    for (let i = 1; i < n; i++) {
      const gx = x0 + 20 + (i / n) * (barrelW - 24), l = i % 5 === 0 ? 5 : 2.6;
      o += '<line x1="' + gx.toFixed(1) + '" y1="' + (top + h) + '" x2="' + gx.toFixed(1) + '" y2="' + (top + h - l) + '" stroke="#26373d" stroke-width=".7"/>';
    }
    /* finger flange at the open end */
    o += '<rect x="' + (bx - 1) + '" y="' + (cy - fh / 2) + '" width="3.5" height="' + fh + '" rx="1.2" fill="#fff" stroke="#6b7a80" stroke-width="1"/>';
    return o + '</svg>';
  };

  /* ---------- Syringe drawing ---------- */
  const VBW = 800, VBH = 176, X0 = 170, W = 440, CY = 84;
  const TAIL = 36; /* empty barrel past the last graduation, as on a real syringe */
  MM.SYRINGE_GEOM = { VBW, VBH, X0, W };

  MM.tickToX = (s, tick) => X0 + (tick / s.ticks) * W;
  MM.xToTick = (s, x) => Math.max(0, Math.min(s.ticks, Math.round(((x - X0) / W) * s.ticks)));

  function labelText(s, i) {
    const v = i * s.minor * s.scale;
    return String(Math.round(v * 100) / 100);
  }

  let gradSeq = 0;
  const f1 = (n) => Math.round(n * 10) / 10;

  /* opts: {needle: needleId|null, tick, readOnly, fluid} */
  MM.syringeSVG = function (syrId, opts) {
    const s = MM.SYRINGES[syrId];
    opts = opts || {};
    const tick = opts.tick || 0, h = s.h, top = CY - h / 2, bot = CY + h / 2;
    const sx = MM.tickToX(s, tick);
    const uid = 'sg' + (++gradSeq);
    const luer = s.group === 'luer', insulin = s.group === 'insulin';
    const viewBox = opts.picture ? '110 26 580 126' : '0 0 ' + VBW + ' ' + VBH;
    let out = '<svg class="syringe' + (opts.picture ? ' syr-picture' : '') + '" viewBox="' + viewBox + '"' + (opts.picture ? ' aria-hidden="true"' : ' role="img" aria-label="' + esc(s.label + ' ' + s.sub + ' syringe, plunger at ' + labelText(s, tick) + ' ' + s.unit) + '"') + '>' +
      '<defs>' +
      '<linearGradient id="' + uid + 'b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".85"/><stop offset=".18" stop-color="#fff" stop-opacity=".12"/><stop offset=".8" stop-color="#9fb8c2" stop-opacity=".14"/><stop offset="1" stop-color="#6d8792" stop-opacity=".4"/></linearGradient>' +
      '<linearGradient id="' + uid + 's" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5056"/><stop offset=".3" stop-color="#1c1f22"/><stop offset="1" stop-color="#0b0c0d"/></linearGradient>' +
      '<linearGradient id="' + uid + 'p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#cfdbe0"/></linearGradient>' +
      '<linearGradient id="' + uid + 'n" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4f7f8"/><stop offset=".5" stop-color="#aab5bb"/><stop offset="1" stop-color="#6f7c84"/></linearGradient>' +
      '</defs>';

    /* needle / hub / collar */
    const needle = s.attached ? { len: s.needle.len, gauge: s.needle.gauge, hub: insulin ? '#f5b041' : '#f28c28', fixed: true }
      : (opts.needle && opts.needle !== 'none' ? MM.NEEDLES[opts.needle] : null);
    const PX_IN = 38;
    let tipX = X0;
    const shoulder = luer ? 10 : 14; /* the barrel tapers into the tip over this many px */
    if (luer) {
      const collarL = X0 - 38, ch = h * 0.64;
      /* central nozzle inside the threaded collar */
      out += '<rect x="' + (collarL - 6) + '" y="' + (CY - 5) + '" width="' + (38 - shoulder + 6) + '" height="10" rx="2" fill="url(#' + uid + 'n)" stroke="#6b7a80" stroke-width="1.2"/>';
      /* threaded collar */
      out += '<rect x="' + collarL + '" y="' + f1(CY - ch / 2) + '" width="' + (38 - shoulder + 4) + '" height="' + f1(ch) + '" rx="3" fill="url(#' + uid + 'b)" class="syr-collar"/>';
      for (let k = 1; k < 5; k++) out += '<path d="M' + (collarL + k * 5.5) + ' ' + f1(CY - ch / 2 + 2) + ' l3 ' + f1(ch - 4) + '" class="syr-thread"/>';
      tipX = collarL - 6;
      if (opts.needle === 'none') {
        out += '<rect x="' + (collarL - 34) + '" y="' + (CY - 11) + '" width="34" height="22" rx="4" fill="#e5e7eb" stroke="#6b7280" stroke-width="1.5"/>' +
          '<rect x="' + (collarL - 40) + '" y="' + (CY - 7) + '" width="8" height="14" rx="2" fill="#cbd5e1" stroke="#6b7280" stroke-width="1.5"/>';
      } else if (needle) {
        /* hub: coloured cone with grip wings */
        out += '<path d="M' + (collarL + 2) + ' ' + (CY - 9) + ' L' + (collarL - 22) + ' ' + (CY - 5) + ' L' + (collarL - 22) + ' ' + (CY + 5) + ' L' + (collarL + 2) + ' ' + (CY + 9) + ' Z" fill="' + needle.hub + '" stroke="#4b5563" stroke-width="1.3"/>' +
          '<rect x="' + (collarL - 22) + '" y="' + (CY - 7) + '" width="5" height="14" rx="1.5" fill="' + needle.hub + '" stroke="#4b5563" stroke-width="1"/>' +
          '<path d="M' + (collarL - 2) + ' ' + (CY - 7) + ' L' + (collarL - 18) + ' ' + (CY - 4) + '" stroke="#fff" stroke-opacity=".5" stroke-width="1.6" fill="none"/>';
        tipX = collarL - 22;
      }
    } else {
      /* fixed needle: small hub moulded onto the tapered barrel tip */
      out += '<path d="M' + (X0 - 2) + ' ' + (CY - 6) + ' L' + (X0 - 16) + ' ' + (CY - 3.5) + ' L' + (X0 - 16) + ' ' + (CY + 3.5) + ' L' + (X0 - 2) + ' ' + (CY + 6) + ' Z" fill="' + needle.hub + '" stroke="#4b5563" stroke-width="1.2"/>' +
        '<path d="M' + (X0 - 4) + ' ' + (CY - 4.5) + ' L' + (X0 - 14) + ' ' + (CY - 2.5) + '" stroke="#fff" stroke-opacity=".55" stroke-width="1.2" fill="none"/>';
      tipX = X0 - 16;
    }
    if (needle && needle.len) {
      const len = needle.len * PX_IN, gw = needle.gauge >= 30 ? 1.6 : needle.gauge >= 25 ? 2.6 : needle.gauge >= 21 ? 4 : 5.5;
      /* lancet-bevelled tip: the lower edge runs further than the upper edge */
      const bev = Math.max(5, gw * 3);
      out += '<polygon points="' + tipX + ',' + f1(CY - gw / 2) + ' ' + f1(tipX - len + bev) + ',' + f1(CY - gw / 2) + ' ' + f1(tipX - len) + ',' + f1(CY + gw / 2) + ' ' + tipX + ',' + f1(CY + gw / 2) + '" fill="url(#' + uid + 'n)" class="syr-needle"/>';
    }

    /* barrel outline: straight body that tapers into the tip */
    const tipH = luer ? 9 : 5.5;
    const barrelPath = 'M' + X0 + ' ' + top + ' L' + (X0 + W + TAIL) + ' ' + top + ' L' + (X0 + W + TAIL) + ' ' + bot + ' L' + X0 + ' ' + bot +
      ' L' + (X0 - shoulder) + ' ' + (CY + tipH) + ' L' + (X0 - shoulder) + ' ' + (CY - tipH) + ' Z';

    /* fluid, plunger */
    const flangeX = X0 + W + TAIL, padX = flangeX + 12 + Math.min(sx - X0, 100);
    const padH = Math.max(h + 34, 62);
    if (tick > 0) out += '<path d="M' + X0 + ' ' + top + ' L' + sx + ' ' + top + ' L' + sx + ' ' + bot + ' L' + X0 + ' ' + bot + ' L' + (X0 - shoulder) + ' ' + (CY + tipH) + ' L' + (X0 - shoulder) + ' ' + (CY - tipH) + ' Z" class="syr-fluid"/>';
    /* rod: a cross-shaped section, so a thin bright web with fainter wings */
    out += '<rect x="' + (sx + 26) + '" y="' + f1(CY - h * 0.34) + '" width="' + (padX - sx - 26) + '" height="' + f1(h * 0.68) + '" rx="1" class="syr-rod-wing"/>' +
      '<rect x="' + (sx + 26) + '" y="' + f1(CY - h * 0.07) + '" width="' + (padX - sx - 26) + '" height="' + f1(h * 0.14) + '" class="syr-rod"/>';
    /* rubber stopper: two sealing rings with a narrower waist between them */
    out += '<rect x="' + (sx + 8) + '" y="' + (top + 5) + '" width="14" height="' + (h - 10) + '" rx="1" fill="url(#' + uid + 's)"/>' +
      '<rect x="' + sx + '" y="' + (top + 1.2) + '" width="8" height="' + (h - 2.4) + '" rx="2" fill="url(#' + uid + 's)"/>' +
      '<rect x="' + (sx + 20) + '" y="' + (top + 1.2) + '" width="8" height="' + (h - 2.4) + '" rx="2" fill="url(#' + uid + 's)"/>' +
      '<line x1="' + (sx + 2) + '" y1="' + (top + 3) + '" x2="' + (sx + 2) + '" y2="' + (bot - 3) + '" stroke="#fff" stroke-opacity=".25" stroke-width="1.2"/>';
    /* glass barrel drawn over the plunger so it reads as transparent plastic */
    out += '<path d="' + barrelPath + '" fill="url(#' + uid + 'b)" class="syr-barrel"/>' +
      '<line x1="' + (X0 + 6) + '" y1="' + (top + 4) + '" x2="' + (X0 + W + TAIL - 6) + '" y2="' + (top + 4) + '" stroke="#fff" stroke-opacity=".7" stroke-width="2" stroke-linecap="round"/>';
    /* finger flange (wide plate) and thumb pad (dished disc) */
    const fh = h + (insulin ? 18 : 28);
    out += '<rect x="' + flangeX + '" y="' + f1(CY - fh / 2) + '" width="10" height="' + fh + '" rx="3" fill="url(#' + uid + 'p)" class="syr-flange"/>';
    out += '<path d="M' + padX + ' ' + f1(CY - 6) + ' L' + (padX + 6) + ' ' + f1(CY - padH / 2) + ' L' + (padX + 14) + ' ' + f1(CY - padH / 2) + ' L' + (padX + 14) + ' ' + f1(CY + padH / 2) + ' L' + (padX + 6) + ' ' + f1(CY + padH / 2) + ' L' + padX + ' ' + f1(CY + 6) + ' Z" fill="url(#' + uid + 'p)" class="syr-pad"/>';

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
    if (!opts.picture) out += '<line x1="' + sx + '" y1="' + (top - 6) + '" x2="' + sx + '" y2="' + (bot + 4) + '" class="syr-read"/>';
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
