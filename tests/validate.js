/* Sanity-checks every question in the bank. Run: node tests/validate.js */
require('../js/data.js');
const MM = require('../js/engine.js');
let bad = 0;
const fail = (q, m) => { bad++; console.log('FAIL', q.id, m); };
const counts = {};
MM.bank.forEach((q) => {
  counts[q.category] = (counts[q.category] || 0) + 1;
  const a = q.answer, da = a.da;
  const val = MM.daValue(da);
  const expect = q.category === 'po' || q.category === 'poTrap' ? a.qty : a.volume;
  if (Math.abs(val - expect) > 1e-6) fail(q, 'DA value ' + val + ' != ' + expect);
  const cancelled = MM.cancelUnits(da);
  // the one numerator unit left uncancelled must be the result unit
  const left = [['s', da.start.u]].concat(da.factors.map((f, i) => ['n' + i, f.num.u])).filter(([k]) => !cancelled[k]).map(([, u]) => u);
  if (left.length !== 1 || left[0] !== da.result.u) fail(q, 'units do not cancel to ' + da.result.u + ': ' + left);
  if (q.category === 'inj' || q.category === 'insulin') {
    const s = MM.SYRINGES[a.best];
    if (!MM.onGrid(a.volume, a.best)) fail(q, 'volume not on grid');
    if (a.volume > s.ticks * s.minor + 1e-9) fail(q, 'volume exceeds syringe');
    if (a.tick !== Math.round(a.volume / s.minor)) fail(q, 'tick mismatch');
    // a perfect response must score perfectly
    const needle = s.attached ? null : a.needles[0];
    const g = MM.grade(q, { calc: a.volume, syringe: a.best, needle, tick: a.tick });
    if (!g.correct) fail(q, 'perfect answer graded wrong: ' + JSON.stringify(g.parts.filter((p) => !p.ok)));
    if (q.category === 'insulin' && g.parts.some((p) => p.key === 'calc')) fail(q, 'insulin should not have a volume calculation');
    // the classic errors must be caught
    if (q.category === 'inj') {
      const wrong = MM.grade(q, { calc: q.order.dose.v, syringe: 'ins30', needle: null, tick: 1 });
      if (wrong.correct || wrong.parts[1].ok) fail(q, 'insulin syringe accepted');
    }
  } else {
    const g = MM.grade(q, { calc: a.qty, decision: a.feasible ? 'give' : 'hold' });
    if (!g.correct) fail(q, 'perfect oral answer graded wrong');
  }
});
console.log('Bank size:', MM.bank.length, counts);
const ids = new Set(MM.bank.map((q) => q.id));
if (ids.size !== MM.bank.length) { bad++; console.log('FAIL duplicate ids'); }
['mixed', 'syringe', 'insulin', 'po'].forEach((m) => { const d = MM.makeDeck(m, 20); if (d.length !== 20) { bad++; console.log('FAIL deck', m); } });
console.log(bad ? bad + ' problem(s)' : 'All checks passed');
process.exit(bad ? 1 : 0);
