/* Static data: syringes, needles and the medication templates the question bank is built from.
 * Everything is plain data so instructors can add drugs without touching any logic. */
(function (g) {
  'use strict';
  const MM = (g.MM = g.MM || {});

  /* Syringes. All volumes are stored in mL; `scale` converts to the number printed on the barrel
   * (insulin syringes print units, 100 units = 1 mL). `ticks` = number of minor graduations. */
  MM.SYRINGES = {
    luer1:  { id: 'luer1',  label: '1 mL',  sub: 'Luer-Lock',        group: 'luer',    ticks: 100, minor: 0.01, labelStep: 10, midStep: 5, scale: 1,   unit: 'mL',    attached: false, h: 38 },
    luer3:  { id: 'luer3',  label: '3 mL',  sub: 'Luer-Lock',        group: 'luer',    ticks: 30,  minor: 0.1,  labelStep: 5,  midStep: 5, scale: 1,   unit: 'mL',    attached: false, h: 46 },
    luer5:  { id: 'luer5',  label: '5 mL',  sub: 'Luer-Lock',        group: 'luer',    ticks: 25,  minor: 0.2,  labelStep: 5,  midStep: 5, scale: 1,   unit: 'mL',    attached: false, h: 54 },
    luer10: { id: 'luer10', label: '10 mL', sub: 'Luer-Lock',        group: 'luer',    ticks: 50,  minor: 0.2,  labelStep: 5,  midStep: 5, scale: 1,   unit: 'mL',    attached: false, h: 64 },
    ins30:  { id: 'ins30',  label: '30 unit',  sub: 'Insulin (0.3 mL)', group: 'insulin', ticks: 30,  minor: 0.01, labelStep: 5,  midStep: 5, scale: 100, unit: 'units', attached: true,  h: 30, needle: { len: 0.31, gauge: 31 } },
    ins50:  { id: 'ins50',  label: '50 unit',  sub: 'Insulin (0.5 mL)', group: 'insulin', ticks: 50,  minor: 0.01, labelStep: 5,  midStep: 5, scale: 100, unit: 'units', attached: true,  h: 32, needle: { len: 0.31, gauge: 31 } },
    ins100: { id: 'ins100', label: '100 unit', sub: 'Insulin (1 mL)',   group: 'insulin', ticks: 50,  minor: 0.02, labelStep: 5,  midStep: 5, scale: 100, unit: 'units', attached: true,  h: 36, needle: { len: 0.5,  gauge: 30 } },
    tb1:    { id: 'tb1',    label: '1 mL',  sub: 'TB syringe',       group: 'other',   ticks: 100, minor: 0.01, labelStep: 10, midStep: 5, scale: 1,   unit: 'mL',    attached: true,  h: 38, needle: { len: 0.625, gauge: 25 } }
  };
  MM.SYRINGE_ORDER = ['ins30', 'ins50', 'ins100', 'tb1', 'luer1', 'luer3', 'luer5', 'luer10'];
  MM.SYRINGE_GROUPS = [
    { id: 'luer', title: 'Luer-Lock syringes' },
    { id: 'insulin', title: 'Insulin syringes (U-100)' },
    { id: 'other', title: 'Other' }
  ];

  /* Needles. `len` in inches. Hub colours follow the ISO gauge colour code. */
  MM.NEEDLES = {
    '18g15': { id: '18g15', label: '18 G × 1½"', gauge: 18, len: 1.5,   hub: '#e86aa6' },
    'blunt18': { id: 'blunt18', label: '18 G × 1½" blunt fill', sub: 'Draw-up only', gauge: 18, len: 1.5, hub: '#e86aa6', blunt: true },
    '21g1':  { id: '21g1',  label: '21 G × 1"',  gauge: 21, len: 1,     hub: '#4caf50' },
    '21g15': { id: '21g15', label: '21 G × 1½"', gauge: 21, len: 1.5,   hub: '#4caf50' },
    '25g1':  { id: '25g1',  label: '25 G × 1"',  gauge: 25, len: 1,     hub: '#f28c28' },
    '25g58': { id: '25g58', label: '25 G × ⅝"',  gauge: 25, len: 0.625, hub: '#f28c28' },
    none:    { id: 'none',  label: 'No needle',  sub: 'Needleless IV connector', gauge: 0, len: 0, hub: '#cfd8dc' }
  };
  MM.NEEDLE_ORDER = ['18g15', 'blunt18', '21g1', '21g15', '25g1', '25g58', 'none'];

  /* ---- Injectable templates ----
   * concs: vial strengths (amt `unit` in `vol` mL; `total` = mL in the container).
   * doses: orders to practise. Combinations that can't be measured on a real syringe are filtered out
   * automatically by the engine. prn = list of indications (makes the order PRN); indic = indication on a scheduled order. */
  const V = 'single-dose vial', MDV = 'multiple-dose vial', AMP = 'ampule';
  MM.INJECTABLES = [
    { id: 'morphine-iv', drug: 'Morphine sulfate', route: 'IV', routeLabel: 'IV push', sched: 'C-II', cap: '#c0392b',
      freqs: ['q4h', 'q3h'], prn: ['severe pain (7–10/10)', 'moderate to severe pain'],
      concs: [{ amt: 2, unit: 'mg', vol: 1, total: 1, pack: V }, { amt: 4, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[1, 'mg'], [2, 'mg'], [3, 'mg'], [4, 'mg'], [1.5, 'mg']] },
    { id: 'morphine-im', drug: 'Morphine sulfate', route: 'IM', routeLabel: 'IM', sched: 'C-II', cap: '#c0392b',
      freqs: ['q4h'], prn: ['severe pain (7–10/10)'],
      concs: [{ amt: 10, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[5, 'mg'], [10, 'mg'], [8, 'mg'], [6, 'mg'], [2.5, 'mg']] },
    { id: 'hydromorphone-iv', drug: 'Hydromorphone HCl', route: 'IV', routeLabel: 'IV push', sched: 'C-II', cap: '#8e44ad',
      freqs: ['q3h', 'q4h'], prn: ['severe pain (7–10/10)'],
      concs: [{ amt: 1, unit: 'mg', vol: 1, total: 1, pack: AMP }, { amt: 2, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[0.2, 'mg'], [0.4, 'mg'], [0.5, 'mg'], [1, 'mg'], [1.5, 'mg']] },
    { id: 'fentanyl-iv', drug: 'Fentanyl citrate', route: 'IV', routeLabel: 'IV push', sched: 'C-II', cap: '#2980b9',
      freqs: ['q1h', 'q2h'], prn: ['severe pain (7–10/10)'],
      concs: [{ amt: 100, unit: 'mcg', vol: 2, total: 2, pack: AMP }],
      doses: [[25, 'mcg'], [50, 'mcg'], [75, 'mcg'], [100, 'mcg']] },
    { id: 'ondansetron-iv', drug: 'Ondansetron', route: 'IV', routeLabel: 'IV push', cap: '#f1c40f',
      freqs: ['q8h', 'q6h'], prn: ['nausea/vomiting'],
      concs: [{ amt: 4, unit: 'mg', vol: 2, total: 2, pack: V }, { amt: 40, unit: 'mg', vol: 20, total: 20, pack: MDV }],
      doses: [[4, 'mg'], [2, 'mg'], [8, 'mg']] },
    { id: 'ketorolac-iv', drug: 'Ketorolac tromethamine', route: 'IV', routeLabel: 'IV push', cap: '#16a085',
      freqs: ['q6h'], prn: ['moderate pain (4–6/10)', 'moderate to severe pain'],
      concs: [{ amt: 30, unit: 'mg', vol: 1, total: 1, pack: V }, { amt: 15, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[15, 'mg'], [30, 'mg']] },
    { id: 'ketorolac-im', drug: 'Ketorolac tromethamine', route: 'IM', routeLabel: 'IM', cap: '#16a085',
      freqs: ['q6h'], prn: ['moderate to severe pain'],
      concs: [{ amt: 30, unit: 'mg', vol: 1, total: 1, pack: V }, { amt: 60, unit: 'mg', vol: 2, total: 2, pack: V }],
      doses: [[30, 'mg'], [60, 'mg'], [15, 'mg']] },
    { id: 'furosemide-iv', drug: 'Furosemide', route: 'IV', routeLabel: 'IV push', cap: '#e67e22',
      freqs: ['daily', 'BID'], indic: 'fluid overload',
      concs: [{ amt: 20, unit: 'mg', vol: 2, total: 2, pack: V }, { amt: 40, unit: 'mg', vol: 4, total: 4, pack: V }, { amt: 100, unit: 'mg', vol: 10, total: 10, pack: V }],
      doses: [[10, 'mg'], [20, 'mg'], [40, 'mg'], [60, 'mg'], [80, 'mg']] },
    { id: 'diphenhydramine-im', drug: 'Diphenhydramine HCl', route: 'IM', routeLabel: 'IM', cap: '#d35400',
      freqs: ['q6h'], prn: ['allergic reaction', 'itching/urticaria'],
      concs: [{ amt: 50, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[25, 'mg'], [50, 'mg'], [12.5, 'mg']] },
    { id: 'diphenhydramine-iv', drug: 'Diphenhydramine HCl', route: 'IV', routeLabel: 'IV push', cap: '#d35400',
      freqs: ['q6h'], prn: ['allergic reaction'],
      concs: [{ amt: 50, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[25, 'mg'], [50, 'mg']] },
    { id: 'dexamethasone-iv', drug: 'Dexamethasone sodium phosphate', route: 'IV', routeLabel: 'IV push', cap: '#27ae60',
      freqs: ['q6h', 'q12h', 'daily'], indic: 'cerebral edema',
      concs: [{ amt: 4, unit: 'mg', vol: 1, total: 1, pack: V }, { amt: 10, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[2, 'mg'], [4, 'mg'], [5, 'mg'], [6, 'mg'], [8, 'mg'], [10, 'mg']] },
    { id: 'metoclopramide-iv', drug: 'Metoclopramide', route: 'IV', routeLabel: 'IV push', cap: '#7f8c8d',
      freqs: ['q6h'], prn: ['nausea/vomiting'],
      concs: [{ amt: 10, unit: 'mg', vol: 2, total: 2, pack: V }],
      doses: [[5, 'mg'], [10, 'mg']] },
    { id: 'famotidine-iv', drug: 'Famotidine', route: 'IV', routeLabel: 'IV push', cap: '#1abc9c',
      freqs: ['q12h'], indic: 'GI prophylaxis',
      concs: [{ amt: 20, unit: 'mg', vol: 2, total: 2, pack: V }],
      doses: [[20, 'mg'], [10, 'mg']] },
    { id: 'lorazepam-iv', drug: 'Lorazepam', route: 'IV', routeLabel: 'IV push', sched: 'C-IV', cap: '#e84393',
      freqs: ['q4h', 'q6h'], prn: ['anxiety', 'seizure activity'],
      concs: [{ amt: 2, unit: 'mg', vol: 1, total: 1, pack: V }, { amt: 4, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[0.5, 'mg'], [1, 'mg'], [1.5, 'mg'], [2, 'mg']] },
    { id: 'haloperidol-im', drug: 'Haloperidol lactate', route: 'IM', routeLabel: 'IM', cap: '#34495e',
      freqs: ['q4h', 'q6h'], prn: ['severe agitation'],
      concs: [{ amt: 5, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[1, 'mg'], [2, 'mg'], [2.5, 'mg'], [5, 'mg'], [10, 'mg']] },
    { id: 'naloxone-iv', drug: 'Naloxone HCl', route: 'IV', routeLabel: 'IV push', cap: '#2ecc71',
      freqs: ['q2–3 min'], prn: ['respiratory depression (RR < 8)'],
      concs: [{ amt: 0.4, unit: 'mg', vol: 1, total: 1, pack: AMP }],
      doses: [[0.4, 'mg'], [0.2, 'mg'], [0.1, 'mg'], [0.04, 'mg'], [0.08, 'mg']] },
    { id: 'glucagon-sq', drug: 'Glucagon', route: 'SQ', routeLabel: 'subcutaneous', cap: '#e74c3c',
      freqs: ['once'], prn: ['severe hypoglycemia, unable to take PO'],
      concs: [{ amt: 1, unit: 'mg', vol: 1, total: 1, pack: 'reconstituted vial' }],
      doses: [[1, 'mg'], [0.5, 'mg'], [0.25, 'mg']] },
    { id: 'heparin-sq', drug: 'Heparin sodium', route: 'SQ', routeLabel: 'subcutaneous', cap: '#3498db',
      freqs: ['q8h', 'q12h'], indic: 'DVT prophylaxis',
      concs: [{ amt: 5000, unit: 'units', vol: 1, total: 1, pack: V }, { amt: 10000, unit: 'units', vol: 1, total: 1, pack: V }],
      doses: [[5000, 'units'], [2500, 'units'], [7500, 'units']] },
    { id: 'epinephrine-im', drug: 'Epinephrine', route: 'IM', routeLabel: 'IM', cap: '#ecf0f1',
      freqs: ['once', 'q5–15 min'], prn: ['anaphylaxis'],
      concs: [{ amt: 1, unit: 'mg', vol: 1, total: 1, pack: AMP }],
      doses: [[0.3, 'mg'], [0.5, 'mg'], [0.2, 'mg'], [0.4, 'mg'], [0.15, 'mg']] },
    { id: 'b12-im', drug: 'Cyanocobalamin (vitamin B12)', route: 'IM', routeLabel: 'IM', cap: '#c0392b',
      freqs: ['once monthly', 'daily × 7 days'], indic: 'pernicious anemia',
      concs: [{ amt: 1000, unit: 'mcg', vol: 1, total: 1, pack: V }],
      doses: [[1000, 'mcg'], [500, 'mcg'], [250, 'mcg'], [1, 'mg'], [0.5, 'mg']] },
    { id: 'hydralazine-iv', drug: 'Hydralazine HCl', route: 'IV', routeLabel: 'IV push', cap: '#9b59b6',
      freqs: ['q6h'], prn: ['SBP > 180 mmHg'],
      concs: [{ amt: 20, unit: 'mg', vol: 1, total: 1, pack: V }],
      doses: [[5, 'mg'], [10, 'mg'], [20, 'mg']] },
    { id: 'labetalol-iv', drug: 'Labetalol HCl', route: 'IV', routeLabel: 'IV push', cap: '#f39c12',
      freqs: ['q4h', 'q6h'], prn: ['SBP > 180 mmHg', 'HR > 120 bpm'],
      concs: [{ amt: 100, unit: 'mg', vol: 20, total: 20, pack: MDV }],
      doses: [[10, 'mg'], [20, 'mg'], [40, 'mg'], [30, 'mg']] },
    { id: 'metoprolol-iv', drug: 'Metoprolol tartrate', route: 'IV', routeLabel: 'IV push', cap: '#95a5a6',
      freqs: ['q6h', 'q12h'], indic: 'tachycardia',
      concs: [{ amt: 5, unit: 'mg', vol: 5, total: 5, pack: AMP }],
      doses: [[2.5, 'mg'], [5, 'mg'], [3, 'mg'], [4, 'mg']] }
  ];

  /* ---- Reconstitution templates (powder vials) ----
   * vials: amt/unit per vial, the diluent and volume added, and the resulting concentration (conc, in unit/mL).
   * The label directions give the resulting concentration; the student calculates the volume to draw up. */
  const SWFI = 'sterile water for injection', LIDO = '1% lidocaine HCl', NS = '0.9% sodium chloride';
  MM.RECONS = [
    { id: 'ceftriaxone-iv', drug: 'Ceftriaxone', route: 'IV', routeLabel: 'IV push', cap: '#3b8fd9',
      freqs: ['q12h', 'q24h'], indic: 'bacterial infection',
      vials: [{ amt: 250, unit: 'mg', diluent: SWFI, dil: 2.4, conc: 100 }, { amt: 500, unit: 'mg', diluent: SWFI, dil: 4.8, conc: 100 }, { amt: 1000, unit: 'mg', diluent: SWFI, dil: 9.6, conc: 100 }],
      doses: [[100, 'mg'], [200, 'mg'], [250, 'mg'], [300, 'mg'], [400, 'mg'], [500, 'mg'], [750, 'mg'], [1000, 'mg']] },
    { id: 'ceftriaxone-im', drug: 'Ceftriaxone', route: 'IM', routeLabel: 'IM', cap: '#3b8fd9',
      freqs: ['q24h'], indic: 'bacterial infection',
      vials: [{ amt: 500, unit: 'mg', diluent: LIDO, dil: 1.8, conc: 250 }, { amt: 1000, unit: 'mg', diluent: LIDO, dil: 3.6, conc: 250 }],
      doses: [[125, 'mg'], [250, 'mg'], [500, 'mg']] },
    { id: 'ampicillin-im', drug: 'Ampicillin sodium', route: 'IM', routeLabel: 'IM', cap: '#d35400',
      freqs: ['q6h'], indic: 'bacterial infection',
      vials: [{ amt: 500, unit: 'mg', diluent: SWFI, dil: 1.8, conc: 250 }],
      doses: [[250, 'mg'], [375, 'mg'], [500, 'mg']] },
    { id: 'pantoprazole-iv', drug: 'Pantoprazole sodium', route: 'IV', routeLabel: 'IV push', cap: '#8e6bbf',
      freqs: ['daily', 'q12h'], indic: 'GI bleeding prophylaxis',
      vials: [{ amt: 40, unit: 'mg', diluent: NS, dil: 10, conc: 4 }],
      doses: [[20, 'mg'], [40, 'mg']] }
  ];

  /* ---- Insulin templates (U-100, 10 mL multiple-dose vial). Doses are in units. ---- */
  const U100 = [{ amt: 100, unit: 'units', vol: 1, total: 10, pack: MDV }];
  const RAPID = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 24, 28, 30, 34, 36, 42, 48].map(n => [n, 'units']);
  const BASAL = [10, 12, 15, 16, 18, 20, 22, 24, 26, 28, 30, 32, 36, 40, 44, 50, 56, 60, 64, 70, 80].map(n => [n, 'units']);
  MM.INSULINS = [
    { id: 'insulin-regular', drug: 'Insulin regular (human)', route: 'SQ', routeLabel: 'subcutaneous', insulin: true, cap: '#f5b041',
      freqs: ['before meals', 'AC & HS'], indic: 'sliding scale for glucose coverage', concs: U100, doses: RAPID },
    { id: 'insulin-lispro', drug: 'Insulin lispro', route: 'SQ', routeLabel: 'subcutaneous', insulin: true, cap: '#f5b041',
      freqs: ['with meals', 'before meals'], indic: 'mealtime coverage', concs: U100, doses: RAPID },
    { id: 'insulin-glargine', drug: 'Insulin glargine', route: 'SQ', routeLabel: 'subcutaneous', insulin: true, cap: '#f5b041',
      freqs: ['daily at bedtime', 'daily at 0900'], indic: 'basal insulin', concs: U100, doses: BASAL },
    { id: 'insulin-nph', drug: 'Insulin NPH (isophane)', route: 'SQ', routeLabel: 'subcutaneous', insulin: true, cap: '#f5b041',
      freqs: ['BID before breakfast & supper'], indic: 'type 2 diabetes', concs: U100, doses: BASAL }
  ];

  /* ---- Oral templates ----
   * strengths: products on hand. scored = visible score line; coat = 'none' | 'EC' (enteric-coated / delayed-release)
   * | 'ER' (extended-release). shape = 'round' | 'oval' | 'capsule'. doses: orders to practise. */
  MM.ORALS = [
    { id: 'metoprolol-tart', drug: 'Metoprolol tartrate', form: 'tablet', freqs: ['BID'], indic: 'hypertension',
      strengths: [{ amt: 50, unit: 'mg', shape: 'round', scored: true, coat: 'none', color: '#f4c7d8' }, { amt: 25, unit: 'mg', shape: 'round', scored: true, coat: 'none', color: '#f4c7d8' }],
      doses: [[25, 'mg'], [50, 'mg'], [75, 'mg'], [100, 'mg']] },
    { id: 'lisinopril', drug: 'Lisinopril', form: 'tablet', freqs: ['daily'], indic: 'hypertension',
      strengths: [{ amt: 5, unit: 'mg', shape: 'round', scored: false, coat: 'none', color: '#fbe3a1' }],
      doses: [[5, 'mg'], [10, 'mg'], [15, 'mg'], [20, 'mg'], [2.5, 'mg'], [7.5, 'mg']] },
    { id: 'furosemide-po', drug: 'Furosemide', form: 'tablet', freqs: ['daily', 'BID'], indic: 'edema',
      strengths: [{ amt: 40, unit: 'mg', shape: 'round', scored: true, coat: 'none', color: '#ffffff' }],
      doses: [[20, 'mg'], [40, 'mg'], [60, 'mg'], [80, 'mg']] },
    { id: 'warfarin', drug: 'Warfarin sodium', form: 'tablet', freqs: ['daily at 1700'], indic: 'atrial fibrillation',
      strengths: [{ amt: 5, unit: 'mg', shape: 'round', scored: true, coat: 'none', color: '#f7a8a0' }],
      doses: [[2.5, 'mg'], [5, 'mg'], [7.5, 'mg'], [10, 'mg']] },
    { id: 'prednisone', drug: 'Prednisone', form: 'tablet', freqs: ['daily with breakfast'], indic: 'COPD exacerbation',
      strengths: [{ amt: 20, unit: 'mg', shape: 'round', scored: true, coat: 'none', color: '#ffffff' }, { amt: 5, unit: 'mg', shape: 'round', scored: true, coat: 'none', color: '#ffffff' }],
      doses: [[10, 'mg'], [15, 'mg'], [20, 'mg'], [30, 'mg'], [40, 'mg']] },
    { id: 'lorazepam-po', drug: 'Lorazepam', form: 'tablet', sched: 'C-IV', freqs: ['q6h', 'q8h'], prn: ['anxiety'],
      strengths: [{ amt: 1, unit: 'mg', shape: 'round', scored: true, coat: 'none', color: '#ffffff' }],
      doses: [[0.5, 'mg'], [1, 'mg'], [1.5, 'mg'], [2, 'mg']] },
    { id: 'levothyroxine', drug: 'Levothyroxine sodium', form: 'tablet', freqs: ['daily before breakfast'], indic: 'hypothyroidism',
      strengths: [{ amt: 50, unit: 'mcg', shape: 'round', scored: true, coat: 'none', color: '#ffffff' }],
      doses: [[50, 'mcg'], [75, 'mcg'], [100, 'mcg'], [0.1, 'mg'], [0.075, 'mg'], [150, 'mcg']] },
    { id: 'digoxin', drug: 'Digoxin', form: 'tablet', freqs: ['daily'], indic: 'atrial fibrillation',
      strengths: [{ amt: 125, unit: 'mcg', shape: 'round', scored: true, coat: 'none', color: '#fdf3b0', label: '0.125 mg (125 mcg)' }],
      doses: [[0.125, 'mg'], [0.25, 'mg'], [125, 'mcg'], [250, 'mcg'], [0.0625, 'mg']] },
    { id: 'acetaminophen', drug: 'Acetaminophen', form: 'tablet', freqs: ['q6h', 'q4h'], prn: ['fever', 'mild pain (1–3/10)'],
      strengths: [{ amt: 325, unit: 'mg', shape: 'round', scored: false, coat: 'none', color: '#ffffff' }, { amt: 500, unit: 'mg', shape: 'oval', scored: false, coat: 'none', color: '#ffffff' }],
      doses: [[325, 'mg'], [500, 'mg'], [650, 'mg'], [975, 'mg'], [1, 'g'], [1000, 'mg']] },
    { id: 'ibuprofen', drug: 'Ibuprofen', form: 'tablet', freqs: ['q6h', 'q8h'], prn: ['pain', 'fever'],
      strengths: [{ amt: 200, unit: 'mg', shape: 'round', scored: false, coat: 'none', color: '#c9724a' }],
      doses: [[200, 'mg'], [400, 'mg'], [600, 'mg'], [800, 'mg'], [300, 'mg']] },
    { id: 'oxycodone-ir', drug: 'Oxycodone HCl (immediate release)', form: 'tablet', sched: 'C-II', freqs: ['q4h', 'q6h'], prn: ['severe pain (7–10/10)', 'moderate pain (4–6/10)'],
      strengths: [{ amt: 5, unit: 'mg', shape: 'round', scored: false, coat: 'none', color: '#d6ecfa' }],
      doses: [[5, 'mg'], [10, 'mg'], [15, 'mg'], [20, 'mg'], [2.5, 'mg']] },
    { id: 'aspirin-ec', drug: 'Aspirin enteric-coated', form: 'tablet', freqs: ['daily'], indic: 'cardiac prophylaxis',
      strengths: [{ amt: 81, unit: 'mg', shape: 'round', scored: false, coat: 'EC', color: '#f6b26b', label: '81 mg', name: 'Aspirin Delayed-Release (Enteric-Coated) Tablets' }],
      doses: [[81, 'mg'], [162, 'mg'], [243, 'mg'], [324, 'mg'], [40.5, 'mg']] },
    { id: 'pantoprazole', drug: 'Pantoprazole sodium', form: 'tablet', freqs: ['daily before breakfast'], indic: 'GERD',
      strengths: [{ amt: 40, unit: 'mg', shape: 'oval', scored: false, coat: 'EC', color: '#f2d36b', name: 'Pantoprazole Delayed-Release Tablets' }],
      doses: [[40, 'mg'], [80, 'mg'], [20, 'mg']] },
    { id: 'metformin-er', drug: 'Metformin ER', form: 'tablet', freqs: ['daily with supper'], indic: 'type 2 diabetes',
      strengths: [{ amt: 500, unit: 'mg', shape: 'oval', scored: false, coat: 'ER', color: '#ffffff', name: 'Metformin HCl Extended-Release Tablets' }],
      doses: [[500, 'mg'], [1000, 'mg'], [1500, 'mg'], [250, 'mg']] },
    { id: 'morphine-er', drug: 'Morphine sulfate ER', form: 'tablet', sched: 'C-II', freqs: ['q12h'], indic: 'chronic pain',
      strengths: [{ amt: 15, unit: 'mg', shape: 'round', scored: false, coat: 'ER', color: '#d9c3f0', name: 'Morphine Sulfate Extended-Release Tablets' }],
      doses: [[15, 'mg'], [30, 'mg'], [45, 'mg'], [7.5, 'mg']] },
    { id: 'kcl-er', drug: 'Potassium chloride ER', form: 'tablet', freqs: ['daily', 'BID'], indic: 'hypokalemia',
      strengths: [{ amt: 20, unit: 'mEq', shape: 'oval', scored: false, coat: 'ER', color: '#f4e1b8', name: 'Potassium Chloride Extended-Release Tablets' }],
      doses: [[20, 'mEq'], [40, 'mEq'], [10, 'mEq']] },
    { id: 'diltiazem-er', drug: 'Diltiazem ER', form: 'capsule', freqs: ['daily'], indic: 'atrial fibrillation',
      strengths: [{ amt: 120, unit: 'mg', shape: 'capsule', scored: false, coat: 'ER', color: '#8fbfe8', color2: '#f2f2f2', name: 'Diltiazem HCl Extended-Release Capsules' }],
      doses: [[120, 'mg'], [240, 'mg'], [60, 'mg']] },
    { id: 'amoxicillin', drug: 'Amoxicillin', form: 'capsule', freqs: ['q8h', 'q12h'], indic: 'sinusitis',
      strengths: [{ amt: 500, unit: 'mg', shape: 'capsule', scored: false, coat: 'none', color: '#e7778e', color2: '#f2f2f2' }],
      doses: [[500, 'mg'], [1000, 'mg'], [250, 'mg']] }
  ];

})(typeof globalThis !== 'undefined' ? globalThis : this);
