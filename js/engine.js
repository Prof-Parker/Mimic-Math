/* Question generation, dimensional analysis and grading. No DOM access: runs in the browser and in Node. */
(function (g) {
  'use strict';
  const MM = (g.MM = g.MM || {});
  const S = () => MM.SYRINGES;

  const round = (n, p) => Math.round(n * Math.pow(10, p == null ? 6 : p)) / Math.pow(10, p == null ? 6 : p);
  const isInt = (n) => Math.abs(n - Math.round(n)) < 1e-6;

  function fmt(n) {
    n = round(n, 4);
    return Math.abs(n) >= 1000 ? n.toLocaleString('en-US', { maximumFractionDigits: 4 }) : String(n);
  }
  function fraction(n) {
    const whole = Math.floor(n + 1e-9), half = Math.abs(n - whole - 0.5) < 1e-9;
    if (half) return (whole ? whole : '') + '½';
    return fmt(n);
  }
  /* "0.5", "1/2", "1 1/2", "½", "1½", "1,000" -> number (null if unreadable). */
  function parseNumber(str) {
    if (str == null) return null;
    let s = String(str).trim().replace(/,/g, '');
    if (!s) return null;
    s = s.replace('½', ' 1/2').replace('¼', ' 1/4').replace('¾', ' 3/4').trim();
    let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
    if (m) return +m[1] + +m[2] / +m[3];
    m = s.match(/^(\d+)\/(\d+)$/);
    if (m) return +m[1] / +m[2];
    return /^\d*\.?\d+$/.test(s) ? parseFloat(s) : null;
  }

  /* ---- unit conversion (mass only) ---- */
  const CONV = { 'g>mg': 1000, 'mg>mcg': 1000, 'g>mcg': 1e6, 'mg>g': 1e-3, 'mcg>mg': 1e-3, 'mcg>g': 1e-6 };
  const kOf = (from, to) => (from === to ? 1 : CONV[from + '>' + to]);
  function convFactor(from, to) {
    const k = kOf(from, to);
    return k >= 1 ? { num: { v: k, u: to }, den: { v: 1, u: from } } : { num: { v: 1, u: to }, den: { v: round(1 / k), u: from } };
  }

  /* ---- Dimensional analysis ---- */
  function cancelUnits(da) {
    const nums = [{ u: da.start.u, key: 's' }], dens = [];
    da.factors.forEach((f, i) => { nums.push({ u: f.num.u, key: 'n' + i }); dens.push({ u: f.den.u, key: 'd' + i }); });
    const cancelled = {};
    dens.forEach((d) => {
      const hit = nums.find((n) => n.u === d.u && !cancelled[n.key]);
      if (hit) { cancelled[hit.key] = true; cancelled[d.key] = true; }
    });
    return cancelled;
  }
  function daValue(da) {
    return da.factors.reduce((acc, f) => (acc * f.num.v) / f.den.v, da.start.v);
  }
  const unitNoun = (u) => ({ tablet: 'tab', capsule: 'cap' }[u] || u);

  /* ---- Syringe / needle rules ---- */
  function bestLuer(v) { return v <= 1 ? 'luer1' : v <= 3 ? 'luer3' : v <= 5 ? 'luer5' : 'luer10'; }
  function acceptedSyringes(route, v) {
    const best = bestLuer(v);
    if (route === 'SQ' && v <= 1) return ['luer1', 'tb1'];
    /* a volume that fills a syringe exactly may also be drawn in the next size up */
    if (v === 3) return ['luer3', 'luer5'];
    if (v === 5) return ['luer5', 'luer10'];
    return [best];
  }
  const NEEDLE_RULES = { SQ: ['25g58'], IM: ['21g1', '21g15', '25g1'], IV: ['none'] };

  function onGrid(volume, syringeId) {
    const s = S()[syringeId];
    return isInt(volume / s.minor);
  }

  /* ---- Build one injectable question ---- */
  function buildInjectable(t, c, d, n) {
    const doseInConc = d[0] * kOf(d[1], c.unit);
    if (!isFinite(doseInConc)) return null;
    const volume = round((doseInConc / c.amt) * c.vol);
    if (volume <= 0 || volume > 10) return null;
    if (t.route === 'SQ' && volume > 1) return null;
    if (t.route === 'IM' && volume > 2) return null;

    let accepted, best;
    if (t.insulin) {
      const units = d[0];
      best = units <= 30 ? 'ins30' : units <= 50 ? 'ins50' : 'ins100';
      accepted = [best];
    } else {
      accepted = acceptedSyringes(t.route, volume);
      best = accepted[0];
    }
    if (!onGrid(volume, best)) return null;

    const da = { start: { v: d[0], u: d[1] }, factors: [], result: { v: volume, u: 'mL' } };
    if (d[1] !== c.unit) da.factors.push(convFactor(d[1], c.unit));
    da.factors.push({ num: { v: c.vol, u: 'mL' }, den: { v: c.amt, u: c.unit } });

    return {
      id: t.id + '|' + c.amt + c.unit + '/' + c.vol + 'mL|' + d[0] + d[1],
      category: t.insulin ? 'insulin' : 'inj',
      drug: t.drug,
      order: { drug: t.drug, dose: { v: d[0], u: d[1] }, route: t.route, routeLabel: t.routeLabel, freq: t.freqs[n % t.freqs.length],
        prn: t.prn ? t.prn[(n >> 1) % t.prn.length] : null, indic: t.indic || null },
      product: { kind: 'vial', pack: c.pack, conc: { amt: c.amt, unit: c.unit, vol: c.vol }, total: c.total, sched: t.sched || null, cap: t.cap, insulin: !!t.insulin, route: t.route },
      answer: { volume, accepted, best, needles: t.insulin ? [] : NEEDLE_RULES[t.route], tick: Math.round(volume / S()[best].minor), da }
    };
  }

  /* ---- Build one reconstitution question: a powder vial plus the label dilution directions ---- */
  function buildRecon(t, v, d, n) {
    const c = { amt: v.conc, unit: v.unit, vol: 1, total: round(v.amt / v.conc), pack: 'single-dose vial' };
    if (d[0] * kOf(d[1], v.unit) > v.amt + 1e-9) return null; /* cannot give more than the vial holds */
    /* part 1 of the question: the diluent must be measurable on a Luer-Lock syringe */
    const prepAccepted = acceptedSyringes('IM', v.dil);
    if (!onGrid(v.dil, prepAccepted[0])) return null;
    const q = buildInjectable(t, c, d, n);
    if (!q) return null;
    q.answer.prep = { dil: v.dil, accepted: prepAccepted, best: prepAccepted[0], needle: 'blunt18' };
    q.id = t.id + '|' + v.amt + v.unit + '|' + d[0] + d[1];
    q.category = 'recon';
    q.product.recon = { vialAmt: v.amt, unit: v.unit, diluent: v.diluent, dil: v.dil, conc: v.conc };
    return q;
  }

  /* ---- Build one oral question ---- */
  function buildOral(t, st, d, n) {
    const doseInStrength = d[0] * kOf(d[1], st.unit);
    if (!isFinite(doseInStrength)) return null;
    const qty = round(doseInStrength / st.amt);
    if (qty < 0.5 || qty > 4 || !isInt(qty * 2)) return null;
    const half = !isInt(qty);
    const canSplit = st.scored && st.coat === 'none' && t.form === 'tablet';
    const feasible = !half || canSplit;
    let reason;
    if (!half) reason = 'The dose is a whole number of ' + t.form + 's, so it can be given as is.';
    else if (canSplit) reason = 'This tablet is scored, so it can be split along the score line to give ½ tablet.';
    else if (t.form === 'capsule') reason = 'Capsules cannot be opened or divided. Hold the dose and ask the pharmacist for the correct strength.';
    else if (st.coat === 'ER') reason = 'Extended-release tablets must not be split, crushed or chewed: it destroys the slow-release coating and can cause a dangerous overdose. Hold and clarify with the prescriber/pharmacist.';
    else if (st.coat === 'EC') reason = 'Enteric-coated tablets must not be split, crushed or chewed: the coating protects the drug from stomach acid (or the stomach from the drug). Hold and clarify with the prescriber/pharmacist.';
    else reason = 'This tablet is not scored, so it cannot be reliably split. Hold and ask the pharmacist for a different strength.';

    const da = { start: { v: d[0], u: d[1] }, factors: [], result: { v: qty, u: t.form === 'capsule' ? 'capsule' : 'tablet' } };
    if (d[1] !== st.unit) da.factors.push(convFactor(d[1], st.unit));
    da.factors.push({ num: { v: 1, u: da.result.u }, den: { v: st.amt, u: st.unit } });

    return {
      id: t.id + '|' + st.amt + st.unit + '|' + d[0] + d[1],
      category: feasible ? 'po' : 'poTrap',
      drug: t.drug,
      order: { drug: t.drug, dose: { v: d[0], u: d[1] }, route: 'PO', routeLabel: 'by mouth', freq: t.freqs[n % t.freqs.length],
        prn: t.prn ? t.prn[(n >> 1) % t.prn.length] : null, indic: t.indic || null },
      product: { kind: t.form, name: st.name || (t.drug + ' ' + (t.form === 'capsule' ? 'Capsules' : 'Tablets')), strength: { amt: st.amt, unit: st.unit, label: st.label },
        shape: st.shape, scored: st.scored, coat: st.coat, color: st.color, color2: st.color2, sched: t.sched || null, count: 30 },
      answer: { qty, feasible, reason, da }
    };
  }

  /* ---- The bank ---- */
  function buildBank() {
    const bank = [];
    MM.INJECTABLES.concat(MM.INSULINS).forEach((t) => {
      let n = 0;
      t.concs.forEach((c) => t.doses.forEach((d) => { const q = buildInjectable(t, c, d, n++); if (q) bank.push(q); }));
    });
    MM.RECONS.forEach((t) => {
      let n = 0;
      t.vials.forEach((v) => t.doses.forEach((d) => { const q = buildRecon(t, v, d, n++); if (q) bank.push(q); }));
    });
    MM.ORALS.forEach((t) => {
      let n = 0;
      t.strengths.forEach((st) => t.doses.forEach((d) => { const q = buildOral(t, st, d, n++); if (q) bank.push(q); }));
    });
    return bank;
  }
  MM.bank = buildBank();

  /* ---- Decks ---- */
  const MODES = {
    mixed:   { label: 'Mixed practice',            weights: { inj: 42, insulin: 18, recon: 14, po: 20, poTrap: 6 } },
    syringe: { label: 'Syringe & needle (injectables + insulin)', weights: { inj: 55, insulin: 25, recon: 20 } },
    recon:   { label: 'Reconstitution (powder vials)', weights: { recon: 100 } },
    insulin: { label: 'Insulin only',               weights: { insulin: 100 } },
    po:      { label: 'Oral medications',          weights: { po: 70, poTrap: 30 } }
  };
  MM.MODES = MODES;

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function makeDeck(mode, count) {
    const w = MODES[mode].weights, cats = Object.keys(w);
    const queues = {};
    cats.forEach((c) => { queues[c] = shuffle(MM.bank.filter((q) => q.category === c)); });
    const total = cats.reduce((s, c) => s + w[c], 0);
    const deck = [];
    while (deck.length < count) {
      let r = Math.random() * total, cat = cats[0];
      for (const c of cats) { if ((r -= w[c]) < 0) { cat = c; break; } }
      const prev = deck.length ? deck[deck.length - 1] : null;
      let q = queues[cat].pop();
      if (!q) { queues[cat] = shuffle(MM.bank.filter((x) => x.category === cat)); q = queues[cat].pop(); }
      if (prev && q.drug === prev.drug && queues[cat].length) { const alt = queues[cat].pop(); queues[cat].unshift(q); q = alt; }
      if (deck.some((x) => x.id === q.id)) continue;
      deck.push(q);
    }
    return deck;
  }

  /* ---- Grading ---- */
  function doseText(q) { return fmt(q.order.dose.v) + ' ' + q.order.dose.u; }

  function gradeInjectable(q, r) {
    const a = q.answer, parts = [];
    const syr = r.syringe ? S()[r.syringe] : null;
    const isIns = q.category === 'insulin';
    const conc = q.product.conc, concPerMl = conc.amt / conc.vol;

    // 1. calculation (insulin is ordered and measured in units, so there is no mL step)
    const calcOk = r.calc != null && Math.abs(r.calc - a.volume) < 0.0005;
    let calcMsg = '';
    if (!calcOk) {
      if (r.calc != null && q.order.dose.u !== 'mL' && Math.abs(r.calc - q.order.dose.v) < 1e-9) {
        calcMsg = 'You entered the dose (' + doseText(q) + ') as the volume. ' + q.order.dose.u + ' is the amount of drug; mL is the volume of liquid that contains it. Use the vial concentration to convert.';
      } else if (r.calc != null && Math.abs(r.calc - (q.order.dose.v * kOf(q.order.dose.u, conc.unit) * concPerMl)) < 0.0005) {
        calcMsg = 'It looks like you multiplied by the concentration. Divide the ordered dose by the concentration (or multiply by its inverse, mL per ' + conc.unit + ').';
      } else if (r.calc != null && [10, 100, 1000].some((k) => Math.abs(r.calc * k - a.volume) < 0.0005 || Math.abs(r.calc / k - a.volume) < 0.0005)) {
        calcMsg = 'Your answer is off by a power of ten: check the decimal point and any mg ↔ mcg ↔ g conversion.';
      }
    }
    if (!isIns) parts.push({ key: 'calc', label: 'Volume to administer', ok: calcOk, msg: calcMsg, yours: r.calc == null ? '—' : fmt(r.calc) + ' mL', correct: fmt(a.volume) + ' mL' });

    // 2. syringe
    const synOk = !!syr && a.accepted.includes(syr.id);
    let synMsg = '';
    if (!synOk && syr) {
      if (syr.group === 'insulin' && !isIns) synMsg = 'Insulin syringes are calibrated in units of U-100 insulin only. For ' + q.order.drug + ' the marks do not mean mg, units of the drug, or mL. (1 "unit" on an insulin syringe is just 0.01 mL.) Use a syringe marked in mL.';
      else if (isIns && syr.group !== 'insulin') synMsg = 'U-100 insulin must be measured in an insulin syringe, which is marked in units.';
      else if (syr.cap < a.volume - 1e-9 && syr.group !== 'insulin') synMsg = 'A ' + syr.label + ' syringe cannot hold ' + fmt(a.volume) + ' mL.';
      else if (syr.group === 'insulin' && isIns) synMsg = 'Choose the smallest insulin syringe that holds the dose (≤30 units: 30-unit; 31–50: 50-unit; 51–100: 100-unit) so the marks are as easy to read as possible.';
      else if (syr.id === 'tb1' && q.order.route === 'IV') synMsg = 'A TB syringe has a fixed needle. For an IV push use a Luer-Lock syringe and connect to a needleless connector.';
      else if (syr.id === 'tb1') synMsg = 'A TB syringe has a fixed ⅝" needle, which is too short for an IM injection. Use a Luer-Lock syringe and a needle long enough to reach muscle.';
      else synMsg = 'Use the smallest syringe that holds the volume (' + fmt(a.volume) + ' mL → ' + S()[a.best].label + ') so the graduations are fine enough to measure it accurately.';
    }
    const bestLabel = a.accepted.map((id) => S()[id].label + (S()[id].sub ? ' ' + S()[id].sub : '')).join(' or ');
    parts.push({ key: 'syringe', label: 'Syringe', ok: synOk, msg: synMsg, yours: syr ? syr.label + ' ' + syr.sub : '—', correct: bestLabel });

    // 3. needle (only applies to a Luer-Lock syringe for IM / subcutaneous; fixed-needle syringes and IV push have no needle step)
    const needleApplies = !isIns && !!syr && !syr.attached && q.order.route !== 'IV';
    let needleOk, needleMsg = '', needleYours, needleCorrect;
    const route = q.order.route;
    if (isIns) {
      needleOk = synOk; needleYours = 'Fixed to syringe'; needleCorrect = 'Fixed to insulin syringe';
    } else {
      needleCorrect = a.needles.map((id) => MM.NEEDLES[id].label + (id === 'none' ? ' (needleless IV connector)' : '')).join(' or ');
      if (syr && syr.attached) {
        needleYours = 'Fixed to syringe';
        needleOk = synOk && a.accepted.includes(syr.id) && (route === 'SQ');
        if (!needleOk && !synMsg) needleMsg = 'The fixed needle on this syringe does not suit this route.';
      } else {
        const nd = r.needle ? MM.NEEDLES[r.needle] : null;
        needleYours = nd ? nd.label : '—';
        needleOk = !!nd && a.needles.includes(nd.id);
        if (!needleOk && nd) {
          if (nd.blunt) needleMsg = 'A blunt fill needle is only for drawing medication out of a vial or ampule. It cannot pierce skin, so it is never used to inject.';
          else if (route === 'SQ') needleMsg = nd.id === 'none' ? 'A subcutaneous injection needs a needle. Use a short 25 G × ⅝" needle to reach the fatty layer under the skin.' : 'Subcutaneous injections go into the fatty tissue just under the skin. Use a short needle (25 G × ⅝").';
          else if (route === 'IM') needleMsg = nd.id === 'none' ? 'An IM injection needs a needle long enough to reach muscle (21 G × 1" or 1½", or 25 G × 1" for a small adult).' : nd.id === '18g15' ? '18 G × 1½" is a large-bore needle used to draw medication up, not to inject a patient. Use 21 G × 1"/1½" or 25 G × 1".' : nd.len < 1 ? 'A ⅝" needle is too short to reach muscle. Use a 1" or 1½" needle.' : 'Use 21 G × 1"/1½" (or 25 G × 1" for aqueous medications in a small adult).';
          else needleMsg = 'An IV push goes into the patient\'s IV line through a needleless connector. A needle is not used (needlestick risk).';
        }
      }
    }
    if (needleApplies) parts.push({ key: 'needle', label: 'Needle', ok: !!needleOk, msg: needleMsg, yours: needleYours, correct: needleCorrect });

    // 4. plunger
    let drawOk = false, drawMsg = '', drawn = null, yours = '—';
    if (syr && r.tick != null) {
      drawn = round(r.tick * syr.minor);
      drawOk = Math.abs(drawn - a.volume) < 1e-6;
      yours = fmt(round(drawn * syr.scale, 4)) + ' ' + syr.unit + (syr.scale === 100 ? ' (' + fmt(drawn) + ' mL)' : '');
      if (!drawOk) {
        if (syr.cap < a.volume - 1e-9) drawMsg = 'The syringe you chose cannot hold the dose.';
        else if (!onGrid(a.volume, syr.id)) drawMsg = 'This syringe cannot measure ' + fmt(a.volume) + ' mL exactly, which is another reason to pick the right syringe size.';
        else if (syr.group === 'insulin' && !isIns) drawMsg = 'You drew up ' + fmt(drawn) + ' mL, a fraction of the ' + fmt(a.volume) + ' mL needed. Units on an insulin syringe are not mg and not mL.';
        else drawMsg = 'You drew up ' + fmt(drawn) + ' mL; the dose is ' + fmt(a.volume) + ' mL. Read the plunger at the edge of the black stopper nearest the needle.';
      }
    }
    const targetSyr = S()[a.best];
    const correctDraw = fmt(round(a.volume * targetSyr.scale, 4)) + ' ' + targetSyr.unit + (targetSyr.scale === 100 ? ' (' + fmt(a.volume) + ' mL)' : '');
    parts.push({ key: 'draw', label: 'Plunger / amount drawn up', ok: drawOk, msg: drawMsg, yours, correct: correctDraw });
    return parts;
  }

  /* Part 1 of a reconstitution question: withdraw the diluent (volume, syringe, blunt fill needle). */
  function gradeRecon1(q, r) {
    const rc = q.product.recon, p = q.answer.prep, parts = [];
    const syr = r.syringe ? S()[r.syringe] : null;
    const volOk = r.calc != null && Math.abs(r.calc - rc.dil) < 0.0005;
    parts.push({ key: 'dilVol', label: 'Diluent volume', ok: volOk,
      msg: volOk || r.calc == null ? '' : 'Follow the reconstitution directions on the label: add ' + fmt(rc.dil) + ' mL of ' + rc.diluent + '. The ordered dose and the final concentration are used in part 2, not here.',
      yours: r.calc == null ? '—' : fmt(r.calc) + ' mL', correct: fmt(rc.dil) + ' mL of ' + rc.diluent });

    const synOk = !!syr && p.accepted.includes(syr.id);
    let synMsg = '';
    if (!synOk && syr) {
      const cap = syr.ticks * syr.minor;
      if (syr.attached) synMsg = 'Insulin and TB syringes have a small fixed needle and are marked for other purposes. To withdraw diluent use a Luer-Lock syringe so a blunt fill needle can be attached.';
      else if (cap < rc.dil - 1e-9) synMsg = 'A ' + syr.label + ' syringe cannot hold ' + fmt(rc.dil) + ' mL.';
      else synMsg = 'Use the smallest syringe that holds the volume (' + fmt(rc.dil) + ' mL → ' + S()[p.best].label + ') so the graduations are fine enough to measure it accurately.';
    }
    parts.push({ key: 'dilSyringe', label: 'Diluent syringe', ok: synOk, msg: synMsg, yours: syr ? syr.label + ' ' + syr.sub : '—',
      correct: p.accepted.map((id) => S()[id].label + ' ' + S()[id].sub).join(' or ') });

    if (syr && !syr.attached) {
      const nd = r.needle ? MM.NEEDLES[r.needle] : null, ndOk = !!nd && nd.id === p.needle;
      parts.push({ key: 'dilNeedle', label: 'Diluent needle', ok: ndOk,
        msg: ndOk || !nd ? '' : 'Use a blunt fill needle to withdraw from a vial or ampule: it cannot stick you, and you switch to a sterile injection needle (or a needleless connector for IV) before giving the dose.',
        yours: nd ? nd.label : '—', correct: MM.NEEDLES[p.needle].label });
    }
    let drawOk = false, drawMsg = '', drawYours = '—';
    if (syr && r.tick != null) {
      const drawn = round(r.tick * syr.minor);
      drawOk = Math.abs(drawn - rc.dil) < 1e-6;
      drawYours = fmt(round(drawn * syr.scale, 4)) + ' ' + syr.unit;
      if (!drawOk) drawMsg = 'You drew back to ' + fmt(drawn) + ' mL; the diluent volume is ' + fmt(rc.dil) + ' mL. Read the plunger at the edge of the black stopper nearest the needle.';
    }
    parts.push({ key: 'dilDraw', label: 'Diluent drawn up', ok: drawOk, msg: drawMsg, yours: drawYours, correct: fmt(rc.dil) + ' mL' });
    return { parts, correct: parts.every((x) => x.ok) };
  }

  function gradeOral(q, r) {
    const a = q.answer, parts = [];
    const noun = q.product.kind === 'capsule' ? 'capsule' : 'tablet';
    const calcOk = r.calc != null && Math.abs(r.calc - a.qty) < 1e-6;
    let msg = '';
    if (!calcOk && r.calc != null && Math.abs(r.calc - q.order.dose.v) < 1e-9) msg = 'You entered the dose in ' + q.order.dose.u + '. The answer must be a number of ' + noun + 's. Divide the dose by the strength of one ' + noun + '.';
    parts.push({ key: 'calc', label: 'Number of ' + noun + 's', ok: calcOk, msg, yours: r.calc == null ? '—' : fraction(r.calc), correct: fraction(a.qty) });
    const want = a.feasible ? 'give' : 'hold';
    const decOk = r.decision === want;
    parts.push({ key: 'decision', label: 'Can it be given as ordered?', ok: decOk, msg: decOk ? '' : a.reason,
      yours: r.decision === 'give' ? 'Give' : r.decision === 'hold' ? 'Hold & clarify' : '—', correct: a.feasible ? 'Give ' + fraction(a.qty) + ' ' + noun + (a.qty > 1 ? 's' : '') : 'Hold and clarify' });
    return parts;
  }

  function grade(q, r) {
    const parts = q.category === 'insulin' || q.category === 'inj' || q.category === 'recon' ? gradeInjectable(q, r) : gradeOral(q, r);
    return { parts, correct: parts.every((p) => p.ok) };
  }

  /* One-line "does this make sense?" check shown with the answer. */
  function senseCheck(q) {
    if (q.category === 'po' || q.category === 'poTrap') {
      const st = q.product.strength, doseU = q.order.dose.v * kOf(q.order.dose.u, st.unit);
      const noun = q.product.kind;
      const cmp = doseU > st.amt ? 'more than' : doseU < st.amt ? 'less than' : 'the same as';
      return 'Each ' + noun + ' contains ' + fmt(st.amt) + ' ' + st.unit + '. The order (' + doseText(q) + ') is ' + cmp + ' one ' + noun + ', so you should expect ' + (cmp === 'less than' ? 'less than one' : cmp === 'more than' ? 'more than one' : 'exactly one') + ' ' + noun + '.';
    }
    if (q.category === 'insulin') return 'U-100 insulin is 100 units in every 1 mL, and an insulin syringe is marked in units, so you draw up exactly the ordered ' + doseText(q) + ' with no mL calculation.';
    const c = q.product.conc, doseU = q.order.dose.v * kOf(q.order.dose.u, c.unit);
    const per = q.category === 'recon' ? 'After reconstitution, the solution contains ' + fmt(c.amt) + ' ' + c.unit + ' in ' + fmt(c.vol) + ' mL' : 'The vial has ' + fmt(c.amt) + ' ' + c.unit + ' in ' + fmt(c.vol) + ' mL';
    const cmp = doseU > c.amt ? 'more than' : doseU < c.amt ? 'less than' : 'the same as';
    const exp = cmp === 'less than' ? 'less than ' + fmt(c.vol) + ' mL' : cmp === 'more than' ? 'more than ' + fmt(c.vol) + ' mL' : 'exactly ' + fmt(c.vol) + ' mL';
    return per + '. The ordered dose (' + doseText(q) + ') is ' + cmp + ' that, so you should draw up ' + exp + '. ' + (q.category === 'insulin' || c.amt / c.vol === 1 ? '' : 'The dose in ' + q.order.dose.u + ' and the volume in mL are never the same thing unless the concentration happens to be 1 ' + c.unit + '/mL.');
  }

  Object.assign(MM, { fmt, fraction, parseNumber, round, convFactor, cancelUnits, daValue, unitNoun, grade, gradeRecon1, senseCheck, makeDeck, kOf, onGrid, doseText, NEEDLE_RULES, acceptedSyringes });
})(typeof globalThis !== 'undefined' ? globalThis : this);

if (typeof module !== 'undefined' && module.exports) module.exports = globalThis.MM;
