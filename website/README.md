# BioPod Marketing Website

A modern, static marketing and investor-teaser site for BioPod, tagline "Nature
Simplified". No build step and no dependencies: plain HTML, one CSS file, and a
little JavaScript. It runs anywhere that serves static files, including GitHub Pages.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Home: hero, problem, how it works, benefits, Inside the Pod, comparison, mission, FAQ teaser, waitlist |
| `how-it-works.html` | The three-step flow, the dissolving-shell mechanism, the 8 to 10 week cycle, a coverage table |
| `the-science.html` | Four nutrient pillars, a guaranteed-analysis panel, what it leaves out, soil-health explainer |
| `indoor-plants.html` | Education plus a houseplant feeding guide for the launch customer |
| `sustainability.html` | The environmental case with cited third-party data and a sources list |
| `portal.html` | Plant Care Portal: a client-side feeding tracker (see below) |
| `investors.html` | Public investor teaser: market, the gap, why now, the ask. No private figures |
| `faq.html` | Grouped customer FAQ |
| `about.html` | Founder story (Natasha Syed, Founder and CEO) and values |
| `contact.html` | Waitlist (`#waitlist`), general contact (`#general`), investor inquiry (`#investor`) |
| `privacy.html` | Plain-language privacy policy |
| `404.html` | Friendly not-found page |

## Assets
- `assets/css/styles.css`: the full design system (tokens, type scale, components). Retheme by editing the variables at the top.
- `assets/js/main.js`: nav, sticky header, FAQ accordion, scroll reveals, and the form handler.
- `assets/js/portal.js` and `sw.js`: the Plant Care Portal app and its service worker.
- `assets/img/favicon.svg`: placeholder brand monogram (replace with the real mark).
- `assets/photos/`: the seven canonical photo slots. See `assets/photos/README.md`.
- `assets/brand/`: drop the real logo files here. See `assets/brand/README.md`.

## Plant Care Portal
A feeding tracker that needs no login and no backend. Plants are saved in the
visitor's own browser via `localStorage`. Each plant shows a progress ring across
its 8 to 10 week cycle and a status (Active, Feed soon, Time to refeed). Reminders
are offered two ways: a downloadable calendar file (`.ics`) per plant, and optional
browser notifications (which only fire while the browser is open). A Phase 2 email
backend can be added later; see `PORTAL_BACKEND_SETUP.md` at the repo root.

## Preview locally
From this `website/` folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Things to confirm before launch
These are intentionally safe placeholders. The full checklist lives in
`COMPLIANCE_REVIEW.md` at the repo root.

1. Contact email: currently `hello@biopodllc.com` (in `contact.html` and `privacy.html`). Set the real address.
2. Forms open the visitor's own email app pre-filled (no backend). Set the real inbox in `CONTACT_EMAIL` in `assets/js/main.js` (currently `hello@biopodllc.com`).
3. Photos: replace the seven placeholders in `assets/photos/` with real prototype photography.
4. Product values: insert the registered N-P-K and the pods-per-pot quantities (shown as TODO).
5. Logo: drop real files into `assets/brand/` and swap the header wordmark.
6. Social links: Instagram and LinkedIn icons point to `#`.

## Design
Calm and editorial: cream page background, forest-green primary, terracotta only on
small eyebrow labels, soft green icon chips, a single-stroke line-icon set, and no
emoji. Headings use Fraunces, body uses Inter. The visual design is locked, so change
page content without restyling the global system.
