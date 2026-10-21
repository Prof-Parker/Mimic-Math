/* Export the question bank as CSV for instructors: node scripts/export-bank.js > bank.csv */
require('../js/data.js');
const MM = require('../js/engine.js');
const esc = (v) => '"' + String(v).replace(/"/g, '""') + '"';
console.log(['id', 'category', 'order', 'route', 'frequency', 'answer'].join(','));
MM.bank.forEach((q) => {
  const a = q.answer;
  const ans = a.volume != null ? MM.fmt(a.volume) + ' mL on ' + a.accepted.join('/') : MM.fraction(a.qty) + ' ' + q.product.kind + (a.feasible ? '' : ' (HOLD & clarify)');
  console.log([q.id, q.category, q.drug + ' ' + MM.doseText(q), q.order.route, q.order.freq + (q.order.prn ? ' PRN ' + q.order.prn : ''), ans].map(esc).join(','));
});
