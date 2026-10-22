# Mimic Math

Front-end-only practice tool for first-semester nursing students: read the order, check the vial or bottle, calculate, **choose the syringe and needle, and draw up the dose** on a virtual syringe. Wrong answers show the correct setup and the dimensional analysis. Nothing is stored or sent anywhere.

- ~312 generated questions: injectables (IV/IM/SQ), two-part reconstitution of powder vials (ceftriaxone, ampicillin, pantoprazole: withdraw the diluent with a blunt fill needle, then draw up the ordered dose), U-100 insulin (30/50/100 unit syringes), and oral meds (scored, enteric-coated, extended-release, capsules, "hold and clarify" cases).
- No build step. Open `index.html` or serve the folder.

## Deploy on GitHub Pages
Repo **Settings → Pages → Source: GitHub Actions**, then push to `main`. The workflow validates the bank and publishes `index.html`, `css/`, `js/`.

## Adding drugs
Edit `js/data.js` (`INJECTABLES`, `INSULINS`, `RECONS`, `ORALS`). Doses that can't be measured on a real syringe are filtered out automatically. Then run `node tests/validate.js`. `node scripts/export-bank.js > bank.csv` lists every question.

## Rules encoded (js/engine.js)
Smallest Luer-Lock syringe that holds the volume (1/3/5/10 mL; exactly 3 mL also allows 5 mL, exactly 5 mL also allows 10 mL); insulin syringes for U-100 insulin only; SQ ≤1 mL: 1 mL Luer-Lock or TB with 25 G × ⅝"; IM: 21 G × 1"/1½" or 25 G × 1"; IV push: Luer-Lock, no needle. 18 G × 1½" is a distractor (draw-up needle). Review these against your program's policy.
